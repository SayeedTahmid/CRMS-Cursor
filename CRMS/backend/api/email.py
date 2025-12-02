# backend/api/email.py
"""Resend email API endpoints"""
from flask import Blueprint, request, jsonify
from api.auth import require_auth, require_permission
from services.email_service import get_email_service
from services.email_history_service import log_email_history, get_email_history
import os

email_bp = Blueprint('email', __name__)


def _bad(value):
    """Check if value is bad (None, empty string, or 'undefined')"""
    return not value or value == 'undefined' or (isinstance(value, str) and value.strip() == '')


def _normalize_addresses(value):
    if not value:
        return []
    if isinstance(value, str):
        return [value]
    return value


@email_bp.route('/send', methods=['POST'])
@require_auth
@require_permission("email", "create")
def send_email():
    """
    Send an email via Resend
    
    Request body:
    {
        "to": "recipient@example.com" or ["recipient1@example.com", "recipient2@example.com"],
        "subject": "Email Subject",
        "html": "<h1>HTML content</h1>",  // Optional, but html or text is required
        "text": "Plain text content",     // Optional, but html or text is required
        "from": "custom@example.com",    // Optional, uses RESEND_FROM_EMAIL if not provided
        "reply_to": "reply@example.com", // Optional
        "cc": ["cc@example.com"],        // Optional
        "bcc": ["bcc@example.com"],      // Optional
        "tags": [{"name": "category", "value": "notification"}]  // Optional
    }
    """
    try:
        # Check if Resend is configured
        if not os.getenv('RESEND_API_KEY') or not os.getenv('RESEND_FROM_EMAIL'):
            return jsonify({
                "error": "Resend not configured. Please set RESEND_API_KEY and RESEND_FROM_EMAIL environment variables."
            }), 500
        
        body = request.get_json(force=True) or {}
        
        # Validate required fields
        to = body.get('to')
        subject = body.get('subject')
        html = body.get('html')
        text = body.get('text')
        
        if _bad(to):
            return jsonify({"error": "to is required"}), 400
        
        if _bad(subject):
            return jsonify({"error": "subject is required"}), 400
        
        if _bad(html) and _bad(text):
            return jsonify({"error": "Either html or text content is required"}), 400
        
        tenant_id = request.user.get('tenant_id', 'default')
        customer_id = body.get('customer_id')
        complaint_id = body.get('complaint_id')
        trigger = body.get('trigger') or 'manual'
        sent_by = request.user.get('uid')
        
        # Normalize recipients for logging
        to_list = _normalize_addresses(to)
        cc_list = _normalize_addresses(body.get('cc'))
        bcc_list = _normalize_addresses(body.get('bcc'))
        
        # Get email service
        email_service = get_email_service()
        
        # Send email
        result = email_service.send_email(
            to=to,
            subject=subject,
            html=html,
            text=text,
            from_email=body.get('from'),
            reply_to=body.get('reply_to'),
            cc=body.get('cc'),
            bcc=body.get('bcc'),
            attachments=body.get('attachments'),
            tags=body.get('tags')
        )
        
        # Log history
        log_email_history(
            tenant_id=tenant_id,
            customer_id=customer_id,
            complaint_id=complaint_id,
            subject=subject,
            html=html,
            text=text,
            to=to_list,
            cc=cc_list,
            bcc=bcc_list,
            trigger=trigger,
            sent_by=sent_by,
            status="sent",
            email_id=result.get("id"),
        )
        
        return jsonify({
            "success": True,
            "message": "Email sent successfully",
            "email_id": result.get("id"),
            "result": result
        }), 200
        
    except ValueError as e:
        log_email_history(
            tenant_id=request.user.get('tenant_id', 'default'),
            customer_id=body.get('customer_id'),
            complaint_id=body.get('complaint_id'),
            subject=body.get('subject', 'Unknown Subject'),
            html=body.get('html'),
            text=body.get('text'),
            to=_normalize_addresses(body.get('to')),
            cc=_normalize_addresses(body.get('cc')),
            bcc=_normalize_addresses(body.get('bcc')),
            trigger=body.get('trigger') or 'manual',
            sent_by=request.user.get('uid'),
            status="failed",
            error=str(e),
        )
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Error sending email: {e}")
        import traceback
        traceback.print_exc()
        log_email_history(
            tenant_id=request.user.get('tenant_id', 'default'),
            customer_id=body.get('customer_id'),
            complaint_id=body.get('complaint_id'),
            subject=body.get('subject', 'Unknown Subject'),
            html=body.get('html'),
            text=body.get('text'),
            to=_normalize_addresses(body.get('to')),
            cc=_normalize_addresses(body.get('cc')),
            bcc=_normalize_addresses(body.get('bcc')),
            trigger=body.get('trigger') or 'manual',
            sent_by=request.user.get('uid'),
            status="failed",
            error=str(e),
        )
        return jsonify({"error": str(e)}), 500


@email_bp.route('/status', methods=['GET'])
@require_auth
@require_permission("email", "read")
def get_email_status():
    """Get Resend email service status"""
    try:
        email_service = get_email_service()
        
        configured = email_service.is_configured()
        
        if not configured:
            return jsonify({
                "configured": False,
                "message": "Resend not configured. Please set RESEND_API_KEY and RESEND_FROM_EMAIL environment variables."
            }), 200
        
        # Don't expose API key, just confirm it's set
        return jsonify({
            "configured": True,
            "from_email": email_service.from_email,
            "message": "Resend is configured and ready"
        }), 200
        
    except Exception as e:
        print(f"Error getting email status: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@email_bp.route('/history', methods=['GET'])
@require_auth
@require_permission("email", "read")
def get_email_history_route():
    """Get email history for a customer or complaint"""
    try:
        tenant_id = request.user.get('tenant_id', 'default')
        customer_id = request.args.get('customerId')
        complaint_id = request.args.get('complaintId')
        limit = request.args.get('limit', 20)
        try:
            limit = int(limit)
        except ValueError:
            limit = 20
        
        history = get_email_history(
            tenant_id,
            customer_id=customer_id,
            complaint_id=complaint_id,
            limit=limit,
        )
        
        return jsonify({
            "history": history,
            "count": len(history),
        }), 200
    except Exception as e:
        print(f"Error getting email history: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

