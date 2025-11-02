"""
Authentication API endpoints (compatible with frontend AuthContext)
"""
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from utils.firebase import verify_token, get_db, get_user_by_email, create_user
from models.user import User
from datetime import datetime

auth_bp = Blueprint("auth", __name__)


# ==============================================================
# 🔒 Middleware: Require authentication
# ==============================================================
def require_auth(f):
    """Decorator to require Firebase ID token authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"authenticated": False, "error": "Authentication required"}), 401

        id_token = auth_header.split("Bearer ")[1]
        decoded_token = verify_token(id_token)
        if not decoded_token:
            return jsonify({"authenticated": False, "error": "Invalid token"}), 401

        request.user = decoded_token
        return f(*args, **kwargs)

    return decorated_function


# ==============================================================
# ✅ Verify ID Token
# ==============================================================
@auth_bp.route("/verify", methods=["POST"])
def verify():
    """
    Verify Firebase ID token → return authenticated user info.
    If Firestore user is missing, create minimal placeholder.
    """
    try:
        data = request.get_json() or {}
        id_token = data.get("idToken")
        if not id_token:
            return jsonify({"authenticated": False, "error": "ID token required"}), 400

        decoded_token = verify_token(id_token)
        if not decoded_token:
            return jsonify({"authenticated": False, "error": "Invalid or expired token"}), 401

        db = get_db()
        uid = decoded_token.get("uid")
        if not uid:
            return jsonify({"authenticated": False, "error": "Token missing UID"}), 401

        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()

        # If user doesn’t exist → create minimal placeholder profile
        if not user_doc.exists:
            minimal_user = {
                "firebase_uid": uid,
                "email": decoded_token.get("email"),
                "display_name": decoded_token.get("name") or decoded_token.get("email"),
                "role": "viewer",
                "tenant_id": "default",
                "is_active": True,
                "is_verified": True,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "created_by_source": "auto_verify"
            }
            user_ref.set(minimal_user)
            return jsonify({
                "authenticated": True,
                "user": minimal_user,
                "message": "User auto-created in Firestore"
            }), 201

        # Otherwise return the existing user
        user_data = User.from_dict(user_doc.id, user_doc.to_dict())
        return jsonify({
            "authenticated": True,
            "user": user_data.to_dict()
        }), 200

    except Exception as e:
        current_app.logger.exception("Error in /verify")
        return jsonify({"authenticated": False, "error": str(e)}), 500

# ==============================================================
# 🩺 Health / Status Check
# ==============================================================
@auth_bp.route("/status", methods=["GET"])
def auth_status():
    """Simple endpoint to verify Auth API connectivity"""
    try:
        return jsonify({
            "status": "ok",
            "service": "auth",
            "message": "Authentication service running",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

# ==============================================================
# 🧩 Register New User
# ==============================================================
@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new Firebase user + Firestore record"""
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")
        display_name = data.get("display_name") or email
        tenant_id = data.get("tenant_id", "default")

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        # Create Firebase user
        firebase_user = create_user(email, password, display_name)
        if not firebase_user:
            return jsonify({"error": "Failed to create Firebase user"}), 400

        db = get_db()
        user = User(
            email=email,
            display_name=display_name,
            tenant_id=tenant_id,
            firebase_uid=firebase_user.uid,
            role=User.ROLE_VIEWER,
            is_active=True,
            is_verified=False
        )
        db.collection("users").document(firebase_user.uid).set(user.to_dict())

        return jsonify({
            "message": "User registered successfully",
            "user": user.to_dict()
        }), 201

    except Exception as e:
        current_app.logger.exception("Error in /register")
        return jsonify({"error": str(e)}), 500


# ==============================================================
# 👤 Get Current Authenticated User
# ==============================================================
@auth_bp.route("/user", methods=["GET"])
@require_auth
def get_current_user():
    """Return authenticated user's profile"""
    try:
        db = get_db()
        uid = request.user["uid"]

        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404

        user_data = User.from_dict(user_doc.id, user_doc.to_dict())
        return jsonify({"user": user_data.to_dict()}), 200

    except Exception as e:
        current_app.logger.exception("Error in /user [GET]")
        return jsonify({"error": str(e)}), 500


# ==============================================================
# ✏️ Update Authenticated User
# ==============================================================
@auth_bp.route("/user", methods=["PUT"])
@require_auth
def update_user():
    """Update the authenticated user's profile fields"""
    try:
        db = get_db()
        uid = request.user["uid"]
        data = request.json or {}

        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404

        allowed_fields = [
            "display_name", "first_name", "last_name",
            "phone", "department", "position", "preferences"
        ]
        update_data = {f: data[f] for f in allowed_fields if f in data}
        update_data["updated_at"] = datetime.utcnow().isoformat()

        user_ref.update(update_data)
        updated_doc = user_ref.get()
        user_data = User.from_dict(updated_doc.id, updated_doc.to_dict())

        return jsonify({
            "message": "User updated successfully",
            "user": user_data.to_dict()
        }), 200

    except Exception as e:
        current_app.logger.exception("Error in /user [PUT]")
        return jsonify({"error": str(e)}), 500
