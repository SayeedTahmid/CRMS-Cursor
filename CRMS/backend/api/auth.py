"""
Authentication API endpoints (compatible with frontend AuthContext)
"""
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from utils.firebase import verify_token, get_db, get_user_by_email, create_user
from models.user import User
from datetime import datetime
from services.user_services import UserService
from google.cloud import firestore

auth_bp = Blueprint("auth", __name__)


def _extract_role(user: dict) -> str:
    if not user:
        return ""
    return (user.get("role")
            or (user.get("claims") or {}).get("role")
            or "").lower()

def require_role(*allowed_roles):
    """
    Usage:
        @require_auth
        @require_role("admin")                       # one role
        @require_role("admin", "manager", "support") # any of these
    """
    allowed = {r.lower() for r in allowed_roles}

    def decorator(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            user = getattr(request, "user", {}) or {}
            role = _extract_role(user)
            if not role or role not in allowed:
                return jsonify({"error": "Forbidden: insufficient role"}), 403
            return fn(*args, **kwargs)
        return wrapped
    return decorator
# ==============================================================
# 🔒 Middleware: Require authentication
# ==============================================================
def require_auth(f):
    """Decorator to require Firebase ID token authentication and enrich request.user with role/tenant."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"authenticated": False, "error": "Authentication required"}), 401

        id_token = auth_header.split("Bearer ")[1]
        decoded_token = verify_token(id_token) or {}
        if not decoded_token:
            return jsonify({"authenticated": False, "error": "Invalid token"}), 401

        # 🔎 Enrich with role/tenant from users/{uid} for routes that depend on it
        try:
            uid = decoded_token.get("uid")
            if uid:
                db = get_db()
                snap = db.collection("users").document(uid).get()
                if snap.exists:
                    user_doc = snap.to_dict() or {}
                    # Prefer explicit doc values; keep any existing token values
                    decoded_token["role"] = user_doc.get("role") or decoded_token.get("role")
                    decoded_token["tenant_id"] = user_doc.get("tenant_id") or decoded_token.get("tenant_id")
        except Exception:
            # Don't block if enrichment fails; downstream can still work with decoded_token
            pass

        request.user = decoded_token
        return f(*args, **kwargs)

    return decorated_function



# ==============================================================
# ✅ Verify ID Token
# ==============================================================
@auth_bp.route("/verify", methods=["POST"])
def verify():
    """
    Verify Firebase ID token → ensure/normalize users/{uid} in Firestore
    and return the normalized user (PRD: tenant isolation + RBAC).
    """
    try:
        data = request.get_json() or {}
        id_token = data.get("idToken")
        if not id_token:
            return jsonify({"authenticated": False, "error": "ID token required"}), 400

        decoded_token = verify_token(id_token) 
        if not decoded_token:
            return jsonify({"authenticated": False, "error": "Invalid or expired token"}), 401

        # ✅ Upsert + normalize user document; returns the current user state
        user_service = UserService()
        user_doc = user_service.upsert_from_decoded_token(decoded_token)

        # Response mirrors what your frontend AuthContext expects
        return jsonify({
            "authenticated": True,
            "user": user_doc
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

        data = user.to_dict()
        data["created_at"]=firestore.SERVER_TIMESTAMP
        data["updated_at"] = firestore.SERVER_TIMESTAMP
        db.collection("users").document(firebase_user.uid).set(data)

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
        update_data["updated_at"] = firestore.SERVER_TIMESTAMP


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
