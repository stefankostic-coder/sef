import base64
import smtplib
from email.message import EmailMessage
from typing import Optional
import resend
from config import settings

def build_invoice_email_html(inv: dict, *, download_url: Optional[str] = None) -> str:
    currency = inv.get("currency") or "RSD"
    total = inv.get("total_amount") or 0
    number = inv.get("number") or ""
    status = str(inv.get("status", "")).upper()
    issue_date = inv.get("issue_date") or ""
    issuer = inv.get("issuer_name") or "Izdavalac"
    recipient = inv.get("recipient_name") or "Komitent"

    preheader = f"Faktura {number} – ukupno {total:.2f} {currency}"
    btn_html = f"""<a href="{download_url}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600">Preuzmi PDF</a>""" if download_url else ""

    return f"""\
<!DOCTYPE html>
<html lang="sr">
  <head>
    <meta charset="utf-8" />
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>Faktura {number}</title>
    <style>@media (max-width:600px){{.container{{width:100%!important;padding:0 16px!important;}}}}</style>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;visibility:hidden">{preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 0;">
      <tr><td align="center">
        <table class="container" role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:24px 24px 8px 24px;">
            <div style="font-size:20px;font-weight:700;color:#0f172a;">Faktura {number}</div>
            <div style="margin-top:4px;font-size:12px;color:#64748b;">Datum: <strong>{issue_date}</strong> • Status: <strong>{status}</strong></div>
          </td></tr>
          <tr><td style="padding:8px 24px 16px 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="vertical-align:top;width:50%;padding-right:8px;">
                  <div style="font-weight:600;color:#0f172a;margin-bottom:4px;">Izdavalac</div>
                  <div style="font-size:13px;color:#0f172a;">{issuer}</div>
                  <div style="font-size:12px;color:#64748b;">PIB: {inv.get('issuer_pib','-')}</div>
                  <div style="font-size:12px;color:#64748b;">{inv.get('issuer_address','')}</div>
                </td>
                <td style="vertical-align:top;width:50%;padding-left:8px;">
                  <div style="font-weight:600;color:#0f172a;margin-bottom:4px;">Komitent</div>
                  <div style="font-size:13px;color:#0f172a;">{recipient}</div>
                  <div style="font-size:12px;color:#64748b;">PIB: {inv.get('recipient_pib','-')}</div>
                  <div style="font-size:12px;color:#64748b;">{inv.get('recipient_address','')}</div>
                </td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:0 24px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
          <tr><td style="padding:16px 24px;">
            <div style="font-size:14px;color:#0f172a;">Ukupno za plaćanje</div>
            <div style="font-size:28px;font-weight:800;color:#0ea5e9;margin-top:6px;">{total:.2f} {currency}</div>
            <div style="margin-top:14px;">{btn_html}</div>
            {"<div style='margin-top:12px;font-size:12px;color:#64748b;'>" + inv.get('note','') + "</div>" if inv.get('note') else ""}
          </td></tr>
          <tr><td style="padding:0 24px 24px 24px;">
            <div style="height:1px;background:#e5e7eb;"></div>
            <div style="font-size:12px;color:#94a3b8;margin-top:12px;">Ova poruka je automatski generisana. Za pitanja, odgovorite na mejl ili nas kontaktirajte.</div>
          </td></tr>
        </table>
        <div style="font-size:11px;color:#94a3b8;margin-top:10px;">
          {(getattr(settings, "SITE_NAME", "") or "")} • {(getattr(settings, "RESEND_FROM", "") or getattr(settings, "SMTP_FROM", ""))}
        </div>
      </td></tr>
    </table>
  </body>
</html>
"""

def _send_with_resend(to_email: str, subject: str, html: str, pdf_bytes: bytes, filename: str = "invoice.pdf"):
    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured")
    resend.api_key = settings.RESEND_API_KEY
    params = {
        "from": settings.RESEND_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html,
        **({"reply_to": settings.RESEND_REPLY_TO} if getattr(settings, "RESEND_REPLY_TO", None) else {}),
        "attachments": [{"filename": filename, "content": base64.b64encode(pdf_bytes).decode("ascii")}],
    }
    return resend.Emails.send(params)

def _send_with_smtp(to_email: str, subject: str, html: str, pdf_bytes: bytes, filename: str = "invoice.pdf"):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = getattr(settings, "SMTP_FROM", getattr(settings, "RESEND_FROM", "no-reply@example.com"))
    msg["To"] = to_email
    msg.set_content(f"{subject}\n\nMolimo pogledajte prilog (PDF) sa fakturom.")
    msg.add_alternative(html, subtype="html")
    msg.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename=filename)

    host = getattr(settings, "SMTP_HOST", "localhost")
    port = int(getattr(settings, "SMTP_PORT", 1025))
    use_tls = bool(getattr(settings, "SMTP_USE_TLS", False))
    user = getattr(settings, "SMTP_USER", None)
    pwd = getattr(settings, "SMTP_PASS", None)

    if use_tls:
        server = smtplib.SMTP(host, port)
        server.starttls()
    else:
        server = smtplib.SMTP(host, port)
    try:
        if user and pwd:
            server.login(user, pwd)
        server.send_message(msg)
    finally:
        server.quit()
    return {"status": "ok", "backend": "smtp"}

def send_invoice_email(to_email: str, inv: dict, pdf_bytes: bytes, *, pdf_filename: str = "invoice.pdf", download_url: str | None = None):
    subject = f"Faktura {inv.get('number','')}"
    html = build_invoice_email_html(inv, download_url=download_url)
    backend = getattr(settings, "MAIL_BACKEND", "resend").lower()
    if backend == "smtp":
        return _send_with_smtp(to_email, subject, html, pdf_bytes, filename=pdf_filename)
    return _send_with_resend(to_email, subject, html, pdf_bytes, filename=pdf_filename)
