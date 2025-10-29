"""Complaint model for handling customer complaints"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from models.base import BaseModel


class Complaint(BaseModel):
    """Complaint model for managing customer complaints"""
    
    # Complaint status
    STATUS_NEW = 'new'
    STATUS_ACKNOWLEDGED = 'acknowledged'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_RESOLVED = 'resolved'
    STATUS_CLOSED = 'closed'
    
    STATUSES = [STATUS_NEW, STATUS_ACKNOWLEDGED, STATUS_IN_PROGRESS, STATUS_RESOLVED, STATUS_CLOSED]
    
    # Priority levels
    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'
    PRIORITY_URGENT = 'urgent'
    
    PRIORITIES = [PRIORITY_LOW, PRIORITY_MEDIUM, PRIORITY_HIGH, PRIORITY_URGENT]
    
    # Complaint types
    TYPE_PRODUCT = 'product'
    TYPE_SERVICE = 'service'
    TYPE_BILLING = 'billing'
    TYPE_DELIVERY = 'delivery'
    TYPE_SUPPORT = 'support'
    TYPE_OTHER = 'other'
    
    TYPES = [TYPE_PRODUCT, TYPE_SERVICE, TYPE_BILLING, TYPE_DELIVERY, TYPE_SUPPORT, TYPE_OTHER]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.customer_id = kwargs.get('customer_id')
        self.subject = kwargs.get('subject', '')
        self.description = kwargs.get('description', '')
        self.type = kwargs.get('type', self.TYPE_OTHER)
        
        # Status tracking
        self.status = kwargs.get('status', self.STATUS_NEW)
        self.priority = kwargs.get('priority', self.PRIORITY_MEDIUM)
        
        # Assignment
        self.assigned_to = kwargs.get('assigned_to')
        self.assigned_date = kwargs.get('assigned_date')
        
        # SLA tracking
        self.created_date = kwargs.get('created_date') or datetime.utcnow()
        self.acknowledged_date = kwargs.get('acknowledged_date')
        self.resolved_date = kwargs.get('resolved_date')
        self.closed_date = kwargs.get('closed_date')
        self.sla_deadline = kwargs.get('sla_deadline')
        
        # Responses
        self.initial_response = kwargs.get('initial_response', '')
        self.internal_notes = kwargs.get('internal_notes', '')
        self.customer_updates = kwargs.get('customer_updates', [])
        
        # Attachments
        self.attachments = kwargs.get('attachments', [])
        
        # Resolution details
        self.resolution = kwargs.get('resolution', '')
        self.resolution_date = kwargs.get('resolution_date')
        
        # Tags and categorization
        self.tags = kwargs.get('tags', [])
        self.category = kwargs.get('category')
        self.subcategory = kwargs.get('subcategory')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert complaint to dictionary for Firestore"""
        data = super().to_dict()
        
        data.update({
            'customer_id': self.customer_id,
            'subject': self.subject,
            'description': self.description,
            'type': self.type,
            'status': self.status,
            'priority': self.priority,
            'assigned_to': self.assigned_to,
            'assigned_date': self.assigned_date,
            'created_date': self.created_date,
            'acknowledged_date': self.acknowledged_date,
            'resolved_date': self.resolved_date,
            'closed_date': self.closed_date,
            'sla_deadline': self.sla_deadline,
            'initial_response': self.initial_response,
            'internal_notes': self.internal_notes,
            'customer_updates': self.customer_updates,
            'attachments': self.attachments,
            'resolution': self.resolution,
            'resolution_date': self.resolution_date,
            'tags': self.tags,
            'category': self.category,
            'subcategory': self.subcategory,
        })
        
        return data
    
    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]):
        """Create complaint from Firestore document"""
        return cls(**{**data, 'id': doc_id})
    
    def is_valid(self) -> bool:
        """Validate complaint data"""
        return bool(
            self.customer_id and
            self.subject and
            self.type in self.TYPES
        )
    
    def update_status(self, new_status: str):
        """Update complaint status and timestamps"""
        if new_status not in self.STATUSES:
            raise ValueError(f"Invalid status: {new_status}")
        
        now = datetime.utcnow()
        
        if new_status == self.STATUS_ACKNOWLEDGED and self.status == self.STATUS_NEW:
            self.acknowledged_date = now
        elif new_status == self.STATUS_RESOLVED:
            self.resolved_date = now
            self.resolution_date = now
        elif new_status == self.STATUS_CLOSED and self.status == self.STATUS_RESOLVED:
            self.closed_date = now
        
        self.status = new_status
        self.updated_at = now


