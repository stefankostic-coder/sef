from flask import Flask
from flask_cors import CORS
from config import settings
from db import db
from auth import bp as auth_bp
from users import bp_users
from invoices import bp_invoices   # <-- NEW

def create_app():
    app = Flask(__name__)
    app.config.from_object(settings)

    CORS(
       app,
    resources={r"/api/*": {"origins": [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]}},
    supports_credentials=True,
    )

    db.init_app(app)

    with app.app_context():
        db.create_all()

    app.register_blueprint(auth_bp)
    app.register_blueprint(bp_users)
    app.register_blueprint(bp_invoices)  

    @app.get("/health")
    def health():
        return {"ok": True}

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
