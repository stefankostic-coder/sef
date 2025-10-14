from flask import Blueprint, request, jsonify
from invoices import PIB_RE
from db import db
from models import User, Role
from utils.jwt import require_auth, require_role

bp_users = Blueprint("users", __name__, url_prefix="/api/users")

@bp_users.get("")
@require_role(Role.ADMIN)
def list_users():
    q = User.query.order_by(User.id.desc()).all()
    return jsonify({"items": [u.to_dict() for u in q]})

@bp_users.patch("/<int:uid>/verify")
@require_role(Role.ADMIN)
def verify_user(uid: int):
    data = request.get_json(silent=True) or {}
    value = bool(data.get("verified", True))
    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": "Not found"}), 404
    if user.role != Role.COMPANY:
        return jsonify({"error": "Only company users can be verified"}), 400
    user.verified = value
    db.session.commit()
    return jsonify({"user": user.to_dict()})

@bp_users.get("/me")
@require_auth
def get_me():
    """Vrati profil ulogovanog korisnika."""
    return jsonify({"user": request.user.to_dict()})

@bp_users.patch("/me")
@require_auth
def update_me():
    """
    Ažuriranje sopstvenog profila.
    Dozvoljena polja:
      - name (svi)
      - pib (samo za company; mora 9 cifara)
      - change_password: { current_password, new_password } (opciono)
    """
    u: User = request.user
    data = request.get_json(silent=True) or {}

    # 1) name
    name = (data.get("name") or "").strip()
    if name:
        u.name = name

    # 2) pib (samo company)
    if u.role == Role.COMPANY and "pib" in data:
        pib = (str(data.get("pib") or "").strip())
        if pib and not PIB_RE.match(pib):
            return jsonify({"error": "PIB mora imati tačno 9 cifara"}), 400
        u.pib = pib or None  # dozvolimo i brisanje (None)

    # 3) promena lozinke
    cp = data.get("change_password") or {}
    current_password = cp.get("current_password") or ""
    new_password = cp.get("new_password") or ""
    if current_password or new_password:
        if not (current_password and new_password):
            return jsonify({"error": "Za promenu lozinke potrebna su i stara i nova lozinka"}), 400
        if not u.check_password(current_password):
            return jsonify({"error": "Trenutna lozinka nije ispravna"}), 400
        if len(new_password) < 6:
            return jsonify({"error": "Nova lozinka mora imati bar 6 karaktera"}), 400
        u.set_password(new_password)

    db.session.commit()
    return jsonify({"user": u.to_dict()})
