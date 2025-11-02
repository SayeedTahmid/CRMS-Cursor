"""User model for managing CRM users"""
from typing import Optional, Dict, Any
from datetime import datetime
from models.base import BaseModel


class User(BaseModel):
    """
    Represents a CRM system user with role-based permissions.
    Compatible with Firebase Auth + Firestore schema.
    """

    # --- Role definitions ---
    ROLE_SUPER_ADMIN = "super_admin"
    ROLE_TENANT_ADMIN = "tenant_admin"
    ROLE_MANAGER = "manager"
    ROLE_SALES_REP = "sales_rep"
    ROLE_SUPPORT_AGENT = "support_agent"
    ROLE_VIEWER = "viewer"

    ROLES = [
        ROLE_SUPER_ADMIN,
        ROLE_TENANT_ADMIN,
        ROLE_MANAGER,
        ROLE_SALES_REP,
        ROLE_SUPPORT_AGENT,
        ROLE_VIEWER,
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # Core identity
        self.email: Optional[str] = kwargs.get("email")
        self.display_name: Optional[str] = kwargs.get("display_name")
        self.first_name: Optional[str] = kwargs.get("first_name")
        self.last_name: Optional[str] = kwargs.get("last_name")
        self.phone: Optional[str] = kwargs.get("phone")

        # Role and tenancy
        self.role: str = kwargs.get("role", self.ROLE_VIEWER)
        self.tenant_id: Optional[str] = kwargs.get("tenant_id", "default")
        self.firebase_uid: Optional[str] = kwargs.get("firebase_uid")

        # Profile info
        self.department: Optional[str] = kwargs.get("department")
        self.position: Optional[str] = kwargs.get("position")
        self.avatar_url: Optional[str] = kwargs.get("avatar_url")

        # Account status
        self.is_active: bool = kwargs.get("is_active", True)
        self.is_verified: bool = kwargs.get("is_verified", False)
        self.last_login: Optional[str] = kwargs.get("last_login")

        # Preferences and timestamps
        self.preferences: Dict[str, Any] = kwargs.get("preferences", {}) or {}
        self.created_at: str = kwargs.get("created_at", datetime.utcnow().isoformat())
        self.updated_at: str = kwargs.get("updated_at", datetime.utcnow().isoformat())

    # ----------------------------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        """Convert user instance to Firestore-compatible dictionary"""
        data = super().to_dict()
        data.update({
            "email": self.email,
            "display_name": self.display_name,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "phone": self.phone,
            "role": self.role,
            "tenant_id": self.tenant_id,
            "firebase_uid": self.firebase_uid,
            "department": self.department,
            "position": self.position,
            "avatar_url": self.avatar_url,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "last_login": self.last_login,
            "preferences": self.preferences,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        })
        return data

    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]) -> "User":
        """Create a User instance from Firestore document"""
        if not data:
            data = {}
        return cls(**{**data, "id": doc_id})

    # ----------------------------------------------------------------------

    def is_valid(self) -> bool:
        """Basic validation check for required fields"""
        return bool(self.email and self.role in self.ROLES and self.tenant_id)

    def has_permission(self, resource: str, action: str) -> bool:
        """Check if user has permission to perform an action on a resource"""
        if self.role == self.ROLE_SUPER_ADMIN:
            return True

        permissions = {
            self.ROLE_TENANT_ADMIN: {
                "customers": ["create", "read", "update", "delete"],
                "logs": ["create", "read", "update", "delete"],
                "complaints": ["create", "read", "update", "delete", "assign"],
                "users": ["create", "read", "update"],
            },
            self.ROLE_MANAGER: {
                "customers": ["create", "read", "update"],
                "logs": ["create", "read", "update", "delete"],
                "complaints": ["create", "read", "update", "assign"],
            },
            self.ROLE_SALES_REP: {
                "customers": ["create", "read", "update"],
                "logs": ["create", "read", "update"],
                "complaints": ["create", "read"],
            },
            self.ROLE_SUPPORT_AGENT: {
                "customers": ["read", "update"],
                "logs": ["create", "read", "update"],
                "complaints": ["create", "read", "update"],
            },
            self.ROLE_VIEWER: {
                "customers": ["read"],
                "logs": ["read"],
                "complaints": ["read"],
            },
        }

        role_perms = permissions.get(self.role, {})
        return action in role_perms.get(resource, [])
