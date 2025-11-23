# backend/utils/telegram_notifications.py
"""Helper functions for sending Telegram notifications"""
from typing import Optional, List, Dict, Any
from utils.firebase import get_db
from services.telegram_service import get_telegram_service


def get_notification_chat_ids(tenant_id: str) -> List[str]:
    """
    Get list of Telegram chat IDs to send notifications to for a tenant
    
    This can be configured per tenant or per user. For now, we'll check:
    1. Tenant-level notification chat IDs
    2. User-level chat IDs (for users who have linked their Telegram)
    
    Returns:
        List of chat IDs to notify
    """
    try:
        print(f"[Telegram Notification] Getting chat IDs for tenant: {tenant_id}")
        db = get_db()
        chat_ids = []
        
        # Check tenant-level notification settings
        tenant_config_ref = db.collection("telegram_bots").document(tenant_id)
        tenant_config = tenant_config_ref.get()
        
        if tenant_config.exists:
            config_data = tenant_config.to_dict()
            print(f"[Telegram Notification] Found config for tenant: {tenant_id}")
            # Get notification chat IDs from tenant config
            tenant_chat_ids = config_data.get("notification_chat_ids", [])
            print(f"[Telegram Notification] Raw notification_chat_ids from config: {tenant_chat_ids}, type: {type(tenant_chat_ids)}")
            if isinstance(tenant_chat_ids, list):
                # Convert all to strings
                chat_ids.extend([str(cid) for cid in tenant_chat_ids if cid])
            elif tenant_chat_ids:
                # Handle single value
                chat_ids.append(str(tenant_chat_ids))
        else:
            print(f"[Telegram Notification] No config found for tenant: {tenant_id}")
        
        # Optionally: Get user-level chat IDs
        # For now, we'll just use tenant-level
        
        result = list(set(chat_ids))  # Remove duplicates
        print(f"[Telegram Notification] Final chat IDs list: {result}")
        return result
    except Exception as e:
        print(f"[Telegram Notification] Error getting notification chat IDs: {e}")
        import traceback
        traceback.print_exc()
        return []


def send_telegram_notification(
    tenant_id: str,
    chat_ids: Optional[List[str]] = None,
    title: str = "",
    message: str = "",
    action_type: Optional[str] = None,
    action_id: Optional[str] = None
) -> bool:
    """
    Send Telegram notification to specified chat IDs or tenant default
    
    Args:
        tenant_id: Tenant ID
        chat_ids: List of chat IDs to notify (if None, uses tenant defaults)
        title: Notification title
        message: Notification message
        action_type: Type of action (e.g., "complaint", "customer")
        action_id: ID of the related entity
        
    Returns:
        True if at least one notification was sent successfully
    """
    try:
        print(f"[Telegram Notification] Starting notification for tenant: {tenant_id}, action: {action_type}, id: {action_id}")
        
        telegram_service = get_telegram_service(tenant_id)
        
        if not telegram_service.is_configured():
            print(f"[Telegram Notification] Bot not configured for tenant: {tenant_id}")
            return False
        
        print(f"[Telegram Notification] Bot is configured for tenant: {tenant_id}")
        
        # Get chat IDs if not provided
        if not chat_ids:
            chat_ids = get_notification_chat_ids(tenant_id)
            print(f"[Telegram Notification] Retrieved chat IDs from config: {chat_ids}")
        
        if not chat_ids:
            print(f"[Telegram Notification] No chat IDs configured for tenant: {tenant_id}. Skipping notification.")
            return False
        
        print(f"[Telegram Notification] Sending to {len(chat_ids)} chat ID(s): {chat_ids}")
        
        # Send to all chat IDs
        success_count = 0
        for chat_id in chat_ids:
            try:
                print(f"[Telegram Notification] Attempting to send to chat_id: {chat_id}")
                telegram_service.send_notification(
                    chat_id=chat_id,
                    title=title,
                    message=message,
                    action_type=action_type,
                    action_id=action_id
                )
                print(f"[Telegram Notification] Successfully sent to chat_id: {chat_id}")
                success_count += 1
            except Exception as e:
                print(f"[Telegram Notification] Error sending to {chat_id}: {e}")
                import traceback
                traceback.print_exc()
                # Continue with other chat IDs
        
        print(f"[Telegram Notification] Sent {success_count}/{len(chat_ids)} notifications successfully")
        return success_count > 0
    except Exception as e:
        print(f"[Telegram Notification] Error in send_telegram_notification: {e}")
        import traceback
        traceback.print_exc()
        return False


