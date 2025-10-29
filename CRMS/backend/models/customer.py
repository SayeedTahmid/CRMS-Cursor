"""Customer model"""
from typing import Optional, Dict, Any
from datetime import datetime
from models.base import BaseModel


class Customer(BaseModel):
    """Customer model for storing customer information"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = kwargs.get('name', '')
        self.email = kwargs.get('email')
        self.phone = kwargs.get('phone')
        self.company = kwargs.get('company')
        self.address = kwargs.get('address')
        self.city = kwargs.get('city')
        self.state = kwargs.get('state')
        self.country = kwargs.get('country', 'Bangladesh')
        self.postal_code = kwargs.get('postal_code')
        
        # Customer metadata
        self.industry = kwargs.get('industry')
        self.type = kwargs.get('type', 'customer')  # customer, prospect, vendor
        self.status = kwargs.get('status', 'active')  # active, inactive, archived
        self.tags = kwargs.get('tags', [])
        
        # Contact information
        self.secondary_phone = kwargs.get('secondary_phone')
        self.secondary_email = kwargs.get('secondary_email')
        self.website = kwargs.get('website')
        
        # Notes
        self.notes = kwargs.get('notes', '')
        self.last_contact_date = kwargs.get('last_contact_date')
        
        # Statistics
        self.total_orders = kwargs.get('total_orders', 0)
        self.total_value = kwargs.get('total_value', 0.0)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert customer to dictionary for Firestore"""
        data = super().to_dict()
        
        data.update({
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'company': self.company,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'postal_code': self.postal_code,
            'industry': self.industry,
            'type': self.type,
            'status': self.status,
            'tags': self.tags,
            'secondary_phone': self.secondary_phone,
            'secondary_email': self.secondary_email,
            'website': self.website,
            'notes': self.notes,
            'last_contact_date': self.last_contact_date,
            'total_orders': self.total_orders,
            'total_value': self.total_value,
        })
        
        return data
    
    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]):
        """Create customer from Firestore document"""
        return cls(**{**data, 'id': doc_id})
    
    def is_valid(self) -> bool:
        """Validate customer data"""
        return bool(self.name and (self.email or self.phone))


