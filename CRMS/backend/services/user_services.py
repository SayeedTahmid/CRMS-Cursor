"""User service for Firestore operations (tenant-aware, RBAC helpers)"""
from typing import Optional, Dict, Any, List

# Use the stable imports we standardize on across the project
from google.cloud import firestore
from google.cloud.firestore_v1 import FieldFilter

from models.user import User
from utils.firestore_service import FirestoreService


class UserService(FirestoreService):
    """
    Wraps Firestore 'users' collection with helpers that align to the PRD:
    - tenant isolation (get tenant for uid, list by tenant)
    - RBAC helpers (set/get role)
    - upsert from decoded token (so endpoints can tolerate missing user docs)
    """

    def __init__(self):
        super().__init__("users")  # collection: users

    # ---------- Basic CRUD (compatible with your existing code) ----------
    def create_user(self, user: User, use_uid_as_doc_id: bool = True) -> str:
        """
        Create a user document. If use_uid_as_doc_id=True and user.id/uid exists,
        the Firestore document id will be the user's uid for O(1) lookups.
        """
        data = user.to_dict() if hasattr(user, "to_dict") else dict(user)
        uid = data.get("id") or data.get("uid")
        # timestamps
        data.setdefault("created_at", firestore.SERVER_TIMESTAMP)
        data["updated_at"] = firestore.SERVER_TIMESTAMP

        if use_uid_as_doc_id and uid:
            self.collection.document(uid).set(data, merge=True)
            return uid
        return self.create(data)  # falls back to FirestoreService.create

    def get_user(self, user_id: str) -> Optional[User]:
        return self.get(user_id, User)

    def list_users(self) -> List[User]:
        return self.list_all(User)

    def update_user(self, user_id: str, updates: Dict[str, Any]):
        updates = dict(updates or {})
        updates["updated_at"] = firestore.SERVER_TIMESTAMP
        return self.update(user_id, updates)

    def delete_user(self, user_id: str):
        return self.delete(user_id)

    # ---------- Helpful queries ----------
    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        email = (email or "").strip().lower()
        if not email:
            return None
        q = self.collection.where(filter=FieldFilter("email_lower", "==", email))
        for doc in q.stream():
            return {"id": doc.id, **doc.to_dict()}
        return None

    def list_by_tenant(self, tenant_id: str) -> List[Dict[str, Any]]:
        q = self.collection.where(filter=FieldFilter("tenant_id", "==", tenant_id))
        rows: List[Dict[str, Any]] = []
        for doc in q.stream():
            rows.append({"id": doc.id, **doc.to_dict()})
        return rows

    # ---------- Tenant & Role helpers (RBAC) ----------
    def get_tenant_for_uid(self, uid: str) -> Optional[str]:
        """
        Prefer doc id == uid; otherwise fall back to a query.
        """
        snap = self.collection.document(uid).get()
        if snap.exists:
            return (snap.to_dict() or {}).get("tenant_id")
        # fallback (rare)
        q = self.collection.where(filter=FieldFilter("uid", "==", uid))
        for doc in q.stream():
            return (doc.to_dict() or {}).get("tenant_id")
        return None

    def get_role_for_uid(self, uid: str) -> Optional[str]:
        snap = self.collection.document(uid).get()
        if snap.exists:
            return (snap.to_dict() or {}).get("role")
        q = self.collection.where(filter=FieldFilter("uid", "==", uid))
        for doc in q.stream():
            return (doc.to_dict() or {}).get("role")
        return None

    def set_role(self, uid: str, role: str):
        role = (role or "").strip().lower()
        if not role:
            raise ValueError("role is required")
        self.collection.document(uid).set({
            "role": role,
            "updated_at": firestore.SERVER_TIMESTAMP
        }, merge=True)

    def set_tenant(self, uid: str, tenant_id: str):
        tenant_id = (tenant_id or "").strip()
        if not tenant_id:
            raise ValueError("tenant_id is required")
        self.collection.document(uid).set({
            "tenant_id": tenant_id,
            "updated_at": firestore.SERVER_TIMESTAMP
        }, merge=True)

    # ---------- Token bootstrap ----------
    def upsert_from_decoded_token(self, decoded: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ensure a 'users/{uid}' doc exists & is normalized whenever a user hits /auth/verify.
        This allows endpoints to work even if the admin hasn't manually created the doc.
        """
        uid = decoded.get("uid")
        if not uid:
            raise ValueError("decoded token missing uid")

        # Claims from token (if set via custom claims)
        role_claim = (decoded.get("role") or (decoded.get("claims") or {}).get("role") or "").lower().strip()
        role = role_claim or User.ROLE_VIEWER

        tenant_claim = decoded.get("tenant_id") or (decoded.get("claims") or {}).get("tenant_id")
        tenant_id = (tenant_claim or "default").strip()

        # Identity basics
        email = (decoded.get("email") or "").strip().lower()
        display_name = decoded.get("name") or decoded.get("display_name") or email

        # Normalize fields we like to keep
        payload = {
            "uid": uid,
            "email": email or None,
            "email_lower": email or None,
            "display_name": display_name or None,
            "role": role,
            "tenant_id": tenant_id,
            # Optional mirrors
            "provider": (decoded.get("firebase", {}) or {}).get("sign_in_provider"),
            "photo_url": decoded.get("picture") or None,
            # timestamps
            "updated_at": firestore.SERVER_TIMESTAMP,
        }

        # Preserve created_at if exists; otherwise set it now
        ref = self.collection.document(uid)
        snap = ref.get()
        if not snap.exists or not (snap.to_dict() or {}).get("created_at"):
            payload["created_at"] = firestore.SERVER_TIMESTAMP

        # Upsert to doc id == uid so lookups are O(1)
        ref.set({k: v for k, v in payload.items() if v is not None}, merge=True)

        # Return the current state (include id)
        snap = ref.get()
        return {"id": snap.id, **(snap.to_dict() or {})}
