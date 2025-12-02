# backend/services/email_history_service.py
"""Email history service for logging and fetching sent emails"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from google.cloud.firestore_v1.base_query import FieldFilter
from firebase_admin import firestore
from utils.firebase import get_db


def log_email_history(
    tenant_id: str,
    *,
    customer_id: Optional[str] = None,
    complaint_id: Optional[str] = None,
    subject: str,
    html: Optional[str] = None,
    text: Optional[str] = None,
    to: Optional[List[str]] = None,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    trigger: str = "manual",
    sent_by: Optional[str] = None,
    status: str = "sent",
    error: Optional[str] = None,
    email_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Log an email entry to Firestore"""
    try:
        db = get_db()
        history_ref = db.collection("email_history").document()
        history_ref.set(
            {
                "tenant_id": tenant_id,
                "customer_id": customer_id,
                "complaint_id": complaint_id,
                "subject": subject,
                "html": html,
                "text": text,
                "to": to or [],
                "cc": cc or [],
                "bcc": bcc or [],
                "trigger": trigger,
                "sent_by": sent_by,
                "status": status,
                "error": error,
                "email_id": email_id,
                "metadata": metadata or {},
                "sent_at": firestore.SERVER_TIMESTAMP,
            }
        )
    except Exception as e:
        print(f"Error logging email history: {e}")


def get_email_history(
    tenant_id: str,
    *,
    customer_id: Optional[str] = None,
    complaint_id: Optional[str] = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """Fetch email history for a tenant (optionally filtered by customer or complaint)"""
    try:
        db = get_db()
        query = db.collection("email_history").where(
            filter=FieldFilter("tenant_id", "==", tenant_id)
        )

        if customer_id:
            query = query.where(filter=FieldFilter("customer_id", "==", customer_id))
        if complaint_id:
            query = query.where(filter=FieldFilter("complaint_id", "==", complaint_id))

        query = query.order_by("sent_at", direction=firestore.Query.DESCENDING).limit(
            max(1, min(limit, 100))
        )

        items: List[Dict[str, Any]] = []
        for doc in query.stream():
            data = doc.to_dict() or {}
            data["id"] = doc.id
            sent_at = data.get("sent_at")
            if isinstance(sent_at, datetime):
                data["sent_at"] = sent_at.isoformat()
            items.append(data)
        return items
    except Exception as e:
        print(f"Error fetching email history: {e}")
        import traceback

        traceback.print_exc()
        return []

