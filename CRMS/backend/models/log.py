"""Log model for tracking customer interactions"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from models.base import BaseModel


class Log(BaseModel):
    """Log model for storing customer interaction history"""
    
    # Log types
    TYPE_CALL = 'call'
    TYPE_EMAIL = 'email'
    TYPE_MEETING = 'meeting'
    TYPE_NOTE = 'note'
    TYPE_SAMPLE = 'sample'
    TYPE_TASK = 'task'
    TYPE_OTHER = 'other'
    
    TYPES = [TYPE_CALL, TYPE_EMAIL, TYPE_MEETING, TYPE_NOTE, TYPE_SAMPLE, TYPE_TASK, TYPE_OTHER]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.type = kwargs.get('type', self.TYPE_NOTE)
        self.customer_id = kwargs.get('customer_id')
        self.title = kwargs.get('title', '')
        self.description = kwargs.get('description', '')
        self.content = kwargs.get('content', '')
        
        # Timing
        self.log_date = kwargs.get('log_date') or datetime.utcnow()
        self.duration = kwargs.get('duration')  # in minutes for calls/meetings
        
        # Participants
        self.participants = kwargs.get('participants', [])
        self.assigned_to = kwargs.get('assigned_to')
        
        # Attachments
        self.attachments = kwargs.get('attachments', [])
        
        # Metadata
        self.priority = kwargs.get('priority', 'normal')  # low, normal, high, urgent
        self.status = kwargs.get('status', 'completed')  # pending, completed, cancelled
        self.follow_up_required = kwargs.get('follow_up_required', False)
        self.follow_up_date = kwargs.get('follow_up_date')
        
        # Call-specific fields
        self.direction = kwargs.get('direction')  # inbound, outbound (for calls)
        self.call_outcome = kwargs.get('call_outcome')  # answered, voicemail, busy, no_answer
        
        # Email-specific fields
        self.email_subject = kwargs.get('email_subject')
        self.email_thread_id = kwargs.get('email_thread_id')
        self.email_cc = kwargs.get('email_cc', [])
        self.email_bcc = kwargs.get('email_bcc', [])
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert log to dictionary for Firestore"""
        data = super().to_dict()
        
        data.update({
            'type': self.type,
            'customer_id': self.customer_id,
            'title': self.title,
            'description': self.description,
            'content': self.content,
            'log_date': self.log_date,
            'duration': self.duration,
            'participants': self.participants,
            'assigned_to': self.assigned_to,
            'attachments': self.attachments,
            'priority': self.priority,
            'status': self.status,
            'follow_up_required': self.follow_up_required,
            'follow_up_date': self.follow_up_date,
            'direction': self.direction,
            'call_outcome': self.call_outcome,
            'email_subject': self.email_subject,
            'email_thread_id': self.email_thread_id,
            'email_cc': self.email_cc,
            'email_bcc': self.email_bcc,
        })
        
        return data
    
    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]):
        """Create log from Firestore document"""
        return cls(**{**data, 'id': doc_id})
    
    def is_valid(self) -> bool:
        """Validate log data"""
        return bool(
            self.type in self.TYPES and
            self.customer_id and
            self.title
        )


