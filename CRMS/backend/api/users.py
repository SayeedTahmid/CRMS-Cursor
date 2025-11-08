# backend/api/users.py
from flask import Blueprint, request, jsonify
from .auth import require_auth, require_role, current_user
from .db import get_db

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

@users_bp.route("", methods=["GET"])
@require_auth
@require_role(["admin", "manager"])  # adjust to your role names
def list_users():
    db = get_db()
    tenant_id = current_user().get("tenant_id")
    users = []
    for doc in db.collection("users").where("tenant_id", "==", tenant_id).stream():
        d = doc.to_dict()
        users.append({"id": doc.id, "email": d.get("email"), "role": d.get("role"), "active": d.get("active", True)})
    return jsonify({"users": users})

@users_bp.route("/invite", methods=["POST"])
@require_auth
@require_role(["admin"])
def invite_user():
    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip().lower()
    role = body.get("role") or "viewer"
    if not email:
        return jsonify({"error": "email required"}), 400

    db = get_db()
    ref = db.collection("users").document()
    ref.set({
        "tenant_id": current_user().get("tenant_id"),
        "email": email,
        "role": role,
        "active": True,
        "invited_by": current_user().get("uid"),
        "created_at": db.CLIENT._now(),
    })
    # (Optional) send email via n8n webhook here
    return jsonify({"message": "Invitation recorded"})

@users_bp.route("/<user_id>/role", methods=["PUT"])
@require_auth
@require_role(["admin"])
def change_role(user_id):
    body = request.get_json(force=True) or {}
    role = body.get("role")
    if role not in {"tenant_admin","manager","sales_rep","support","viewer","admin"}:
        return jsonify({"error":"invalid role"}), 400
    db = get_db()
    ref = db.collection("users").document(user_id)
    if not ref.get().exists:
        return jsonify({"error":"Not found"}), 404
    ref.update({"role": role})
    return jsonify({"message":"Role updated"})

@users_bp.route("/<user_id>", methods=["DELETE"])
@require_auth
@require_role(["admin"])
def deactivate_user(user_id):
    db = get_db()
    ref = db.collection("users").document(user_id)
    if not ref.get().exists: 
        return jsonify({"error":"Not found"}), 404
    ref.update({"active": False})
    return jsonify({"message":"User deactivated"})
