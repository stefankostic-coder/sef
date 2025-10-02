import base64
import resend
from config import settings

def send_invoice_via_resend(to_email: str, subject: str, html: str, pdf_bytes: bytes, filename: str = "invoice.pdf"):
    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured")
    resend.api_key = settings.RESEND_API_KEY

    params = {
        "from": settings.RESEND_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html,
        **({"reply_to": settings.RESEND_REPLY_TO} if settings.RESEND_REPLY_TO else {}),
        "attachments": [
            {
                "filename": filename,
                "content": base64.b64encode(pdf_bytes).decode("ascii"),
            }
        ],
    }
    return resend.Emails.send(params)
