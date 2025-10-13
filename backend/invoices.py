import re
from datetime import date
from flask import Blueprint, request, jsonify, send_file
from db import db
from models import User, Role, Invoice, InvoiceStatus, InvoiceItem, Product, ALLOWED_TAX_RATES
from utils.jwt import require_role
from utils.pdf import render_invoice_pdf
from utils.emailer import send_invoice_email
from io import BytesIO

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


def _parse_items(items_raw, issuer_user_id: int):
    """
    Očekujemo listu objekata:
      { product_id, qty, unit_price, tax_rate }   # tax_rate u %, 0/10/20
    Validira da proizvod pripada izdavaocu i vraća listu dict-ova sa:
      { product, qty, unit_price, tax_rate }
    """
    errors = []
    items_data = []
    if items_raw is None:
        items_raw = []
    if not isinstance(items_raw, list) or len(items_raw) == 0:
        errors.append("at least one item is required")
        return None, errors

    for idx, it in enumerate(items_raw, start=1):
        try:
            product_id = int(it.get("product_id"))
        except Exception:
            errors.append(f"item #{idx}: product_id is required and must be integer")
            continue

        prod = db.session.get(Product, product_id) if product_id else None
        if not prod:
            errors.append(f"item #{idx}: product not found")
            continue
        if prod.owner_user_id != issuer_user_id:
            errors.append(f"item #{idx}: product does not belong to issuer")

        try:
            qty = float(it.get("qty", 0))
            unit_price = float(it.get("unit_price", 0))
            tax_rate = int(it.get("tax_rate", 0))
        except Exception:
            errors.append(f"item #{idx}: invalid numeric fields")
            continue

        if qty <= 0:
            errors.append(f"item #{idx}: qty must be > 0")
        if unit_price < 0:
            errors.append(f"item #{idx}: unit_price must be >= 0")
        if tax_rate not in ALLOWED_TAX_RATES:
            errors.append(f"item #{idx}: tax_rate must be one of {ALLOWED_TAX_RATES}")

        items_data.append({
            "product": prod,
            "qty": qty,
            "unit_price": unit_price,
            "tax_rate": tax_rate,
        })

    if errors:
        return None, errors
    return items_data, None


def _validate_invoice_payload(data, current_user: User, creating: bool = True):
    errors = []

    number = (data.get("number") or "").strip()
    issue_date = _parse_date(data.get("issue_date"))
    due_date = _parse_date(data.get("due_date"))
    currency = (data.get("currency") or "RSD").upper()
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
    if status not in ALLOWED_STATUS:
        errors.append(f"status must be one of {sorted(ALLOWED_STATUS)}")
    if current_user.role == Role.COMPANY and status not in {InvoiceStatus.DRAFT.value, InvoiceStatus.SENT.value}:
        errors.append("company can set status only to 'draft' or 'sent'")

    # Stavke
    items_data, items_err = _parse_items(data.get("items"), issuer_user_id=current_user.id)
    if items_err:
        errors.extend(items_err)

    if errors:
        return None, errors

    return {
        "number": number,
        "issue_date": issue_date,
        "due_date": due_date,
        "currency": currency,
        "recipient_pib": recipient_pib,
        "status": InvoiceStatus(status),
        "items_data": items_data,
        "note": (data.get("note") or "").strip() or None,
    }, None


# --------- Create ---------
@bp_invoices.post("")
@require_role(Role.COMPANY, Role.ADMIN)
def create_invoice():
    user = request.user
    data = request.get_json(force=True) or {}

    if user.role == Role.COMPANY and not user.pib:
        return jsonify({"error": "Your account doesn't have a PIB set"}), 400

    payload, errors = _validate_invoice_payload(data, user, creating=True)
    if errors:
        return jsonify({"error": ", ".join(errors)}), 400

    inv = Invoice(
        issuer_user_id=user.id,
        issuer_pib=user.pib if user.role == Role.COMPANY else (data.get("issuer_pib") or user.pib or ""),
        number=payload["number"],
        issue_date=payload["issue_date"],
        due_date=payload["due_date"],
        currency=payload["currency"],
        recipient_pib=payload["recipient_pib"],
        status=payload["status"],
        note=payload["note"],
    )
    if not inv.issuer_pib or not PIB_RE.match(inv.issuer_pib):
        return jsonify({"error": "issuer PIB is missing or invalid"}), 400

    # Kreiraj stavke sa snapshot-om iz Product-a
    for it in payload["items_data"]:
        prod = it["product"]
        inv.items.append(InvoiceItem(
            product_id=prod.id,
            name=prod.name,
            code=prod.code,
            material_type=prod.material_type,
            qty=it["qty"],
            unit_price=it["unit_price"],
            tax_rate=it["tax_rate"],
        ))

    inv.compute_totals()

    db.session.add(inv)
    db.session.commit()
    return jsonify({"invoice": inv.to_dict()}), 201


