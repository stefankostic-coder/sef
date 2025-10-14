from io import BytesIO
from datetime import date, datetime
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Image,
)
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_RIGHT

def fmt_money(value, currency="RSD"):
    try:
        v = Decimal(str(value or 0))
    except Exception:
        v = Decimal("0")
    return f"{v:.2f} {currency}"

def fmt_date(value):
    try:
        if isinstance(value, datetime):
            return value.strftime("%d.%m.%Y.")
        if isinstance(value, date):
            return value.strftime("%d.%m.%Y.")
        if isinstance(value, str):
            return datetime.fromisoformat(value).strftime("%d.%m.%Y.")
    except Exception:
        pass
    return str(value)

def _header_footer(canvas: canvas.Canvas, doc, meta):
    w, h = A4
    canvas.saveState()

    # Header line
    canvas.setStrokeColor(colors.HexColor("#e5e7eb"))  # slate-200
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, h - 28*mm, w - 20*mm, h - 28*mm)

    # Footer line
    canvas.line(20*mm, 18*mm, w - 20*mm, 18*mm)

    # Footer: page numbers
    page_num = canvas.getPageNumber()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#64748b"))  # slate-500
    canvas.drawRightString(w - 20*mm, 12*mm, f"Strana {page_num}")

    # Footer: company/site
    if meta and meta.get("issuer_name"):
        canvas.drawString(20*mm, 12*mm, f"{meta['issuer_name']}")

    canvas.restoreState()

