import re
from flask import Blueprint, request, jsonify
from db import db
from models import User, Role
from utils.jwt import sign_jwt, set_auth_cookie, clear_auth_cookie, require_auth

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

PIB_RE = re.compile(r"^\d{9}$")

@bp.post("/register")
def register():
    data = request.get_json(force=True)
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or Role.COMPANY.value).strip()
    pib = (data.get("pib") or None)

    if not name or not email or not password:
        return jsonify({"error": "name, email, password are required"}), 400

    if role not in (Role.COMPANY.value, Role.ADMIN.value):
        return jsonify({"error": "invalid role"}), 400

    if role == Role.COMPANY and not (pib and PIB_RE.match(str(pib))):
        return jsonify({"error": "PIB (9 digits) required for company"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already in use"}), 409

    user = User(name=name, email=email, role=Role(role), pib=str(pib) if pib else None)
    user.set_password(password)
    # company users start unverified; admins are verified by default
    user.verified = user.role == Role.ADMIN

    db.session.add(user)
    db.session.commit()

    token = sign_jwt({"uid": user.id, "role": user.role.value})
    resp = jsonify({"user": user.to_dict()})
    return set_auth_cookie(resp, token), 201

@bp.post("/login")
def login():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = sign_jwt({"uid": user.id, "role": user.role.value})
    resp = jsonify({"user": user.to_dict()})
    return set_auth_cookie(resp, token)

@bp.post("/logout")
@require_auth
def logout():
    resp = jsonify({"success": True})
    return clear_auth_cookie(resp)

@bp.get("/me")
@require_auth
def me():
    return jsonify({"user": request.user.to_dict()})