# --------- List ---------
@bp_invoices.get("")
@require_role(Role.COMPANY, Role.ADMIN)
def list_invoices():
    user = request.user
    if user.role == Role.ADMIN:
        q = Invoice.query.order_by(Invoice.id.desc()).all()
        return jsonify({"items": [i.to_dict() for i in q]})

    outbound = Invoice.query.filter(Invoice.issuer_user_id == user.id).order_by(Invoice.id.desc()).all()
    inbound = []
    if user.pib:
        inbound = Invoice.query.filter(Invoice.recipient_pib == user.pib).order_by(Invoice.id.desc()).all()

    return jsonify({
        "outbound": [i.to_dict() for i in outbound],
        "inbound": [i.to_dict() for i in inbound],
    })


# --------- Get by ID ---------
@bp_invoices.get("/<int:iid>")
@require_role(Role.COMPANY, Role.ADMIN)
def get_invoice(iid: int):
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
    user = request.user
    inv = db.session.get(Invoice, iid)
    if not inv:
        return jsonify({"error": "Not found"}), 404
    if user.role == Role.COMPANY and inv.issuer_user_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    db.session.delete(inv)
    db.session.commit()
    return jsonify({"success": True})

# --------- Update status ---------
@bp_invoices.patch("/<int:iid>/status")
@require_role(Role.COMPANY, Role.ADMIN)
def update_invoice_status(iid: int):
    """
    - Admin: može da menja status bilo koje fakture.
    - Company: može da menja SAMO svoje (gde je issuer_user_id == user.id).
    Dozvoljene vrednosti: draft, sent, paid, cancelled.
    """
    user = request.user
    inv = db.session.get(Invoice, iid)
    if not inv:
        return jsonify({"error": "Not found"}), 404

    if user.role == Role.COMPANY and inv.issuer_user_id != user.id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(force=True) or {}
    new_status = (data.get("status") or "").strip().lower()

    if new_status not in ALLOWED_STATUS:
        return jsonify({"error": f"status must be one of {sorted(ALLOWED_STATUS)}"}), 400

    inv.status = InvoiceStatus(new_status)
    db.session.commit()
    return jsonify({"invoice": inv.to_dict()})


# --------- PDF ---------
@bp_invoices.get("/<int:iid>/pdf")
@require_role(Role.COMPANY, Role.ADMIN)
def invoice_pdf(iid: int):
    user = request.user
    inv = db.session.get(Invoice, iid)
    if not inv:
        return jsonify({"error": "Not found"}), 404
    if user.role == Role.COMPANY and inv.issuer_user_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    pdf_bytes = render_invoice_pdf(inv.to_dict())
    return send_file(BytesIO(pdf_bytes), mimetype="application/pdf", as_attachment=True, download_name=f"invoice-{inv.number}.pdf")


# --------- Slanje email-om ---------
@bp_invoices.post("/<int:iid>/send-email")
@require_role(Role.COMPANY, Role.ADMIN)
def invoice_send_email(iid: int):
    user = request.user
    inv = db.session.get(Invoice, iid)
    if not inv:
        return jsonify({"error": "Not found"}), 404
    if user.role == Role.COMPANY and inv.issuer_user_id != user.id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    to_email = (data.get("email") or "").strip().lower()
    if not to_email:
        recipient_user = User.query.filter_by(pib=inv.recipient_pib).first()
        if recipient_user and recipient_user.email:
            to_email = recipient_user.email
    if not to_email:
        return jsonify({"error": "Recipient email is required or a user with that PIB must exist."}), 400

    # PDF (opciono: dodaj logo_path ako imaš fajl)
    pdf_bytes = render_invoice_pdf(inv.to_dict())

    # javni URL ka pdf-u (za dugme "Preuzmi PDF" u mejlu)
    download_url = f"{request.url_root.rstrip('/')}/api/invoices/{iid}/pdf"

    try:
        send_invoice_email(
            to_email=to_email,
            inv=inv.to_dict(),
            pdf_bytes=pdf_bytes,
            pdf_filename=f"invoice-{inv.number}.pdf",
            download_url=download_url,
        )
    except Exception as e:
        return jsonify({"error": f"Email send failed: {e}"}), 500

    return jsonify({"success": True})
