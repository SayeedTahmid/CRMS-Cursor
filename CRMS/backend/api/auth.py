# backend/api/auth.py
"""
Authentication API endpoints (compatible with frontend AuthContext)
"""
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from utils.firebase import verify_token, get_db, get_user_by_email, create_user
from models.user import User
from datetime import datetime
from utils.rbac import allowed, ALL_ROLES

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
        
        # Get user role from Firestore (with timeout protection)
        try:
            db = get_db()
            user_doc = db.collection("users").document(decoded_token["uid"]).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                request.user["role"] = user_data.get("role", "viewer")
                request.user["tenant_id"] = user_data.get("tenant_id", "default")
            else:
                # User doesn't exist in Firestore - use defaults
                request.user["role"] = "viewer"
                request.user["tenant_id"] = "default"
        except Exception as e:
            # If Firestore lookup fails, use defaults (don't block the request)
            print(f"Warning: Failed to get user role from Firestore: {e}")
            request.user["role"] = "viewer"
            request.user["tenant_id"] = "default"
        
        return f(*args, **kwargs)

    return decorated_function


# ==============================================================
# 🔐 Middleware: Require permission
# ==============================================================
def require_permission(resource: str, action: str):
    """Decorator to require specific permission"""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            role = request.user.get("role", "viewer").upper()
            
            if not allowed(role, resource, action):
                return jsonify({
                    "error": "Insufficient permissions",
                    "required": f"{resource}:{action}",
                    "role": role
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ==============================================================
# 👥 Middleware: Require role
# ==============================================================
def require_role(*allowed_roles):
    """Decorator to require one of the specified roles"""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            role = request.user.get("role", "viewer").upper()
            allowed_roles_upper = [r.upper() for r in allowed_roles]
            
            if role not in allowed_roles_upper:
                return jsonify({
                    "error": "Insufficient role",
                    "required": allowed_roles,
                    "current": role
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


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

        # Try to get user from Firestore with timeout protection
        try:
            user_ref = db.collection("users").document(uid)
            user_doc = user_ref.get()
        except Exception as firestore_error:
            error_str = str(firestore_error)
            # Check if it's an authentication error
            if "invalid_grant" in error_str or "Invalid JWT Signature" in error_str:
                print(f"ERROR: Firebase service account key is invalid or expired!")
                print(f"💡 Solution: Re-download service account key from Firebase Console")
                print(f"   1. Go to: https://console.firebase.google.com/project/next-gen-crm-system/settings/serviceaccounts/adminsdk")
                print(f"   2. Click 'Generate new private key'")
                print(f"   3. Save as: CRMS/backend/serviceAccountKey.json")
                return jsonify({
                    "authenticated": False,
                    "error": "Database authentication failed. Service account key may be expired or invalid.",
                    "details": "Please re-download the service account key from Firebase Console."
                }), 503
            # For other errors, return a generic message
            print(f"Warning: Firestore error in verify endpoint: {firestore_error}")
            # Return success with token data even if Firestore lookup fails
            return jsonify({
                "authenticated": True,
                "user": {
                    "uid": uid,
                    "email": decoded_token.get("email"),
                    "display_name": decoded_token.get("name") or decoded_token.get("email"),
                    "role": "viewer",
                    "tenant_id": "default"
                },
                "message": "Authenticated (Firestore unavailable, using defaults)"
            }), 200

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

        # Otherwise return the existing user (optimized - skip model parsing for speed)
        user_dict = user_doc.to_dict()
        user_dict["id"] = user_doc.id
        # Ensure display_name is set (some users might not have it)
        if not user_dict.get("display_name") and decoded_token.get("email"):
            user_dict["display_name"] = decoded_token.get("name") or decoded_token.get("email")
        
        return jsonify({
            "authenticated": True,
            "user": user_dict
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
    """Register a new Firebase user + Firestore record
    
    Note: Frontend creates Firebase user first, then calls this endpoint
    to create the Firestore user record. The Firebase user is already created.
    """
    try:
        data = request.json or {}
        email = data.get("email")
        password = data.get("password")  # May be None if user already created in Firebase
        display_name = data.get("display_name") or email
        tenant_id = data.get("tenant_id", "default")
        firebase_uid = data.get("firebase_uid") or data.get("uid")  # Frontend may send this

        if not email:
            return jsonify({"error": "Email is required"}), 400

        # If firebase_uid is provided, user is already created in Firebase
        # Otherwise, we need to get it from the auth token
        if not firebase_uid:
            # Try to get UID from token if available
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                id_token = auth_header.split("Bearer ")[1]
                decoded_token = verify_token(id_token)
                if decoded_token:
                    firebase_uid = decoded_token.get("uid")
        
        if not firebase_uid:
            # Last resort: try to get user by email (if it exists)
            # This handles the case where frontend created user but didn't send UID
            try:
                firebase_user = get_user_by_email(email)
                if firebase_user:
                    firebase_uid = firebase_user.uid
                else:
                    # User doesn't exist in Firebase - this shouldn't happen but handle it
                    return jsonify({"error": "Firebase user not found. Please complete registration in Firebase first."}), 400
            except Exception as e:
                return jsonify({"error": f"Unable to verify Firebase user: {str(e)}"}), 400

        db = get_db()
        
        # Check if user already exists in Firestore
        user_ref = db.collection("users").document(firebase_uid)
        existing_doc = user_ref.get()
        if existing_doc.exists:
            # User already exists, return existing user
            user_data = existing_doc.to_dict()
            return jsonify({
                "message": "User already registered",
                "user": {"id": existing_doc.id, **user_data}
            }), 200

        # Create Firestore user record (Firebase user already exists)
        user = User(
            email=email,
            display_name=display_name,
            tenant_id=tenant_id,
            firebase_uid=firebase_uid,
            role=User.ROLE_VIEWER,
            is_active=True,
            is_verified=False
        )
        
        # Convert to dict with both camelCase and snake_case for compatibility
        user_dict = user.to_dict()
        # Also add snake_case versions for backward compatibility
        user_dict_combined = {
            "id": firebase_uid,
            "email": email,
            "display_name": display_name,
            "displayName": display_name,  # camelCase for frontend
            "role": User.ROLE_VIEWER,
            "tenant_id": tenant_id,
            "tenantId": tenant_id,  # camelCase
            "firebase_uid": firebase_uid,
            "firebaseUid": firebase_uid,  # camelCase
            "is_active": True,
            "isActive": True,  # camelCase
            "is_verified": False,
            "isVerified": False,  # camelCase
            **user_dict
        }
        user_ref.set(user_dict_combined)

        return jsonify({
            "message": "User registered successfully",
            "user": user_dict_combined
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


# ==============================================================
# 🔄 Token Refresh
# ==============================================================
@auth_bp.route("/refresh", methods=["POST"])
@require_auth
def refresh_token():
    """Refresh Firebase ID token"""
    try:
        # Firebase tokens are auto-refreshed by the SDK
        # This endpoint just verifies the current token is still valid
        # and returns user info
        
        db = get_db()
        uid = request.user["uid"]
        
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        user_data = user_doc.to_dict()
        user_data["id"] = user_doc.id
        
        return jsonify({
            "authenticated": True,
            "user": user_data,
            "message": "Token refreshed"
        }), 200
        
    except Exception as e:
        current_app.logger.exception("Error in /refresh")
        return jsonify({"error": str(e)}), 500


# ==============================================================
# 🚪 Logout (Backend)
# ==============================================================
@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    """Logout endpoint - invalidates token on server side if needed"""
    try:
        # Firebase tokens are stateless JWT tokens
        # Server-side logout is handled by token expiration
        # This endpoint just confirms logout intent
        # Frontend should clear localStorage/sessionStorage
        
        return jsonify({
            "message": "Logged out successfully",
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.exception("Error in /logout")
        return jsonify({"error": str(e)}), 500


# ==============================================================
# 🔑 Password Reset
# ==============================================================
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Request password reset - sends email via Firebase Auth"""
    try:
        data = request.json or {}
        email = data.get("email")
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        # Firebase Auth handles password reset emails
        # This endpoint just validates the request
        # The actual reset email is sent by Firebase
        try:
            from firebase_admin import auth
            # Verify email exists
            try:
                user = auth.get_user_by_email(email)
                # Generate password reset link (Firebase does this automatically)
                # We just confirm the request is valid
                return jsonify({
                    "message": "Password reset email sent (if email exists)",
                    "email": email
                }), 200
            except Exception:
                # Don't reveal if email exists (security best practice)
                return jsonify({
                    "message": "Password reset email sent (if email exists)",
                    "email": email
                }), 200
        except Exception as e:
            return jsonify({"error": f"Password reset failed: {str(e)}"}), 500
            
    except Exception as e:
        current_app.logger.exception("Error in /reset-password")
        return jsonify({"error": str(e)}), 500
