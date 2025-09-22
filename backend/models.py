from datetime import datetime
from enum import Enum
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Enum as SAEnum, Index, ForeignKey
from db import db

class Role(str, Enum):
    COMPANY = "company"
    ADMIN = "admin"

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    pib = db.Column(db.String(9), nullable=True)  
    role = db.Column(SAEnum(Role), nullable=False, default=Role.COMPANY)
    verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_users_pib_notnull", "pib"),
    )

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "pib": self.pib,
            "role": self.role.value,
            "verified": self.verified,
            "created_at": self.created_at.isoformat() + "Z",
        }
    
class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    CANCELLED = "cancelled"
    PAID = "paid"

class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)

    # Ko je izdao (ulogovana company)
    issuer_user_id = db.Column(db.Integer, ForeignKey("users.id"), nullable=False, index=True)
    issuer_pib = db.Column(db.String(9), nullable=False, index=True)   # PIB izdavaoca (iz user.pib)

    # Komitent (prima fakturu)
    recipient_pib = db.Column(db.String(9), nullable=False, index=True)

    # Osnovna polja fakture
    number = db.Column(db.String(64), nullable=False, index=True)      # broj fakture
    issue_date = db.Column(db.Date, nullable=False)                    # datum izdavanja
    due_date = db.Column(db.Date, nullable=True)                       # rok plaćanja
    currency = db.Column(db.String(3), nullable=False, default="RSD")  # RSD/EUR/USD
    total_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    status = db.Column(SAEnum(InvoiceStatus), nullable=False, default=InvoiceStatus.DRAFT)

    # Stavke (opciono, jednostavno JSON polje)
    items = db.Column(db.JSON, nullable=True)  # lista stavki: [{name, qty, price, taxRate}, ...]

    note = db.Column(db.String(1024), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_invoices_number_unique_like", "number"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "issuer_user_id": self.issuer_user_id,
            "issuer_pib": self.issuer_pib,
            "recipient_pib": self.recipient_pib,
            "number": self.number,
            "issue_date": self.issue_date.isoformat(),
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "currency": self.currency,
            "total_amount": float(self.total_amount) if self.total_amount is not None else 0.0,
            "status": self.status.value,
            "items": self.items or [],
            "note": self.note,
            "created_at": self.created_at.isoformat() + "Z",
            "updated_at": self.updated_at.isoformat() + "Z",
        }
