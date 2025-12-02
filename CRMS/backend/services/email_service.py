# backend/services/email_service.py
"""Resend email service for sending transactional emails"""
import os
import requests
from typing import Optional, Dict, Any, List, Union
from datetime import datetime


class EmailService:
    """Service for sending emails via Resend API"""
    
    BASE_URL = "https://api.resend.com"
    
    def __init__(self):
        """Initialize Resend email service"""
        self.api_key = os.getenv('RESEND_API_KEY', '')
        self.from_email = os.getenv('RESEND_FROM_EMAIL', '')
        
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Resend API requests"""
        headers = {
            'Content-Type': 'application/json',
        }
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        return headers
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make a request to Resend API"""
        url = f"{self.BASE_URL}/{endpoint.lstrip('/')}"
        headers = self._get_headers()
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, json=data, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method.upper() == 'PATCH':
                response = requests.patch(url, headers=headers, json=data, timeout=10)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            # Preserve HTTP error information
            error_info = {
                'status_code': e.response.status_code if hasattr(e, 'response') and e.response else None,
                'message': str(e),
            }
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    error_info['detail'] = error_data.get('message') or error_data.get('error') or str(e)
                    error_info['error_data'] = error_data
                except:
                    error_info['detail'] = e.response.text or str(e)
            
            # Create exception with preserved information
            error_msg = error_info.get('detail') or error_info.get('message', str(e))
            exception = Exception(f"Resend API error: {error_msg}")
            exception.error_info = error_info
            raise exception
        except requests.exceptions.RequestException as e:
            print(f"Resend API error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    raise Exception(f"Resend API error: {error_data.get('message', str(e))}")
                except:
                    raise Exception(f"Resend API error: {e.response.text or str(e)}")
            raise Exception(f"Resend API error: {str(e)}")
    
    def is_configured(self) -> bool:
        """Check if Resend is configured"""
        return bool(self.api_key and self.from_email)
    
    def send_email(
        self,
        to: Union[str, List[str]],
        subject: str,
        html: Optional[str] = None,
        text: Optional[str] = None,
        from_email: Optional[str] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        tags: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Send an email via Resend
        
        Args:
            to: Recipient email address(es) - string or list of strings
            subject: Email subject
            html: HTML content (optional, but html or text is required)
            text: Plain text content (optional, but html or text is required)
            from_email: From email address (defaults to RESEND_FROM_EMAIL)
            reply_to: Reply-to email address (optional)
            cc: CC recipients (optional)
            bcc: BCC recipients (optional)
            attachments: List of attachment dicts with 'filename' and 'content' (base64)
            tags: List of tag dicts with 'name' and 'value' for tracking
            
        Returns:
            Response from Resend API with email ID
        """
        if not self.is_configured():
            raise ValueError("Resend not configured. Please set RESEND_API_KEY and RESEND_FROM_EMAIL environment variables.")
        
        if not html and not text:
            raise ValueError("Either html or text content is required")
        
        # Normalize 'to' to list
        if isinstance(to, str):
            to = [to]
        
        # Build email payload
        payload = {
            'from': from_email or self.from_email,
            'to': to,
            'subject': subject,
        }
        
        if html:
            payload['html'] = html
        if text:
            payload['text'] = text
        if reply_to:
            payload['reply_to'] = reply_to
        if cc:
            payload['cc'] = cc
        if bcc:
            payload['bcc'] = bcc
        if attachments:
            payload['attachments'] = attachments
        if tags:
            payload['tags'] = tags
        
        return self._make_request('POST', '/emails', payload)
    
    def send_transactional_email(
        self,
        to: str | List[str],
        subject: str,
        template_name: Optional[str] = None,
        template_data: Optional[Dict[str, Any]] = None,
        html: Optional[str] = None,
        text: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Send a transactional email (convenience method)
        
        Args:
            to: Recipient email address(es)
            subject: Email subject
            template_name: Optional template name for tracking
            template_data: Optional template data
            html: HTML content
            text: Plain text content
            **kwargs: Additional arguments passed to send_email
            
        Returns:
            Response from Resend API
        """
        # Add template tracking if provided
        tags = kwargs.get('tags', [])
        if template_name:
            tags.append({'name': 'template', 'value': template_name})
        if tags:
            kwargs['tags'] = tags
        
        return self.send_email(
            to=to,
            subject=subject,
            html=html,
            text=text,
            **kwargs
        )


def get_email_service() -> EmailService:
    """Get Resend email service instance"""
    return EmailService()

