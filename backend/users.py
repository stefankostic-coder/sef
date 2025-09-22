from flask import Blueprint, request, jsonify
from db import db
from models import User, Role
from utils.jwt import require_role

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
