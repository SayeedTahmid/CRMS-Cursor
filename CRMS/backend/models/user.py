"""User model for managing CRM users"""
from typing import Optional, Dict, Any
from datetime import datetime
from models.base import BaseModel


class User(BaseModel):
    """User model for CRM users"""
    
    # User roles
    ROLE_SUPER_ADMIN = 'super_admin'
    ROLE_TENANT_ADMIN = 'tenant_admin'
    ROLE_MANAGER = 'manager'
    ROLE_SALES_REP = 'sales_rep'
    ROLE_SUPPORT_AGENT = 'support_agent'
    ROLE_VIEWER = 'viewer'
    
    ROLES = [
        ROLE_SUPER_ADMIN,
        ROLE_TENANT_ADMIN,
        ROLE_MANAGER,
        ROLE_SALES_REP,
        ROLE_SUPPORT_AGENT,
        ROLE_VIEWER
    ]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.email = kwargs.get('email')
        self.display_name = kwargs.get('display_name')
        self.first_name = kwargs.get('first_name')
        self.last_name = kwargs.get('last_name')
        self.phone = kwargs.get('phone')
        
        # Role and permissions
        self.role = kwargs.get('role', self.ROLE_VIEWER)
        self.tenant_id = kwargs.get('tenant_id')
        
        # Firebase Auth UID
        self.firebase_uid = kwargs.get('firebase_uid')
        
        # Profile information
        self.department = kwargs.get('department')
        self.position = kwargs.get('position')
        self.avatar_url = kwargs.get('avatar_url')
        
        # Account status
        self.is_active = kwargs.get('is_active', True)
        self.is_verified = kwargs.get('is_verified', False)
        self.last_login = kwargs.get('last_login')
        
        # Preferences
        self.preferences = kwargs.get('preferences', {})
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary for Firestore"""
        data = super().to_dict()
        
        data.update({
            'email': self.email,
            'display_name': self.display_name,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'role': self.role,
            'firebase_uid': self.firebase_uid,
            'department': self.department,
            'position': self.position,
            'avatar_url': self.avatar_url,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'last_login': self.last_login,
            'preferences': self.preferences,
        })
        
        return data
    
    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]):
        """Create user from Firestore document"""
        return cls(**{**data, 'id': doc_id})
    
    def is_valid(self) -> bool:
        """Validate user data"""
        return bool(
            self.email and
            self.role in self.ROLES and
            self.tenant_id
        )
    
    def has_permission(self, resource: str, action: str) -> bool:
        """Check if user has permission for resource and action"""
        # Super admin has all permissions
        if self.role == self.ROLE_SUPER_ADMIN:
            return True
        
        # Define role permissions
        permissions = {
            self.ROLE_TENANT_ADMIN: {
                'customers': ['create', 'read', 'update', 'delete'],
                'logs': ['create', 'read', 'update', 'delete'],
                'complaints': ['create', 'read', 'update', 'delete', 'assign'],
                'users': ['create', 'read', 'update'],
            },
            self.ROLE_MANAGER: {
                'customers': ['create', 'read', 'update'],
                'logs': ['create', 'read', 'update', 'delete'],
                'complaints': ['create', 'read', 'update', 'assign'],
            },
            self.ROLE_SALES_REP: {
                'customers': ['create', 'read', 'update'],
                'logs': ['create', 'read', 'update'],
                'complaints': ['create', 'read'],
            },
            self.ROLE_SUPPORT_AGENT: {
                'customers': ['read', 'update'],
                'logs': ['create', 'read', 'update'],
                'complaints': ['create', 'read', 'update'],
            },
            self.ROLE_VIEWER: {
                'customers': ['read'],
                'logs': ['read'],
                'complaints': ['read'],
            },
        }
        
        role_perms = permissions.get(self.role, {})
        return action in role_perms.get(resource, [])


