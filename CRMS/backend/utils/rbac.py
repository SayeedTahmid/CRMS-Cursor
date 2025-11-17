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
    }
}

def allowed(role: str, resource: str, action: str) -> bool:
    if role not in ALL_ROLES:
        return False
    resource_rules = PERMISSIONS.get(resource, {})
    actions = resource_rules.get(role, [])
    return action in actions
