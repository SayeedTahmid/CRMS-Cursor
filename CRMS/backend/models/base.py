"""Base model with common functionality"""
from typing import Optional, Dict, Any
from datetime import datetime
from firebase_admin import firestore


class BaseModel:
    """Base model for all Firestore documents"""
    
    def __init__(self, **kwargs):
        """Initialize model from Firestore document data"""
        self.id: Optional[str] = kwargs.get('id')
        self.created_at: datetime = kwargs.get('created_at') or datetime.utcnow()
        self.updated_at: datetime = kwargs.get('updated_at') or datetime.utcnow()
        self.created_by: Optional[str] = kwargs.get('created_by')
        self.tenant_id: Optional[str] = kwargs.get('tenant_id')

    def to_dict(self, include_id: bool = False) -> Dict[str, Any]:
        """Convert model to dictionary for Firestore"""
        data: Dict[str, Any] = {
            'created_at': self.created_at or datetime.utcnow(),
            'updated_at': self.updated_at or datetime.utcnow(),
        }

        if self.created_by:
            data['created_by'] = self.created_by
        if self.tenant_id:
            data['tenant_id'] = self.tenant_id
        if include_id and self.id:
            data['id'] = self.id

        return data

    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]):
        """Create model instance from Firestore document data"""
        return cls(**{**data, 'id': doc_id})

    
    def update_timestamps(self, is_new=False):
        """Automatically manage created_at and updated_at fields"""
        from datetime import datetime
        now = datetime.utcnow()
        if is_new and not getattr(self, "created_at", None):
            self.created_at = now
        self.updated_at = now
        return self


   
