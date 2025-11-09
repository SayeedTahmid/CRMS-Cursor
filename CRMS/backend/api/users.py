# backend/api/users.py
from flask import Blueprint, request, jsonify
from utils.firebase import get_db
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud import firestore
from firebase_admin import auth as fb_auth

from .auth import require_auth, require_role
from .helpers import current_user
from .roles import ADMIN, MANAGER, ALL_ROLES

users_bp = Blueprint("users", __name__)

def _tenant_of_request():
    u = current_user()
    return (u.get("tenant_id") or (u.get("claims") or {}).get("tenant_id") or "default")

@users_bp.route("", methods=["GET"])
@require_auth
@require_role(ADMIN, MANAGER)  # managers can view; admin can view
def list_users():
    """List users in the same tenant (minimal fields)."""
    db = get_db()
    tenant_id = _tenant_of_request()
    q = db.collection("users").where(filter=FieldFilter("tenant_id", "==", tenant_id))
    items = []
    for doc in q.stream():
        d = doc.to_dict() or {}
        items.append({
            "id": doc.id,
            "email": d.get("email"),
            "displayName": d.get("displayName") or d.get("name"),
            "role": (d.get("role") or "").lower(),
            "tenant_id": d.get("tenant_id"),
        })
    # sort by role then email
    items.sort(key=lambda x: (x.get("role") or "", x.get("email") or ""))
    return jsonify({"users": items, "total": len(items)}), 200

@users_bp.route("/<uid>/role", methods=["PUT"])
@require_auth
@require_role(ADMIN)  # only tenant admin changes roles
def set_user_role(uid):
    """
    Body: { "role": "manager" }
    Effect: updates Firebase custom claims & users/{uid}.role in same tenant.
    """
    db = get_db()
    body = request.get_json(force=True) or {}
    role = (body.get("role") or "").lower()

    if role not in ALL_ROLES:
        return jsonify({"error": f"Invalid role. Allowed: {sorted(ALL_ROLES)}"}), 400

    # tenant isolation: only operate within caller's tenant
    tenant_id = _tenant_of_request()
    user_ref = db.collection("users").document(uid)
    snap = user_ref.get()
    if not snap.exists:
        return jsonify({"error": "User not found"}), 404
    data = snap.to_dict() or {}
    if data.get("tenant_id") != tenant_id:
        return jsonify({"error": "Forbidden: cross-tenant update"}), 403

    # set Firebase custom claims (role & tenant_id for rule mirroring)
    fb_auth.set_custom_user_claims(uid, {"role": role, "tenant_id": tenant_id})

    # mirror to Firestore users doc (useful for listing)
    user_ref.update({
        "role": role,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })

    return jsonify({"message": "Role updated", "uid": uid, "role": role}), 200

@users_bp.route('/invite', methods=['POST'])
@require_auth
@require_role(ADMIN)  # or ADMIN, MANAGER
def invite_user():
    db = get_db()
    tenant_id = _tenant_of_request()
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    role = (data.get('role') or 'viewer').lower()
    if not email:
        return jsonify({'error':'Email required'}), 400
    if role not in ALL_ROLES:
        return jsonify({'error': f'Invalid role; allowed: {sorted(ALL_ROLES)}'}), 400

    # Create Firebase user if missing
    try:
        user = fb_auth.get_user_by_email(email)
    except:
        user = fb_auth.create_user(email=email)

    fb_auth.set_custom_user_claims(user.uid, {"role": role, "tenant_id": tenant_id})
    db.collection('users').document(user.uid).set({
        "uid": user.uid, "email": email, "email_lower": email,
        "role": role, "tenant_id": tenant_id,
        "is_active": True, "created_at": firestore.SERVER_TIMESTAMP
    }, merge=True)

    return jsonify({"message":"Invitation recorded","uid":user.uid,"role":role}), 201