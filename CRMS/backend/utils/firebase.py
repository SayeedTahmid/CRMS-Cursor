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
            _db = firestore.client()
            print("⚙️ Firebase already initialized — using existing app")
            return

        # Prefer local service account JSON file
        cred_path = os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json")

        if os.path.exists(cred_path):
            print(f"📁 Loading Firebase credentials from: {cred_path}")
            cred = credentials.Certificate(cred_path)
            project_id = cred.project_id
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

            print("📝 Loading Firebase credentials from environment variables")
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

        print("✅ Firebase Admin initialized successfully")
        print(f"📍 Project: {project_id}")

    except Exception as e:
        print(f"❌ Firebase initialization error: {e}")
        print("\n💡 Setup instructions:")
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
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
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
