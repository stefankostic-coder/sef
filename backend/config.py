import os
from datetime import timedelta

class Settings:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///app.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_COOKIE_NAME = os.getenv("JWT_COOKIE_NAME", "eg_token")
    JWT_EXPIRES_IN = int(os.getenv("JWT_EXPIRES_IN", 60 * 60 * 24 * 7)) # seconds
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173")

    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM = os.getenv("RESEND_FROM", "Fakture <stefankosticsef@gmail.com>")
    RESEND_REPLY_TO = os.getenv("RESEND_REPLY_TO", "")

    MAIL_BACKEND = os.getenv("MAIL_BACKEND", "resend")
    SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
    SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@example.com")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "false").lower() == "true"
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASS = os.getenv("SMTP_PASS", "")
    SITE_NAME = os.getenv("SITE_NAME", "SEF e-Fakture")
settings = Settings()