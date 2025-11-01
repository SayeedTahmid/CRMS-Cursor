"""Base model with common functionality"""
from typing import Optional, Dict, Any
from datetime import datetime
from firebase_admin import firestore


class BaseModel:
    """Base model for all Firestore documents"""
    
    def __init__(self, **kwargs):
        """Initialize model from Firestore document data"""
        self.id = kwargs.get('id')
        self.created_at = kwargs.get('created_at') or datetime.utcnow()
        self.updated_at = kwargs.get('updated_at') or datetime.utcnow()
        self.created_by = kwargs.get('created_by')
        self.tenant_id = kwargs.get('tenant_id')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary for Firestore"""
        data = {
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }
        
        if self.created_by:
            data['created_by'] = self.created_by
        if self.tenant_id:
            data['tenant_id'] = self.tenant_id
            
        return data
    
    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]):
        """Create model instance from Firestore document data"""
        data['id'] = doc_id
        return cls(**data)
    
    def update_timestamp(self):
        """Update the updated_at timestamp"""
        self.updated_at = datetime.utcnow()


