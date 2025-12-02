# backend/utils/email_notifications.py
"""Helper utilities for sending email notifications via Resend"""
from typing import Optional, Dict, Any
from utils.firebase import get_db
from services.email_service import get_email_service
from services.email_history_service import log_email_history


def _get_customer_details(customer_id: str) -> Dict[str, Any]:
    """Fetch customer details (email, name)"""
    try:
        db = get_db()
        doc = db.collection("customers").document(customer_id).get()
        if doc.exists:
            data = doc.to_dict() or {}
            data["id"] = doc.id
            return data
        return {}
    except Exception as e:
        print(f"Error fetching customer details: {e}")
        return {}


def send_email_notification(
    *,
    tenant_id: str,
    to_email: Optional[str],
    subject: str,
    html: Optional[str],
    text: Optional[str],
    customer_id: Optional[str] = None,
    complaint_id: Optional[str] = None,
    trigger: str,
    sent_by: Optional[str] = None,
) -> bool:
    """Send an email notification and log it"""
    try:
        if not to_email:
            return False

        email_service = get_email_service()
        if not email_service.is_configured():
            return False

        result = email_service.send_email(
            to=to_email,
            subject=subject,
            html=html,
            text=text,
        )

        log_email_history(
            tenant_id=tenant_id,
            customer_id=customer_id,
            complaint_id=complaint_id,
            subject=subject,
            html=html,
            text=text,
            to=[to_email],
            trigger=trigger,
            sent_by=sent_by,
            status="sent",
            email_id=result.get("id"),
        )
        return True
    except Exception as e:
        print(f"Error sending email notification: {e}")
        log_email_history(
            tenant_id=tenant_id,
            customer_id=customer_id,
            complaint_id=complaint_id,
            subject=subject,
            html=html,
            text=text,
            to=[to_email] if to_email else [],
            trigger=trigger,
            sent_by=sent_by,
            status="failed",
            error=str(e),
        )
        return False


def notify_complaint_created_email(
    tenant_id: str,
    complaint: Dict[str, Any],
    customer_id: Optional[str],
) -> bool:
    if not customer_id:
        return False
    customer = _get_customer_details(customer_id)
    to_email = customer.get("email")
    if not to_email:
        return False

    ticket_number = complaint.get("ticket_number") or complaint.get("title")
    subject = f"Complaint Received - {ticket_number or 'Your complaint'}"
    customer_name = customer.get("name") or "Customer"
    description = complaint.get("description", "")

    html = f"""
        <h2>Hi {customer_name},</h2>
        <p>We have received your complaint titled <strong>{complaint.get('title') or complaint.get('subject')}</strong>.</p>
        {('<p><strong>Ticket:</strong> ' + ticket_number + '</p>') if ticket_number else ''}
        <p>Our team will review it and get back to you shortly.</p>
        <p><em>Description:</em> {description}</p>
        <p>Thank you for your patience.<br/>NextGen CRM Support Team</p>
    """
    text = (
        f"Hi {customer_name},\n\n"
        f"We have received your complaint titled {complaint.get('title') or complaint.get('subject')}.\n"
        f"{('Ticket: ' + ticket_number + '\\n') if ticket_number else ''}"
        f"Description: {description}\n\n"
        "Our team will review it and get back to you shortly.\n\n"
        "NextGen CRM Support Team"
    )

    return send_email_notification(
        tenant_id=tenant_id,
        to_email=to_email,
        subject=subject,
        html=html,
        text=text,
        customer_id=customer_id,
        complaint_id=complaint.get("id"),
        trigger="complaint_created",
    )


def notify_complaint_status_email(
    tenant_id: str,
    complaint: Dict[str, Any],
    customer_id: Optional[str],
    old_status: str,
    new_status: str,
) -> bool:
    if not customer_id:
        return False
    customer = _get_customer_details(customer_id)
    to_email = customer.get("email")
    if not to_email:
        return False

    status_map = {
        "new": "New",
        "acknowledged": "Acknowledged",
        "in_progress": "In Progress",
        "resolved": "Resolved",
        "closed": "Closed",
    }
    subject = f"Complaint Status Update - {status_map.get(new_status, new_status).title()}"
    ticket_number = complaint.get("ticket_number")

    html = f"""
        <h2>Status Update</h2>
        <p>Your complaint <strong>{complaint.get('title') or ticket_number or complaint.get('id')}</strong> has been updated.</p>
        <p><strong>Status:</strong> {status_map.get(old_status, old_status).title()} → {status_map.get(new_status, new_status).title()}</p>
        {('<p><strong>Ticket:</strong> ' + ticket_number + '</p>') if ticket_number else ''}
        <p>We will keep you informed of further updates.</p>
    """
    text = (
        f"Your complaint {complaint.get('title') or ticket_number or complaint.get('id')} has been updated.\n"
        f"Status: {status_map.get(old_status, old_status).title()} -> {status_map.get(new_status, new_status).title()}\n"
        f"{('Ticket: ' + ticket_number + '\\n') if ticket_number else ''}"
        "We will keep you informed of further updates."
    )

    return send_email_notification(
        tenant_id=tenant_id,
        to_email=to_email,
        subject=subject,
        html=html,
        text=text,
        customer_id=customer_id,
        complaint_id=complaint.get("id"),
        trigger="complaint_status",
    )


def notify_complaint_updated_email(
    tenant_id: str,
    complaint: Dict[str, Any],
    customer_id: Optional[str],
) -> bool:
    if not customer_id:
        return False
    customer = _get_customer_details(customer_id)
    to_email = customer.get("email")
    if not to_email:
        return False

    subject = f"Complaint Updated - {complaint.get('title') or complaint.get('ticket_number') or complaint.get('id')}"
    html = f"""
        <h2>Complaint Updated</h2>
        <p>Your complaint <strong>{complaint.get('title') or complaint.get('id')}</strong> has been updated.</p>
        <p>We wanted to keep you informed about the latest changes.</p>
    """
    text = (
        f"Your complaint {complaint.get('title') or complaint.get('id')} has been updated.\n"
        "We wanted to keep you informed about the latest changes."
    )

    return send_email_notification(
        tenant_id=tenant_id,
        to_email=to_email,
        subject=subject,
        html=html,
        text=text,
        customer_id=customer_id,
        complaint_id=complaint.get("id"),
        trigger="complaint_updated",
    )


def notify_customer_created_email(
    tenant_id: str,
    customer: Dict[str, Any],
) -> bool:
    to_email = customer.get("email")
    if not to_email:
        return False

    subject = "Welcome to NextGen CRM"
    html = f"""
        <h2>Welcome {customer.get('name', '')}!</h2>
        <p>Thank you for joining NextGen CRM. We're excited to work with you.</p>
        <p>If you have any questions, feel free to reply to this email.</p>
    """
    text = (
        f"Welcome {customer.get('name', '')}!\n\n"
        "Thank you for joining NextGen CRM. We're excited to work with you.\n"
        "If you have any questions, feel free to reply to this email."
    )

    return send_email_notification(
        tenant_id=tenant_id,
        to_email=to_email,
        subject=subject,
        html=html,
        text=text,
        customer_id=customer.get("id"),
        trigger="customer_created",
    )