def render_invoice_pdf(inv: dict, *, logo_path: str | None = None) -> bytes:
    """
    inv primer:
    {
      "number": "INV-2025-0001",
      "issue_date": "2025-10-13",
      "currency": "RSD",
      "status": "paid"|"unpaid"|...,
      "issuer_name": "Moja Firma d.o.o.",
      "issuer_pib": "123456789",
      "issuer_address": "Ulica 1, Beograd",
      "recipient_name": "Kupac d.o.o.",
      "recipient_pib": "987654321",
      "recipient_address": "Druga 2, Novi Sad",
      "note": "Hvala na saradnji",
      "items": [
        {"name":"Usluga A","qty":2,"price":1200,"taxRate":0.2},
        ...
      ],
      "total_amount": 9999.99
    }
    """

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=35*mm,
        bottomMargin=25*mm,
        title=f"Faktura {inv.get('number','')}",
        author=inv.get("issuer_name") or "Issuer",
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="H1", fontName="Helvetica-Bold", fontSize=16, leading=18))
    styles.add(ParagraphStyle(name="H2", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=colors.HexColor("#0f172a")))  # slate-900
    styles.add(ParagraphStyle(name="Body", fontName="Helvetica", fontSize=10, leading=13))
    styles.add(ParagraphStyle(name="BodyRight", parent=styles["Body"], alignment=TA_RIGHT))

    elems = []

    # Top header block (logo + title + meta)
    header_table_data = []

    # Left: Logo (if provided)
    if logo_path:
        try:
            img = Image(logo_path, width=28*mm, height=28*mm)
        except Exception:
            img = Paragraph("", styles["Body"])
    else:
        img = Paragraph("", styles["Body"])

    # Middle: Title
    title = Paragraph(f"Faktura <b>{inv.get('number','')}</b>", styles["H1"])

    # Right: Status + Date
    status = str(inv.get("status", "")).upper()
    issue_date = fmt_date(inv.get("issue_date"))
    right_meta = Paragraph(
        f"<para align='right'><b>Status:</b> {status}<br/><b>Datum:</b> {issue_date}</para>",
        styles["Body"]
    )

    header_table_data.append([img, title, right_meta])
    header_tbl = Table(header_table_data, colWidths=[30*mm, 90*mm, 50*mm])
    header_tbl.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    elems.append(header_tbl)
    elems.append(Spacer(1, 8))

    # Parties (issuer / recipient)
    issuer_name = inv.get("issuer_name") or f"Izdavalac (PIB: {inv.get('issuer_pib','')})"
    recipient_name = inv.get("recipient_name") or f"Komitent (PIB: {inv.get('recipient_pib','')})"

    issuer_block = [
        Paragraph("<b>Izdavalac</b>", styles["H2"]),
        Paragraph(issuer_name, styles["Body"]),
        Paragraph(f"PIB: {inv.get('issuer_pib','-')}", styles["Body"]),
        Paragraph(inv.get("issuer_address",""), styles["Body"]),
    ]

    recipient_block = [
        Paragraph("<b>Komitent</b>", styles["H2"]),
        Paragraph(recipient_name, styles["Body"]),
        Paragraph(f"PIB: {inv.get('recipient_pib','-')}", styles["Body"]),
        Paragraph(inv.get("recipient_address",""), styles["Body"]),
    ]

    parties_tbl = Table(
        [[issuer_block, recipient_block]],
        colWidths=[(doc.width/2)-6, (doc.width/2)-6]
    )
    parties_tbl.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
    ]))
    elems.append(parties_tbl)
    elems.append(Spacer(1, 10))

    # Items table
    items = inv.get("items") or []
    currency = inv.get("currency") or "RSD"

    data = [
        ["#", "Opis", "Kolicina", "Cena", "PDV", "Iznos"]
    ]

    total_net = Decimal("0")
    total_tax = Decimal("0")
    total_gross = Decimal("0")

    total_net = Decimal("0")
    total_tax = Decimal("0")
    total_gross = Decimal("0")

    for idx, it in enumerate(items, start=1):
        # qty
        qty = Decimal(str(it.get("qty") or 1))
        # CENA PO JEDINICI: backend čuva 'unit_price' (fallback na 'price' ako postoji)
        unit_price = Decimal(str(it.get("unit_price") or it.get("price") or 0))
        # POREZ: backend čuva 'tax_rate' u procentima (0, 10, 20) — fallback na 'taxRate' ako postoji
        tax_rate_pct = Decimal(str(it.get("tax_rate") or it.get("taxRate") or 0))
        tax_rate = (tax_rate_pct / Decimal(100))  # pretvori u decimalnu stopu (0.10, 0.20, ...)

        net = qty * unit_price
        tax_amt = net * tax_rate
        gross = net + tax_amt

        total_net += net
        total_tax += tax_amt
        total_gross += gross

        data.append([
            str(idx),
            it.get("name", ""),
            f"{qty.normalize():f}",
            fmt_money(unit_price, currency),     # JEDINIČNA CENA
            f"{tax_rate_pct:.0f}%",              # PDV u %
            fmt_money(gross, currency),          # IZNOS (sa PDV)
        ])


    tbl = Table(data, colWidths=[12*mm, None, 22*mm, 28*mm, 18*mm, 30*mm])
    tbl.setStyle(TableStyle([
        ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#e5e7eb")),
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#f8fafc")),  # slate-50
        ("TEXTCOLOR", (0,0), (-1,0), colors.HexColor("#0f172a")),   # slate-900
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("ALIGN", (0,0), (0,-1), "CENTER"),
        ("ALIGN", (2,1), (2,-1), "RIGHT"),
        ("ALIGN", (3,1), (3,-1), "RIGHT"),
        ("ALIGN", (4,1), (4,-1), "CENTER"),
        ("ALIGN", (5,1), (5,-1), "RIGHT"),
        # zebra rows
        ("BACKGROUND", (0,1), (-1,-1), colors.whitesmoke),
        ("BACKGROUND", (0,2), (-1,-1), None),
    ]))
    # zebra efekat ručno:
    for r in range(1, len(data)):
        if r % 2 == 1:
            tbl.setStyle(TableStyle([("BACKGROUND", (0, r), (-1, r), colors.whitesmoke)]))

    elems.append(tbl)
    elems.append(Spacer(1, 10))

    # Summary block (right aligned)
    summary = [
        ["Osnovica", Paragraph(fmt_money(total_net, currency), styles["BodyRight"])],
        ["PDV", Paragraph(fmt_money(total_tax, currency), styles["BodyRight"])],
        ["Ukupno", Paragraph(f"<b>{fmt_money(total_gross, currency)}</b>", styles["BodyRight"])],
    ]
    sum_tbl = Table(summary, colWidths=[doc.width - 50*mm, 50*mm])
    sum_tbl.setStyle(TableStyle([
        ("ALIGN", (0,0), (-1,-1), "RIGHT"),
        ("FONTNAME", (0,2), (-1,2), "Helvetica-Bold"),
        ("LINEABOVE", (0,2), (-1,2), 0.5, colors.HexColor("#0f172a")),
    ]))
    elems.append(sum_tbl)

    if inv.get("note"):
        elems.append(Spacer(1, 8))
        elems.append(Paragraph("<b>Napomena</b>", styles["H2"]))
        elems.append(Paragraph(inv["note"], styles["Body"]))

    meta = {"issuer_name": inv.get("issuer_name")}
    doc.build(
        elems,
        onFirstPage=lambda c, d: _header_footer(c, d, meta),
        onLaterPages=lambda c, d: _header_footer(c, d, meta),
    )
    return buf.getvalue()
