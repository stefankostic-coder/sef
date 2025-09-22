"""
Seed podaci za razvoj:
- 1 admin
- 3 company korisnika (sa PIB)
- nekoliko faktura između kompanija

Pokretanje:
    python seed.py
"""

from datetime import date, timedelta
from itertools import cycle

from app import create_app
from db import db
from models import User, Role, Invoice, InvoiceStatus

app = create_app()

def get_or_create_user(email: str, *, name: str, role: Role, pib: str | None = None, verified: bool = False, password: str = "password"):
    u = User.query.filter_by(email=email).first()
    if u:
        # osveži ključne atribute (bez menjanja lozinke ako već postoji)
        u.name = name
        u.role = role
        u.pib = pib
        u.verified = verified
        return u, False
    u = User(name=name, email=email, role=role, pib=pib, verified=verified)
    u.set_password(password)
    db.session.add(u)
    return u, True

def get_or_create_invoice(number: str, **kwargs):
    inv = Invoice.query.filter_by(number=number).first()
    if inv:
        # osveži osnovna polja (korisno kad menjamo seed)
        for k, v in kwargs.items():
            setattr(inv, k, v)
        return inv, False
    inv = Invoice(number=number, **kwargs)
    db.session.add(inv)
    return inv, True

def run():
    with app.app_context():
        # 1) Admin
        admin, _ = get_or_create_user(
            "admin@sef.local",
            name="System Admin",
            role=Role.ADMIN,
            pib=None,
            verified=True,
            password="admin123",
        )

        # 2) Companies (primer PIB-ova: 9 cifara)
        companies_seed = [
            {
                "email": "alpha@company.local",
                "name": "Alpha d.o.o.",
                "pib": "100000001",
                "verified": True,
                "password": "alpha123",
            },
            {
                "email": "beta@company.local",
                "name": "Beta d.o.o.",
                "pib": "100000002",
                "verified": True,
                "password": "beta123",
            },
            {
                "email": "gamma@company.local",
                "name": "Gamma d.o.o.",
                "pib": "100000003",
                "verified": False,  # primer neverifikovane firme
                "password": "gamma123",
            },
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

        # 3) Fakture: za svaku firmu napravimo 2-3 izlazne fakture ka sledećoj firmi u ciklusu
        today = date.today()
        status_cycle = cycle([InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.PAID])

        created_count = 0
        updated_count = 0

        # helper: map pib -> company user
        pib_to_company = {c.pib: c for c in companies if c.pib}

        for idx, issuer in enumerate(companies, start=1):
            if not issuer.pib:
                continue  # company bez PIB-a ne izdaje

            # odredi komitenta: sledeća firma u listi (u krug)
            recipient = companies[(idx) % len(companies)]
            if not recipient.pib or recipient.id == issuer.id:
                # ako je slučajno isti ili nema PIB, probaj sledeću
                recipient = companies[(idx + 1) % len(companies)]

            # Napravi 3 fakture po kompaniji
            for n in range(1, 4):
                number = f"{issuer.pib}-INV-{today.year}-{n:03d}"
                status = next(status_cycle)
                issue = today - timedelta(days=(n * 3))
                due = issue + timedelta(days=14)

                items = [
                    {"name": "Usluga", "qty": 1, "price": 1000.00, "taxRate": 0.0},
                    {"name": "Materijal", "qty": 2, "price": 250.00, "taxRate": 0.2},
                ]
                total = sum(i["qty"] * i["price"] * (1 + (i["taxRate"] or 0)) for i in items)

                inv_payload = dict(
                    issuer_user_id=issuer.id,
                    issuer_pib=issuer.pib,
                    recipient_pib=recipient.pib,
                    issue_date=issue,
                    due_date=due,
                    currency="RSD",
                    total_amount=total,
                    status=status,
                    items=items,
                    note=f"Seed faktura {n} za {issuer.name}",
                )

                inv, created = get_or_create_invoice(number, **inv_payload)
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
        print(f"Invoices created: {created_count}, updated: {updated_count}")

if __name__ == "__main__":
    run()
