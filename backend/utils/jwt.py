import time
import jwt
from functools import wraps
from flask import request, jsonify
from config import settings
from db import db
from models import User, Role

ALG = "HS256"

def sign_jwt(payload: dict) -> str:
    now = int(time.time())
    body = {
        **payload,
        "iat": now,
        "exp": now + settings.JWT_EXPIRES_IN,
    }
    return jwt.encode(body, settings.SECRET_KEY, algorithm=ALG)

def verify_jwt(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALG])
    except Exception:
        return None

def set_auth_cookie(resp, token: str):
    resp.set_cookie(
        settings.JWT_COOKIE_NAME,
        token,
        max_age=settings.JWT_EXPIRES_IN,
        httponly=True,
        secure=False,  
        samesite="Lax",
        path="/",
    )
    return resp

def clear_auth_cookie(resp):
    resp.delete_cookie(settings.JWT_COOKIE_NAME, path="/")
    return resp

def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = request.cookies.get(settings.JWT_COOKIE_NAME)
        data = verify_jwt(token) if token else None
        if not data:
            return jsonify({"error": "Unauthorized"}), 401
        user = db.session.get(User, data.get("uid"))
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        request.user = user
        return fn(*args, **kwargs)
    return wrapper

def require_role(*roles: Role):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            token = request.cookies.get(settings.JWT_COOKIE_NAME)
            data = verify_jwt(token) if token else None
            if not data:
                return jsonify({"error": "Unauthorized"}), 401
            user = db.session.get(User, data.get("uid"))
            if not user or user.role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            request.user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator
