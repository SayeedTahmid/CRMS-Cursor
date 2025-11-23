# backend/services/telegram_service.py
"""Telegram Bot service for CRM notifications"""
import os
import requests
from typing import Optional, Dict, Any, List
from datetime import datetime
from utils.firebase import get_db
from firebase_admin import firestore


class TelegramService:
    """Service for interacting with Telegram Bot API"""
    
    BASE_URL = "https://api.telegram.org/bot"
    
    def __init__(self, tenant_id: str):
        """
        Initialize Telegram service for a specific tenant
        
        Args:
            tenant_id: Tenant ID to get bot token for
        """
        self.tenant_id = tenant_id
        self.bot_token = self._get_bot_token()
        
    def _get_bot_token(self) -> Optional[str]:
        """Get bot token for tenant from Firestore"""
        try:
            db = get_db()
            bot_config_ref = db.collection("telegram_bots").document(self.tenant_id)
            bot_config_doc = bot_config_ref.get()
            
            if bot_config_doc.exists:
                config = bot_config_doc.to_dict()
                return config.get("bot_token")
            return None
        except Exception as e:
            print(f"Error getting Telegram bot token for tenant {self.tenant_id}: {e}")
            return None
    
    def _make_request(self, method: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make a request to Telegram Bot API"""
        if not self.bot_token:
            raise ValueError("Bot token not configured for this tenant")
        
        url = f"{self.BASE_URL}{self.bot_token}/{method}"
        
        try:
            response = requests.post(url, json=data, timeout=10)
            response.raise_for_status()
            result = response.json()
            
            if not result.get("ok"):
                raise Exception(f"Telegram API error: {result.get('description', 'Unknown error')}")
            
            return result.get("result", {})
        except requests.exceptions.RequestException as e:
            raise Exception(f"Telegram API request failed: {str(e)}")
    
    def set_webhook(self, webhook_url: str, secret_token: Optional[str] = None) -> bool:
        """
        Set webhook URL for receiving updates from Telegram
        
        Args:
            webhook_url: URL where Telegram will send updates
            secret_token: Optional secret token for webhook verification
            
        Returns:
            True if webhook was set successfully
        """
        try:
            payload = {"url": webhook_url}
            if secret_token:
                payload["secret_token"] = secret_token
            
            self._make_request("setWebhook", payload)
            return True
        except Exception as e:
            print(f"Error setting webhook: {e}")
            return False
    
    def delete_webhook(self) -> bool:
        """Delete webhook for the bot"""
        try:
            self._make_request("deleteWebhook")
            return True
        except Exception as e:
            print(f"Error deleting webhook: {e}")
            return False
    
    def get_me(self) -> Dict[str, Any]:
        """Get bot information"""
        return self._make_request("getMe")
    
    def send_message(
        self,
        chat_id: str,
        text: str,
        parse_mode: Optional[str] = "HTML",
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send a message to a chat
        
        Args:
            chat_id: Telegram chat ID (can be user ID or group ID)
            text: Message text
            parse_mode: Parse mode (HTML or Markdown)
            reply_markup: Optional inline keyboard
            
        Returns:
            Sent message object
        """
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        
        if reply_markup:
            payload["reply_markup"] = reply_markup
        
        return self._make_request("sendMessage", payload)
    
    def send_notification(
        self,
        chat_id: str,
        title: str,
        message: str,
        action_type: Optional[str] = None,
        action_id: Optional[str] = None
    ) -> bool:
        """
        Send a formatted notification
        
        Args:
            chat_id: Telegram chat ID
            title: Notification title
            message: Notification message
            action_type: Type of action (e.g., "complaint", "customer")
            action_id: ID of the related entity
            
        Returns:
            True if message was sent successfully
        """
        try:
            # Format message with HTML
            formatted_message = f"<b>{title}</b>\n\n{message}"
            
            # Add action link if provided
            if action_type and action_id:
                # In a real app, this would link to the CRM
                formatted_message += f"\n\n<i>ID: {action_id}</i>"
            
            self.send_message(chat_id, formatted_message)
            return True
        except Exception as e:
            print(f"Error sending Telegram notification: {e}")
            return False
    
    def is_configured(self) -> bool:
        """Check if bot is configured for this tenant"""
        return self.bot_token is not None
    
    @staticmethod
    def save_bot_config(tenant_id: str, bot_token: str, webhook_url: Optional[str] = None) -> bool:
        """
        Save bot configuration to Firestore
        
        Args:
            tenant_id: Tenant ID
            bot_token: Telegram bot token
            webhook_url: Optional webhook URL
            
        Returns:
            True if saved successfully
        """
        try:
            db = get_db()
            config_ref = db.collection("telegram_bots").document(tenant_id)
            config_data = {
                "bot_token": bot_token,
                "tenant_id": tenant_id,
                "updated_at": firestore.SERVER_TIMESTAMP,
                "updated_by": None  # Will be set by API endpoint
            }
            
            if webhook_url:
                config_data["webhook_url"] = webhook_url
            
            config_ref.set(config_data, merge=True)
            return True
        except Exception as e:
            print(f"Error saving Telegram bot config: {e}")
            return False
    
    @staticmethod
    def get_bot_config(tenant_id: str) -> Optional[Dict[str, Any]]:
        """Get bot configuration from Firestore"""
        try:
            db = get_db()
            config_ref = db.collection("telegram_bots").document(tenant_id)
            config_doc = config_ref.get()
            
            if config_doc.exists:
                return config_doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting Telegram bot config: {e}")
            return None
    
    @staticmethod
    def delete_bot_config(tenant_id: str) -> bool:
        """Delete bot configuration from Firestore"""
        try:
            db = get_db()
            config_ref = db.collection("telegram_bots").document(tenant_id)
            config_ref.delete()
            return True
        except Exception as e:
            print(f"Error deleting Telegram bot config: {e}")
            return False


def get_telegram_service(tenant_id: str) -> TelegramService:
    """Get Telegram service instance for a tenant"""
    return TelegramService(tenant_id)

