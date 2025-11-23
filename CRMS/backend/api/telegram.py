# backend/api/telegram.py
"""Telegram Bot integration API endpoints"""
from flask import Blueprint, request, jsonify
from api.auth import require_auth, require_permission
from utils.firebase import get_db
from services.telegram_service import TelegramService, get_telegram_service
from firebase_admin import firestore
import os
import hashlib

telegram_bp = Blueprint('telegram', __name__)


def _bad(value):
    """Check if value is bad (None, empty string, or 'undefined')"""
    return not value or value == 'undefined' or (isinstance(value, str) and value.strip() == '')


@telegram_bp.route('/config', methods=['GET'])
@require_auth
@require_permission("telegram", "read")
def get_bot_config():
    """
    Get Telegram bot configuration for current tenant
    
    Returns bot configuration (without exposing token)
    """
    try:
        tenant_id = request.user.get('tenant_id', 'default')
        
        config = TelegramService.get_bot_config(tenant_id)
        
        if not config:
            return jsonify({
                "configured": False,
                "message": "Bot not configured for this tenant"
            }), 200
        
        # Don't expose bot token in response
        return jsonify({
            "configured": True,
            "webhook_url": config.get("webhook_url"),
            "notification_chat_ids": config.get("notification_chat_ids", []),
            "updated_at": config.get("updated_at"),
            "updated_by": config.get("updated_by")
        }), 200
        
    except Exception as e:
        print(f"Error getting Telegram bot config: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@telegram_bp.route('/config', methods=['POST'])
@require_auth
@require_permission("telegram", "update")
def set_bot_config():
    """
    Set Telegram bot configuration for current tenant
    
    Request body:
    {
        "bot_token": "123456:ABC-DEF...",
        "webhook_url": "https://your-domain.com/api/telegram/webhook"  // Optional
    }
    """
    try:
        tenant_id = request.user.get('tenant_id', 'default')
        uid = request.user['uid']
        
        body = request.get_json(force=True) or {}
        bot_token = body.get('bot_token')
        
        if _bad(bot_token):
            return jsonify({"error": "bot_token is required"}), 400
        
        # Verify bot token by getting bot info
        try:
            temp_service = TelegramService(tenant_id)
            temp_service.bot_token = bot_token
            bot_info = temp_service.get_me()
            
            if not bot_info:
                return jsonify({"error": "Invalid bot token"}), 400
        except Exception as e:
            return jsonify({"error": f"Invalid bot token: {str(e)}"}), 400
        
        webhook_url = body.get('webhook_url')
        notification_chat_ids = body.get('notification_chat_ids', [])
        
        # Validate notification_chat_ids if provided
        if notification_chat_ids and not isinstance(notification_chat_ids, list):
            return jsonify({"error": "notification_chat_ids must be a list"}), 400
        
        # Save bot configuration
        success = TelegramService.save_bot_config(tenant_id, bot_token, webhook_url)
        
        if not success:
            return jsonify({"error": "Failed to save bot configuration"}), 500
        
        # Update updated_by field and notification chat IDs
        try:
            db = get_db()
            config_ref = db.collection("telegram_bots").document(tenant_id)
            update_data = {
                "updated_by": uid,
                "bot_username": bot_info.get("username"),
                "bot_name": bot_info.get("first_name")
            }
            if notification_chat_ids:
                update_data["notification_chat_ids"] = notification_chat_ids
            config_ref.update(update_data)
        except Exception as e:
            print(f"Warning: Failed to update config metadata: {e}")
        
        # Set webhook if URL provided
        if webhook_url:
            telegram_service = get_telegram_service(tenant_id)
            # Generate secret token for webhook verification
            secret_token = hashlib.sha256(f"{tenant_id}:{bot_token}".encode()).hexdigest()
            telegram_service.set_webhook(webhook_url, secret_token)
            
            # Store secret token
            try:
                config_ref = db.collection("telegram_bots").document(tenant_id)
                config_ref.update({"webhook_secret": secret_token})
            except Exception as e:
                print(f"Warning: Failed to save webhook secret: {e}")
        
        return jsonify({
            "success": True,
            "message": "Bot configuration saved successfully",
            "bot_info": {
                "username": bot_info.get("username"),
                "first_name": bot_info.get("first_name"),
                "id": bot_info.get("id")
            }
        }), 200
        
    except Exception as e:
        print(f"Error setting Telegram bot config: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@telegram_bp.route('/config', methods=['DELETE'])
@require_auth
@require_permission("telegram", "delete")
def delete_bot_config():
    """Delete Telegram bot configuration for current tenant"""
    try:
        tenant_id = request.user.get('tenant_id', 'default')
        
        # Delete webhook first
        try:
            telegram_service = get_telegram_service(tenant_id)
            if telegram_service.is_configured():
                telegram_service.delete_webhook()
        except Exception:
            pass  # Ignore errors when deleting webhook
        
        # Delete configuration
        success = TelegramService.delete_bot_config(tenant_id)
        
        if not success:
            return jsonify({"error": "Failed to delete bot configuration"}), 500
        
        return jsonify({
            "success": True,
            "message": "Bot configuration deleted successfully"
        }), 200
        
    except Exception as e:
        print(f"Error deleting Telegram bot config: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@telegram_bp.route('/status', methods=['GET'])
@require_auth
@require_permission("telegram", "read")
def get_bot_status():
    """Get Telegram bot status and information"""
    try:
        tenant_id = request.user.get('tenant_id', 'default')
        
        telegram_service = get_telegram_service(tenant_id)
        
        if not telegram_service.is_configured():
            return jsonify({
                "configured": False,
                "message": "Bot not configured for this tenant"
            }), 200
        
        # Get bot info
        try:
            bot_info = telegram_service.get_me()
            
            return jsonify({
                "configured": True,
                "bot_info": {
                    "id": bot_info.get("id"),
                    "username": bot_info.get("username"),
                    "first_name": bot_info.get("first_name"),
                    "is_bot": bot_info.get("is_bot", True)
                }
            }), 200
        except Exception as e:
            return jsonify({
                "configured": True,
                "error": f"Failed to get bot info: {str(e)}"
            }), 500
        
    except Exception as e:
        print(f"Error getting Telegram bot status: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@telegram_bp.route('/send', methods=['POST'])
@require_auth
@require_permission("telegram", "create")
def send_notification():
    """
    Send a notification via Telegram bot
    
    Request body:
    {
        "chat_id": "123456789",
        "title": "Notification Title",
        "message": "Notification message",
        "action_type": "complaint",  // Optional
        "action_id": "complaint123"  // Optional
    }
    """
    try:
        tenant_id = request.user.get('tenant_id', 'default')
        
        telegram_service = get_telegram_service(tenant_id)
        
        if not telegram_service.is_configured():
            return jsonify({
                "error": "Bot not configured for this tenant"
            }), 400
        
        body = request.get_json(force=True) or {}
        chat_id = body.get('chat_id')
        title = body.get('title', 'Notification')
        message = body.get('message', '')
        action_type = body.get('action_type')
        action_id = body.get('action_id')
        
        if _bad(chat_id):
            return jsonify({"error": "chat_id is required"}), 400
        
        if _bad(message):
            return jsonify({"error": "message is required"}), 400
        
        success = telegram_service.send_notification(
            chat_id=chat_id,
            title=title,
            message=message,
            action_type=action_type,
            action_id=action_id
        )
        
        if not success:
            return jsonify({"error": "Failed to send notification"}), 500
        
        return jsonify({
            "success": True,
            "message": "Notification sent successfully"
        }), 200
        
    except Exception as e:
        print(f"Error sending Telegram notification: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@telegram_bp.route('/test-notification', methods=['POST'])
@require_auth
@require_permission("telegram", "create")
def test_notification():
    """
    Test endpoint to verify Telegram notifications are working
    
    Request body:
    {
        "chat_id": "123456789"  // Optional, uses tenant defaults if not provided
    }
    """
    try:
        tenant_id = request.user.get('tenant_id', 'default')
        body = request.get_json(force=True) or {}
        chat_id = body.get('chat_id')
        
        from utils.telegram_notifications import send_telegram_notification
        
        chat_ids = [chat_id] if chat_id else None
        
        success = send_telegram_notification(
            tenant_id=tenant_id,
            chat_ids=chat_ids,
            title="🧪 Test Notification",
            message="This is a test notification from the CRM system. If you receive this, notifications are working!",
            action_type="test",
            action_id="test123"
        )
        
        if success:
            return jsonify({
                "success": True,
                "message": "Test notification sent successfully"
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "Failed to send test notification. Check server logs for details.",
                "hint": "Make sure bot is configured and notification_chat_ids are set"
            }), 500
        
    except Exception as e:
        print(f"Error in test_notification: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@telegram_bp.route('/webhook', methods=['POST'])
def webhook():
    """
    Telegram webhook endpoint for receiving updates
    
    This endpoint does NOT use require_auth because Telegram sends requests
    with a secret token in the header for verification.
    """
    try:
        # Get secret token from header
        secret_token = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
        
        if not secret_token:
            return jsonify({"error": "Secret token required"}), 401
        
        # Get update data
        update = request.get_json(force=True) or {}
        
        # Find tenant by secret token
        db = get_db()
        bots_ref = db.collection("telegram_bots")
        bots = bots_ref.stream()
        
        tenant_id = None
        for bot_doc in bots:
            bot_data = bot_doc.to_dict()
            if bot_data.get("webhook_secret") == secret_token:
                tenant_id = bot_data.get("tenant_id")
                break
        
        if not tenant_id:
            return jsonify({"error": "Invalid secret token"}), 401
        
        # Process update
        message = update.get("message")
        if message:
            chat_id = str(message.get("chat", {}).get("id"))
            text = message.get("text", "")
            from_user = message.get("from", {})
            user_id = from_user.get("id")
            username = from_user.get("username")
            
            # Log the message (optional)
            try:
                log_ref = db.collection("telegram_messages").document()
                log_ref.set({
                    "tenant_id": tenant_id,
                    "chat_id": chat_id,
                    "user_id": user_id,
                    "username": username,
                    "text": text,
                    "message_data": message,
                    "received_at": firestore.SERVER_TIMESTAMP
                })
            except Exception as e:
                print(f"Warning: Failed to log Telegram message: {e}")
            
            # Here you can add custom message handling logic
            # For now, just acknowledge receipt
            # In a full implementation, you might want to:
            # - Handle commands (e.g., /start, /help)
            # - Process queries from users
            # - Update user chat IDs for notifications
        
        # Always return 200 to acknowledge receipt
        return jsonify({"ok": True}), 200
        
    except Exception as e:
        print(f"Error processing Telegram webhook: {e}")
        import traceback
        traceback.print_exc()
        # Still return 200 to avoid Telegram retries
        return jsonify({"ok": False, "error": str(e)}), 200

