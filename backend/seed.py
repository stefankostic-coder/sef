"""
Seed podaci za razvoj:
- 1 admin
- 3 company korisnika (sa PIB)
- artikli (Product) za svaku kompaniju
- nekoliko faktura između kompanija sa stavkama koje referenciraju artikle

Pokretanje:
    python seed.py
"""

from datetime import date, timedelta
from itertools import cycle

from app import create_app
from db import db
from models import User, Role, Invoice, InvoiceStatus, InvoiceItem, Product

app = create_app()


def get_or_create_user(
    email: str,
    *,
    name: str,
    role: Role,
    pib: str | None = None,
    verified: bool = False,
    password: str = "password",
):
    u = User.query.filter_by(email=email).first()
    if u:
        u.name = name
        u.role = role
        u.pib = pib
        u.verified = verified
        return u, False
    u = User(name=name, email=email, role=role, pib=pib, verified=verified)
    u.set_password(password)
    db.session.add(u)
    return u, True


def get_or_create_product(owner_user_id: int, code: str, *, name: str, material_type: str | None = None):
    p = Product.query.filter_by(owner_user_id=owner_user_id, code=code).first()
    if p:
        p.name = name
        p.material_type = material_type
        return p, False
    p = Product(owner_user_id=owner_user_id, code=code, name=name, material_type=material_type)
    db.session.add(p)
    return p, True


def get_or_create_invoice(number: str, **kwargs):
    """
    Kreira ili vraća postojeću fakturu (stavke popunjavamo posebno).
    """
    inv = Invoice.query.filter_by(number=number).first()
    base_kwargs = {k: v for k, v in kwargs.items() if k != "items_payload"}
    if inv:
        for k, v in base_kwargs.items():
            setattr(inv, k, v)
        return inv, False
    inv = Invoice(number=number, **base_kwargs)
    db.session.add(inv)
    return inv, True


def run():
    with app.app_context():
        db.create_all()

        # 1) Admin
        admin, _ = get_or_create_user(
            "admin@sef.local",
            name="System Admin",
            role=Role.ADMIN,
            pib=None,
            verified=True,
            password="admin123",
        )

        # 2) Companies
        companies_seed = [
            {"email": "alpha@company.local", "name": "Alpha d.o.o.", "pib": "100000001", "verified": True,  "password": "alpha123"},
            {"email": "beta@company.local",  "name": "Beta d.o.o.",  "pib": "100000002", "verified": True,  "password": "beta123"},
            {"email": "gamma@company.local", "name": "Gamma d.o.o.", "pib": "100000003", "verified": False, "password": "gamma123"},
        ]

        companies = []
        for c in companies_seed:
            user, _ = get_or_create_user(
                c["email"],
                name=c["name"],
                role=Role.COMPANY,
                pib=c["pib"],
                verified=c["verified"],
                password=c["password"],
            )
            companies.append(user)

        db.session.commit()  # imamo ID-ove korisnika

        # 3) Artikli (po 3 po kompaniji)
        created_products = 0
        for comp in companies:
            prods_payload = [
                ("USL-001", "Usluga", "usluga"),
                ("MAT-002", "Materijal", "materijal"),
                ("TRN-003", "Transport", "transport"),
            ]
            for code, name, material in prods_payload:
                _, created = get_or_create_product(
                    owner_user_id=comp.id,
                    code=code,
                    name=name,
                    material_type=material,
                )
                if created:
                    created_products += 1

        db.session.commit()

        # mapiranje: (owner_id, code) -> Product
        prod_map = {}
        for p in Product.query.all():
            prod_map[(p.owner_user_id, p.code)] = p

        # 4) Fakture: svaka firma izdaje 3 fakture sledećoj firmi
        today = date.today()
        status_cycle = cycle([InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.PAID])

        created_count = 0
        updated_count = 0

        for idx, issuer in enumerate(companies, start=1):
            if not issuer.pib:
                continue

            recipient = companies[(idx) % len(companies)]
            if not recipient.pib or recipient.id == issuer.id:
                recipient = companies[(idx + 1) % len(companies)]

            for n in range(1, 4):
                number = f"{issuer.pib}-INV-{today.year}-{n:03d}"
                status = next(status_cycle)
                issue = today - timedelta(days=(n * 3))
                due = issue + timedelta(days=14)

                inv_payload = dict(
                    issuer_user_id=issuer.id,
                    issuer_pib=issuer.pib,
                    recipient_pib=recipient.pib,
                    issue_date=issue,
                    due_date=due,
                    currency="RSD",
                    status=status,
                    note=f"Seed faktura {n} za {issuer.name}",
                )

                inv, created = get_or_create_invoice(number, **inv_payload)

                # (Re)kreiraj stavke – koristimo artikle izdavaoca
                inv.items.clear()

                # kombinujemo različite artikle
                items_payload = [
                    {"code": "USL-001", "qty": 1, "unit_price": 1000.00, "tax_rate": 0},
                    {"code": "MAT-002", "qty": 2, "unit_price": 250.00,  "tax_rate": 20},
                    {"code": "TRN-003", "qty": 1, "unit_price": 500.00,  "tax_rate": 10},
                ]

                for it in items_payload:
                    prod = prod_map.get((issuer.id, it["code"]))
                    if not prod:
                        # fallback ako nije nađen (ne bi trebalo da se desi)
                        continue
                    inv.items.append(
                        InvoiceItem(
                            product_id=prod.id,
                            name=prod.name,
                            code=prod.code,
                            material_type=prod.material_type,
                            qty=it["qty"],
                            unit_price=it["unit_price"],
                            tax_rate=it["tax_rate"],
                        )
                    )

                inv.compute_totals()

                if created:
                    created_count += 1
                else:
                    updated_count += 1

        db.session.commit()

        print("== SEED COMPLETED ==")
        print(f"Admin: {admin.email}")
        print("Companies:")
        for c in companies:
            print(f" - {c.name} ({c.email}) PIB={c.pib} verified={c.verified}")
        print(f"Products created/ensured: {created_products}")
        print(f"Invoices created: {created_count}, updated: {updated_count}")


if __name__ == "__main__":
    run()
