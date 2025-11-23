# backend/utils/rbac.py
from typing import Dict, List

# Role constants (aligns with PRD)
SUPER_ADMIN = "SUPER_ADMIN"
TENANT_ADMIN = "TENANT_ADMIN"
MANAGER = "MANAGER"
SALES_REP = "SALES_REP"
SUPPORT = "SUPPORT"
VIEWER = "VIEWER"

ALL_ROLES = {
    SUPER_ADMIN, TENANT_ADMIN, MANAGER, SALES_REP, SUPPORT, VIEWER
}

# Permission matrix (module/action). PRD: module-level + action-level + data-level. :contentReference[oaicite:4]{index=4}
# NOTE: Data-level "own" is enforced in routes using created_by == uid.
PERMISSIONS: Dict[str, Dict[str, List[str]]] = {
    "customers": {
        SUPER_ADMIN: ["create", "read", "update", "delete"],
        TENANT_ADMIN: ["create", "read", "update", "delete"],
        MANAGER: ["create", "read", "update", "delete"],
        SALES_REP: ["create", "read", "update"],   # own-only enforcement in routes
        SUPPORT: ["read"],
        VIEWER: ["read"],
    },
    "logs": {
        SUPER_ADMIN: ["create", "read", "update", "delete"],
        TENANT_ADMIN: ["create", "read", "update", "delete"],
        MANAGER: ["create", "read", "update", "delete"],
        SALES_REP: ["create", "read", "update"],   # own-only enforcement in routes
        SUPPORT: ["create", "read", "update"],
        VIEWER: ["read"],
    },
    "complaints": {
        SUPER_ADMIN: ["create", "read", "update", "delete"],
        TENANT_ADMIN: ["create", "read", "update", "delete"],
        MANAGER: ["create", "read", "update", "delete"],
        SALES_REP: ["create", "read", "update"],   # own-only enforcement in routes
        SUPPORT: ["create", "read", "update"],
        VIEWER: ["read"],
    },
    "users": {
        SUPER_ADMIN: ["manage_users"],
        TENANT_ADMIN: ["manage_users"],
        MANAGER: [],
        SALES_REP: [],
        SUPPORT: [],
        VIEWER: [],
    },
    "metrics": {
        SUPER_ADMIN: ["read"],
        TENANT_ADMIN: ["read"],
        MANAGER: ["read"],
        SALES_REP: ["read"],
        SUPPORT: ["read"],
        VIEWER: ["read"],
    },
    "telegram": {
        SUPER_ADMIN: ["create", "read", "update", "delete"],
        TENANT_ADMIN: ["create", "read", "update", "delete"],
        MANAGER: ["read"],
        SALES_REP: ["read"],
        SUPPORT: ["read"],
        VIEWER: ["read"],
    }
}

def normalize_role(role: str) -> str:
    """
    Normalize role string to match RBAC constants.
    Handles various formats: lowercase, uppercase, with/without underscores.
    """
    if not role:
        return VIEWER
    
    role_upper = role.upper().strip()
    
    # Map common variations to standard roles
    role_mapping = {
        "ADMIN": TENANT_ADMIN,  # "admin" -> TENANT_ADMIN
        "TENANT_ADMIN": TENANT_ADMIN,
        "SUPER_ADMIN": SUPER_ADMIN,
        "MANAGER": MANAGER,
        "SALES_REP": SALES_REP,
        "SALESREP": SALES_REP,  # Handle without underscore
        "SUPPORT": SUPPORT,
        "SUPPORT_AGENT": SUPPORT,  # Map support_agent to SUPPORT
        "VIEWER": VIEWER,
    }
    
    # Try direct match first
    if role_upper in role_mapping:
        return role_mapping[role_upper]
    
    # Try to match by prefix or common patterns
    if "ADMIN" in role_upper:
        if "SUPER" in role_upper:
            return SUPER_ADMIN
        return TENANT_ADMIN
    if "SUPPORT" in role_upper:
        return SUPPORT
    if "SALES" in role_upper:
        return SALES_REP
    
    # Default to VIEWER if no match
    return VIEWER

def allowed(role: str, resource: str, action: str) -> bool:
    # Normalize the role first
    normalized_role = normalize_role(role)
    
    if normalized_role not in ALL_ROLES:
        return False
    resource_rules = PERMISSIONS.get(resource, {})
    actions = resource_rules.get(normalized_role, [])
    return action in actions
