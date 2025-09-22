import re
from datetime import date
from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from db import db
from models import User, Role, Invoice, InvoiceStatus
from utils.jwt import require_role

bp_invoices = Blueprint("invoices", __name__, url_prefix="/api/invoices")

PIB_RE = re.compile(r"^\d{9}$")
ALLOWED_CURRENCIES = {"RSD", "EUR", "USD"}
ALLOWED_STATUS = {s.value for s in InvoiceStatus}

def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except Exception:
        return None

def _validate_invoice_payload(data, current_user: User, creating: bool = True):
    """
    Minimalna validacija ulaza.
    - issuer_pib se ne prima iz tela pri kreiranju: uzima se iz current_user.pib
    - recipient_pib obavezan (9 cifara)
    - number, issue_date, total_amount obavezni
    - currency iz ALLOWED_CURRENCIES
    - status iz ALLOWED_STATUS (samo admin može da postavlja izvan 'draft'/'sent'?)
    """
    errors = []

    number = (data.get("number") or "").strip()
    issue_date = _parse_date(data.get("issue_date"))
    due_date = _parse_date(data.get("due_date"))
    currency = (data.get("currency") or "RSD").upper()
    total_amount = data.get("total_amount", 0)
    recipient_pib = (data.get("recipient_pib") or "").strip()
    status = (data.get("status") or InvoiceStatus.DRAFT.value).strip().lower()

    if not number:
        errors.append("number is required")
    if not issue_date:
        errors.append("issue_date must be ISO date (YYYY-MM-DD)")
    if not recipient_pib or not PIB_RE.match(recipient_pib):
        errors.append("recipient_pib must be 9 digits")
    if currency not in ALLOWED_CURRENCIES:
        errors.append(f"currency must be one of {sorted(ALLOWED_CURRENCIES)}")
    try:
        total_amount = float(total_amount)
        if total_amount < 0:
            errors.append("total_amount must be >= 0")
    except Exception:
        errors.append("total_amount must be a number")

    if status not in ALLOWED_STATUS:
        errors.append(f"status must be one of {sorted(ALLOWED_STATUS)}")
    if current_user.role == Role.COMPANY and status not in {InvoiceStatus.DRAFT.value, InvoiceStatus.SENT.value}:
        errors.append("company can set status only to 'draft' or 'sent'")

    if errors:
        return None, errors

    return {
        "number": number,
        "issue_date": issue_date,
        "due_date": due_date,
        "currency": currency,
        "total_amount": total_amount,
        "recipient_pib": recipient_pib,
        "status": InvoiceStatus(status),
        "items": data.get("items") or [],
        "note": (data.get("note") or "").strip() or None,
    }, None

# --------- Create ---------
@bp_invoices.post("")
@require_role(Role.COMPANY, Role.ADMIN)
def create_invoice():
    """
    Company kreira fakturu za sebe:
    - issuer_user_id = request.user.id
    - issuer_pib = request.user.pib (mora postojati)
    Admin takođe može kreirati (npr. u ime nekog), ali ovde zadržavamo logiku da je izdavalac uvek onaj koji zove endpoint.
    """
    user = request.user
    data = request.get_json(force=True) or {}

    if user.role == Role.COMPANY and not user.pib:
        return jsonify({"error": "Your account doesn't have a PIB set"}), 400

    payload, errors = _validate_invoice_payload(data, user, creating=True)
    if errors:
        return jsonify({"error": ", ".join(errors)}), 400

    inv = Invoice(
        issuer_user_id=user.id,
        issuer_pib=user.pib if user.role == Role.COMPANY else (data.get("issuer_pib") or user.pib or ""),  # fallback
        **payload,
    )

    if not inv.issuer_pib or not PIB_RE.match(inv.issuer_pib):
        return jsonify({"error": "issuer PIB is missing or invalid"}), 400

    db.session.add(inv)
    db.session.commit()
    return jsonify({"invoice": inv.to_dict()}), 201

# --------- List ---------
@bp_invoices.get("")
@require_role(Role.COMPANY, Role.ADMIN)
def list_invoices():
    """
    - Admin: vrati sve u jednoj listi 'items'
    - Company: vrati dve liste:
        outbound: fakture koje je on izdao
        inbound: fakture gde je on komitent (recipient_pib == user.pib), a može da uključi i one gde je sam izdao (ali ih već imamo u outbound)
    """
    user = request.user

    if user.role == Role.ADMIN:
        q = Invoice.query.order_by(Invoice.id.desc()).all()
        return jsonify({"items": [i.to_dict() for i in q]})

    # company
    outbound = Invoice.query.filter(Invoice.issuer_user_id == user.id) \
        .order_by(Invoice.id.desc()).all()

    inbound = []
    if user.pib:
        inbound = Invoice.query.filter(
            Invoice.recipient_pib == user.pib
        ).order_by(Invoice.id.desc()).all()

    return jsonify({
        "outbound": [i.to_dict() for i in outbound],
        "inbound": [i.to_dict() for i in inbound],
    })

# --------- Get by ID ---------
@bp_invoices.get("/<int:iid>")
@require_role(Role.COMPANY, Role.ADMIN)
def get_invoice(iid: int):
    """
    - Admin: može da vidi bilo koju
    - Company: može da vidi SAMO svoju (izdatu od strane njega)
    """
    user = request.user
    inv = db.session.get(Invoice, iid)
    if not inv:
        return jsonify({"error": "Not found"}), 404

    if user.role == Role.COMPANY and inv.issuer_user_id != user.id:
        return jsonify({"error": "Forbidden"}), 403

    return jsonify({"invoice": inv.to_dict()})

# --------- Delete ---------
@bp_invoices.delete("/<int:iid>")
@require_role(Role.COMPANY, Role.ADMIN)
def delete_invoice(iid: int):
    """
    - Company: sme da obriše samo fakture koje je on kreirao.
    - Admin: može bilo koju.
    """
    user = request.user
    inv = db.session.get(Invoice, iid)
    if not inv:
        return jsonify({"error": "Not found"}), 404

    if user.role == Role.COMPANY and inv.issuer_user_id != user.id:
        return jsonify({"error": "Forbidden"}), 403

    db.session.delete(inv)
    db.session.commit()
    return jsonify({"success": True})