def notify_complaint_created(
    tenant_id: str,
    complaint_id: str,
    ticket_number: str,
    title: str,
    customer_id: Optional[str] = None,
    priority: Optional[str] = None
) -> bool:
    """Send notification when a complaint is created"""
    try:
        print(f"[Telegram Notification] notify_complaint_created called: tenant={tenant_id}, complaint={complaint_id}, ticket={ticket_number}")
        # Get customer info if available
        customer_name = "Unknown Customer"
        if customer_id:
            try:
                db = get_db()
                customer_doc = db.collection("customers").document(customer_id).get()
                if customer_doc.exists:
                    customer_data = customer_doc.to_dict()
                    customer_name = customer_data.get("name", "Unknown Customer")
            except Exception:
                pass
        
        priority_text = f" ({priority.upper()})" if priority else ""
        
        notification_title = "🔔 New Complaint Created"
        notification_message = (
            f"<b>Complaint:</b> {title}\n"
            f"<b>Ticket:</b> {ticket_number}\n"
            f"<b>Customer:</b> {customer_name}\n"
            f"<b>Priority:</b> {priority or 'Not set'}{priority_text}"
        )
        
        return send_telegram_notification(
            tenant_id=tenant_id,
            title=notification_title,
            message=notification_message,
            action_type="complaint",
            action_id=complaint_id
        )
    except Exception as e:
        print(f"Error in notify_complaint_created: {e}")
        return False


def notify_complaint_updated(
    tenant_id: str,
    complaint_id: str,
    ticket_number: Optional[str] = None,
    title: Optional[str] = None,
    changes: Optional[Dict[str, Any]] = None
) -> bool:
    """Send notification when a complaint is updated"""
    try:
        if not changes:
            return False
        
        # Build change description
        change_parts = []
        if "status" in changes:
            old_status = changes.get("status", {}).get("old", "unknown")
            new_status = changes.get("status", {}).get("new", "unknown")
            change_parts.append(f"Status: {old_status} → {new_status}")
        
        if "priority" in changes or "severity" in changes:
            priority = changes.get("priority") or changes.get("severity")
            change_parts.append(f"Priority: {priority}")
        
        if "assigned_to" in changes:
            change_parts.append("Assignment changed")
        
        if not change_parts:
            # Generic update
            change_parts.append("Details updated")
        
        title_display = title or ticket_number or f"Complaint {complaint_id}"
        
        notification_title = "📝 Complaint Updated"
        notification_message = (
            f"<b>Complaint:</b> {title_display}\n"
            f"<b>Changes:</b> {', '.join(change_parts)}"
        )
        
        return send_telegram_notification(
            tenant_id=tenant_id,
            title=notification_title,
            message=notification_message,
            action_type="complaint",
            action_id=complaint_id
        )
    except Exception as e:
        print(f"Error in notify_complaint_updated: {e}")
        return False


def notify_complaint_status_changed(
    tenant_id: str,
    complaint_id: str,
    old_status: str,
    new_status: str,
    ticket_number: Optional[str] = None,
    title: Optional[str] = None
) -> bool:
    """Send notification when complaint status changes"""
    try:
        print(f"[Telegram Notification] notify_complaint_status_changed called: tenant={tenant_id}, complaint={complaint_id}, status={old_status}->{new_status}")
        status_emoji = {
            "new": "🆕",
            "acknowledged": "✅",
            "in_progress": "🔄",
            "resolved": "✔️",
            "closed": "🔒"
        }
        
        emoji = status_emoji.get(new_status.lower(), "📋")
        title_display = title or ticket_number or f"Complaint {complaint_id}"
        
        notification_title = f"{emoji} Complaint Status Changed"
        notification_message = (
            f"<b>Complaint:</b> {title_display}\n"
            f"<b>Status:</b> {old_status} → <b>{new_status}</b>"
        )
        
        return send_telegram_notification(
            tenant_id=tenant_id,
            title=notification_title,
            message=notification_message,
            action_type="complaint",
            action_id=complaint_id
        )
    except Exception as e:
        print(f"Error in notify_complaint_status_changed: {e}")
        return False


def notify_customer_created(
    tenant_id: str,
    customer_id: str,
    customer_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None
) -> bool:
    """Send notification when a customer is created"""
    try:
        print(f"[Telegram Notification] notify_customer_created called: tenant={tenant_id}, customer={customer_id}, name={customer_name}")
        contact_info = []
        if email:
            contact_info.append(f"Email: {email}")
        if phone:
            contact_info.append(f"Phone: {phone}")
        
        contact_text = "\n".join(contact_info) if contact_info else "No contact info"
        
        notification_title = "👤 New Customer Created"
        notification_message = (
            f"<b>Customer:</b> {customer_name}\n"
            f"<b>Contact:</b> {contact_text}"
        )
        
        return send_telegram_notification(
            tenant_id=tenant_id,
            title=notification_title,
            message=notification_message,
            action_type="customer",
            action_id=customer_id
        )
    except Exception as e:
        print(f"Error in notify_customer_created: {e}")
        return False


def notify_customer_updated(
    tenant_id: str,
    customer_id: str,
    customer_name: str,
    changes: Optional[List[str]] = None
) -> bool:
    """Send notification when a customer is updated"""
    try:
        changes_text = ", ".join(changes) if changes else "Details updated"
        
        notification_title = "📝 Customer Updated"
        notification_message = (
            f"<b>Customer:</b> {customer_name}\n"
            f"<b>Changes:</b> {changes_text}"
        )
        
        return send_telegram_notification(
            tenant_id=tenant_id,
            title=notification_title,
            message=notification_message,
            action_type="customer",
            action_id=customer_id
        )
    except Exception as e:
        print(f"Error in notify_customer_updated: {e}")
        return False

