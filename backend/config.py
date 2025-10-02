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
settings = Settings()