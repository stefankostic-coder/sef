from flask import Blueprint, request, jsonify
from db import db
from models import Product, Role
from utils.jwt import require_role

bp_products = Blueprint("products", __name__, url_prefix="/api/products")


@bp_products.get("")
@require_role(Role.COMPANY, Role.ADMIN)
def list_products():
    """
    Company: vraća SAMO svoje artikle.
    Admin: opciono ?owner_user_id=... , inače sve.
    """
    user = request.user
    owner_id = request.args.get("owner_user_id", type=int)

    if user.role == Role.COMPANY:
        q = Product.query.filter_by(owner_user_id=user.id).order_by(Product.id.desc()).all()
    else:
        if owner_id:
            q = Product.query.filter_by(owner_user_id=owner_id).order_by(Product.id.desc()).all()
        else:
            q = Product.query.order_by(Product.id.desc()).all()
    return jsonify({"items": [p.to_dict() for p in q]})


@bp_products.post("")
@require_role(Role.COMPANY, Role.ADMIN)
def create_product():
    """
    Kreira artikl. Company kreira za sebe; Admin može proslediti owner_user_id.
    Zahtev: { name, code, material_type?, owner_user_id? }
    """
    user = request.user
    data = request.get_json(force=True) or {}

    name = (data.get("name") or "").strip()
    code = (data.get("code") or "").strip()
    material_type = (data.get("material_type") or None)

    if not name or not code:
        return jsonify({"error": "name and code are required"}), 400

    owner_user_id = data.get("owner_user_id", None)
    if user.role == Role.COMPANY:
        owner_user_id = user.id  # company uvek za sebe
    else:
        # admin: ako nije dat, fallback na admina (mada nema smisla); bolje zahtevaj
        if not owner_user_id:
            return jsonify({"error": "owner_user_id is required for admin"}), 400

    # provera unikatnosti code po vlasniku je pokrivena UniqueConstraint-om
    p = Product(owner_user_id=owner_user_id, name=name, code=code, material_type=material_type)
    db.session.add(p)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create product: {e}"}), 400

    return jsonify({"product": p.to_dict()}), 201


@bp_products.delete("/<int:pid>")
@require_role(Role.COMPANY, Role.ADMIN)
def delete_product(pid: int):
    """
    Company: sme da obriše samo svoje artikle.
    Admin: može bilo koji.
    """
    user = request.user
    p = db.session.get(Product, pid)
    if not p:
        return jsonify({"error": "Not found"}), 404

    if user.role == Role.COMPANY and p.owner_user_id != user.id:
        return jsonify({"error": "Forbidden"}), 403

    db.session.delete(p)
    db.session.commit()
    return jsonify({"success": True})
