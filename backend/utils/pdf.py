from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

def render_invoice_pdf(inv: dict) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4

    c.setFont("Helvetica-Bold", 16)
    c.drawString(20*mm, H - 25*mm, f"Faktura {inv['number']}")

    c.setFont("Helvetica", 10)
    y = H - 35*mm
    c.drawString(20*mm, y, f"Izdavalac (PIB): {inv['issuer_pib']}")
    c.drawString(120*mm, y, f"Datum: {inv['issue_date']}")
    y -= 6*mm
    c.drawString(20*mm, y, f"Komitent (PIB): {inv['recipient_pib']}")
    y -= 10*mm

    items = inv.get("items") or []
    if items:
        c.setFont("Helvetica-Bold", 11); c.drawString(20*mm, y, "Stavke")
        y -= 7*mm; c.setFont("Helvetica", 10)
        for it in items:
            name = it.get("name", "")
            qty = it.get("qty", 1)
            price = it.get("price", 0)
            tax = int((it.get("taxRate") or 0) * 100)
            c.drawString(20*mm, y, f"- {name}  x{qty}  @ {price}  PDV {tax}%")
            y -= 6*mm
            if y < 20*mm:
                c.showPage(); y = H - 20*mm

    y -= 8*mm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(20*mm, y, f"Ukupno: {inv['total_amount']} {inv['currency']}   •   Status: {inv['status'].upper()}")

    note = inv.get("note")
    if note:
        y -= 10*mm; c.setFont("Helvetica", 10)
        c.drawString(20*mm, y, f"Napomena: {note[:90]}")

    c.showPage(); c.save()
    return buf.getvalue()
