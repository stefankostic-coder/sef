from datetime import datetime
from enum import Enum
from decimal import Decimal, ROUND_HALF_UP
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Enum as SAEnum, Index, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
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


ALLOWED_TAX_RATES = (0, 10, 20)


# ---------- Product (artikli) ----------
class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)

    # vlasnik artikla (company user)
    owner_user_id = db.Column(db.Integer, ForeignKey("users.id"), nullable=False, index=True)

    name = db.Column(db.String(255), nullable=False)    
    code = db.Column(db.String(64), nullable=False)      
    material_type = db.Column(db.String(64), nullable=True)  

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User")
    items = relationship("InvoiceItem", back_populates="product")

    __table_args__ = (
        UniqueConstraint("owner_user_id", "code", name="uq_products_owner_code"),
        Index("ix_products_owner", "owner_user_id"),
        Index("ix_products_code", "code"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "owner_user_id": self.owner_user_id,
            "name": self.name,
            "code": self.code,
            "material_type": self.material_type,
            "created_at": self.created_at.isoformat() + "Z",
        }


class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)

    issuer_user_id = db.Column(db.Integer, ForeignKey("users.id"), nullable=False, index=True)
    issuer_pib = db.Column(db.String(9), nullable=False, index=True)
    recipient_pib = db.Column(db.String(9), nullable=False, index=True)

    number = db.Column(db.String(64), nullable=False, index=True)
    issue_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=True)
    currency = db.Column(db.String(3), nullable=False, default="RSD")

    # ukupno iz stavki
    total_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    status = db.Column(SAEnum(InvoiceStatus), nullable=False, default=InvoiceStatus.DRAFT)
    note = db.Column(db.String(1024), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    items = relationship(
        "InvoiceItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        lazy="joined",
    )

    __table_args__ = (
        Index("ix_invoices_number_unique_like", "number"),
    )

    def compute_totals(self):
        total = Decimal("0.00")
        for it in self.items or []:
            total += it.line_total_with_tax
        self.total_amount = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

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
            "items": [it.to_dict() for it in (self.items or [])],
            "note": self.note,
            "created_at": self.created_at.isoformat() + "Z",
            "updated_at": self.updated_at.isoformat() + "Z",
        }


class InvoiceItem(db.Model):
    __tablename__ = "invoice_items"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)

    # veza na Product
    product_id = db.Column(db.Integer, ForeignKey("products.id"), nullable=False, index=True)

    # snapshot polja iz Product-a
    name = db.Column(db.String(255), nullable=False)
    code = db.Column(db.String(64), nullable=True)
    material_type = db.Column(db.String(64), nullable=True)

    qty = db.Column(db.Numeric(12, 2), nullable=False, default=1)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)  # bez PDV
    tax_rate = db.Column(db.Integer, nullable=False, default=0)           # 0, 10, 20

    invoice = relationship("Invoice", back_populates="items")
    product = relationship("Product", back_populates="items")

    @property
    def unit_price_with_tax(self):
        from decimal import Decimal
        return (Decimal(self.unit_price) * (Decimal(1) + Decimal(self.tax_rate or 0) / Decimal(100))).quantize(Decimal("0.01"))

    @property
    def line_total(self):
        from decimal import Decimal
        return (Decimal(self.qty) * Decimal(self.unit_price)).quantize(Decimal("0.01"))

    @property
    def line_total_with_tax(self):
        from decimal import Decimal
        return (Decimal(self.qty) * self.unit_price_with_tax).quantize(Decimal("0.01"))

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "product_id": self.product_id,
            "name": self.name,
            "code": self.code,
            "material_type": self.material_type,
            "qty": float(self.qty),
            "unit_price": float(self.unit_price),
            "tax_rate": int(self.tax_rate),
            "unit_price_with_tax": float(self.unit_price_with_tax),
            "line_total": float(self.line_total),
            "line_total_with_tax": float(self.line_total_with_tax),
        }
