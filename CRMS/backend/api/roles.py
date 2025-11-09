# backend/api/roles.py
# Keep these EXACT strings in sync with your Firestore Rules & PRD
ADMIN       = "admin"
MANAGER     = "manager"
SALES_REP   = "sales_rep"
SUPPORT     = "support"
VIEWER      = "viewer"

ALL_ROLES = {ADMIN, MANAGER, SALES_REP, SUPPORT, VIEWER}
ADMINISH   = {ADMIN, MANAGER}             # convenience set for routes
SUPPORTISH = {ADMIN, MANAGER, SUPPORT}    # convenience set for routes
