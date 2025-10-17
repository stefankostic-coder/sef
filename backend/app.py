from flask import Flask, Response
from flask_cors import CORS
from config import settings
from db import db
from auth import bp as auth_bp
from users import bp_users
from invoices import bp_invoices
from products import bp_products
from openapi_spec import get_openapi_spec
import json

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
    app.register_blueprint(bp_products)

    @app.get("/health")
    def health():
        return {"ok": True}

    # === OpenAPI JSON ===
    @app.get("/api/openapi.json")
    def openapi_json():
        spec = get_openapi_spec()
        return Response(json.dumps(spec), mimetype="application/json")

    # === Swagger UI preko CDN-a ===
    @app.get("/docs")
    def swagger_ui():
        html = """
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>SEF e-Fakture – API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
    <style>body{margin:0}#swagger-ui{max-width:1200px;margin:0 auto}</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/api/openapi.json',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout'
        });
      };
    </script>
  </body>
</html>
        """
        return Response(html, mimetype="text/html")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
