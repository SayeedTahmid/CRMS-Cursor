# backend/utils/firebase.py

"""
Firebase initialization and utility functions
Compatible with frontend + auth.py authentication logic
"""
import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
from typing import Optional, Dict

_db = None  # Global Firestore instance


def initialize_firebase():
    """Initialize Firebase Admin SDK safely (idempotent + .env support)"""
    global _db

    try:
        # Prevent re-initialization (common during hot reload / tests)
        if firebase_admin._apps:
            try:
                _db = firestore.client()
                print("Firebase already initialized - using existing app")
                return
            except Exception as e:
                error_str = str(e)
                if "invalid_grant" in error_str or "Invalid JWT Signature" in error_str:
                    print("⚠️  WARNING: Existing Firebase credentials appear invalid!")
                    print("💡 Clearing app and re-initializing...")
                    # Clear the invalid app
                    firebase_admin._apps.clear()
                    firebase_admin._default_app = None
                    _db = None
                else:
                    print(f"Error getting existing Firestore client: {e}")
                # Continue with re-initialization

        # Prefer local service account JSON file
        cred_path = os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json")

        if os.path.exists(cred_path):
            print(f"Loading Firebase credentials from: {cred_path}")
            try:
                cred = credentials.Certificate(cred_path)
                project_id = cred.project_id
                # Validate the credentials by checking project_id
                if not project_id:
                    raise ValueError("Service account key missing project_id")
            except Exception as cred_error:
                error_str = str(cred_error)
                if "invalid_grant" in error_str or "Invalid JWT" in error_str:
                    print(f"❌ ERROR: Service account key file is invalid or expired!")
                    print(f"\n💡 SOLUTION: Re-download the service account key")
                    print(f"   1. Go to: https://console.firebase.google.com/project/next-gen-crm-system/settings/serviceaccounts/adminsdk")
                    print(f"   2. Click 'Generate new private key'")
                    print(f"   3. Replace: {cred_path}")
                    print(f"   4. Restart the backend server")
                raise ValueError(f"Invalid service account key: {error_str}")
        else:
            # Fallback: environment-based credentials
            project_id = os.getenv("FIREBASE_PROJECT_ID")
            private_key = os.getenv("FIREBASE_PRIVATE_KEY")
            client_email = os.getenv("FIREBASE_CLIENT_EMAIL")

            if not all([project_id, private_key, client_email]):
                raise ValueError(
                    "Firebase credentials missing. "
                    "Provide serviceAccountKey.json or set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL."
                )

            print("Loading Firebase credentials from environment variables")
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": project_id,
                "private_key": private_key.replace("\\n", "\n"),  # ✅ Proper newline replacement
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token",
            })

        # Initialize Firebase app
        firebase_admin.initialize_app(cred, {"projectId": project_id or "next-gen-crm-system"})

        # Initialize Firestore client
        _db = firestore.client()

        print("Firebase Admin initialized successfully")
        print(f"Project: {project_id}")
        print("⚠️  Note: Service account key will be validated on first Firestore operation")

    except Exception as e:
        error_str = str(e)
        if "invalid_grant" in error_str or "Invalid JWT" in error_str:
            print(f"\n❌ CRITICAL: Firebase service account key is INVALID or EXPIRED")
            print(f"\n💡 IMMEDIATE ACTION REQUIRED:")
            print(f"   1. Go to Firebase Console: https://console.firebase.google.com/project/next-gen-crm-system/settings/serviceaccounts/adminsdk")
            print(f"   2. Click 'Generate new private key'")
            print(f"   3. Save the file as: CRMS/backend/serviceAccountKey.json")
            print(f"   4. Restart this server")
        else:
            print(f"\nFirebase initialization error: {e}")
            print("\nSetup instructions:")
            print("1. Download service account key from Firebase Console")
            print("2. Save as backend/serviceAccountKey.json")
            print("3. Or set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL in .env")
        raise


def get_db():
    """Return Firestore instance (requires initialize_firebase() first)"""
    if _db is None:
        raise RuntimeError("Firebase not initialized. Call initialize_firebase() before database access.")
    return _db


def verify_token(id_token: str) -> Optional[Dict]:
    """Verify a Firebase ID token and return decoded claims"""
    try:
        decoded_token = auth.verify_id_token(id_token, check_revoked=False)
        return decoded_token
    except ValueError as e:
        error_str = str(e)
        if "Token used too early" in error_str or "Clock skew" in error_str:
            print(f"⚠️ Token verification error: Clock synchronization issue")
            print(f"💡 Solution: Sync your computer's clock with internet time")
            print(f"   Windows: Settings > Time & Language > Sync now")
            print(f"   The error details: {error_str}")
        else:
            print(f"⚠️ Token verification error: {error_str}")
        return None
    except Exception as e:
        print(f"⚠️ Token verification error: {e}")
        return None


def get_user_by_email(email: str):
    """Fetch Firebase user by email"""
    try:
        return auth.get_user_by_email(email)
    except Exception as e:
        print(f"⚠️ Get user error: {e}")
        return None


def create_user(email: str, password: str, display_name: str = None):
    """Create Firebase Auth user"""
    try:
        user = auth.create_user(
            email=email,
            password=password,
            display_name=display_name or email
        )
        return user
    except Exception as e:
        print(f"⚠️ Create user error: {e}")
        return None


def delete_user(uid: str) -> bool:
    """Delete Firebase Auth user by UID"""
    try:
        auth.delete_user(uid)
        return True
    except Exception as e:
        print(f"⚠️ Delete user error: {e}")
        return False
