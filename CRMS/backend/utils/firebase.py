"""Firebase initialization and utilities"""
import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
from typing import Optional, Dict

# Global DB instance
_db = None


def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    global _db
    
    try:
        # Try to use service account key file first
        cred_path = os.path.join(
            os.path.dirname(__file__), 
            '..', 
            'serviceAccountKey.json'
        )
        
        if os.path.exists(cred_path):
            print(f"📁 Loading Firebase credentials from: {cred_path}")
            cred = credentials.Certificate(cred_path)
        else:
            # Fall back to environment variables
            project_id = os.getenv('FIREBASE_PROJECT_ID')
            private_key = os.getenv('FIREBASE_PRIVATE_KEY')
            client_email = os.getenv('FIREBASE_CLIENT_EMAIL')
            
            if not all([project_id, private_key, client_email]):
                raise ValueError(
                    "Firebase credentials not found. "
                    "Please provide serviceAccountKey.json or set environment variables."
                )
            
            print("📝 Loading Firebase credentials from environment variables")
            cred = credentials.Certificate({
                "project_id": project_id,
                "private_key": private_key.replace('\\n', '\n'),
                "client_email": client_email,
            })
        
        firebase_admin.initialize_app(cred, {
            'projectId': cred.project_id if hasattr(cred, 'project_id') 
                          else os.getenv('FIREBASE_PROJECT_ID', 'next-gen-crm-system')
        })
        
        # Initialize Firestore
        _db = firestore.client()
        print("✅ Firebase Admin initialized successfully")
        print(f"📍 Project: {cred.project_id if hasattr(cred, 'project_id') else 'next-gen-crm-system'}")
        
    except Exception as e:
        print(f"❌ Firebase initialization error: {e}")
        print("\n💡 Setup Instructions:")
        print("1. Download service account key from Firebase Console")
        print("2. Save as 'backend/serviceAccountKey.json'")
        print("3. Or set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL in .env")
        raise


def get_db():
    """Get Firestore database instance"""
    if _db is None:
        raise RuntimeError(
            "Firebase not initialized. Call initialize_firebase() first."
        )
    return _db


def verify_token(id_token: str) -> Optional[Dict]:
    """Verify Firebase ID token
    
    Args:
        id_token: Firebase ID token from frontend
        
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"⚠️  Token verification error: {e}")
        return None


def get_user_by_email(email: str):
    """Get user by email"""
    try:
        return auth.get_user_by_email(email)
    except Exception as e:
        print(f"⚠️  Get user error: {e}")
        return None


def create_user(email: str, password: str, display_name: str = None):
    """Create a new user"""
    try:
        user_params = {
            'email': email,
            'password': password,
        }
        if display_name:
            user_params['display_name'] = display_name
        
        user = auth.create_user(**user_params)
        return user
    except Exception as e:
        print(f"⚠️  Create user error: {e}")
        return None


def delete_user(uid: str):
    """Delete a user"""
    try:
        auth.delete_user(uid)
        return True
    except Exception as e:
        print(f"⚠️  Delete user error: {e}")
        return False

