# backend/scripts/check_user_role.py
"""
Script to check a user's role in Firestore by email.

Usage:
    python scripts/check_user_role.py <email>

Example:
    python scripts/check_user_role.py leomessi10@gmail.com
"""

import sys
import os
import firebase_admin
from firebase_admin import credentials, auth, firestore

# Point to your service account JSON:
SA_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or "serviceAccountKey.json"

def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/check_user_role.py <email>")
        print("\nExample:")
        print("  python scripts/check_user_role.py leomessi10@gmail.com")
        raise SystemExit(1)

    email = sys.argv[1].strip().lower()
    
    # Initialize Firebase Admin SDK
    if not firebase_admin._apps:
        if not os.path.exists(SA_PATH):
            print(f"[ERROR] Service account key not found: {SA_PATH}")
            print("   Set GOOGLE_APPLICATION_CREDENTIALS env var or place serviceAccountKey.json in backend/")
            raise SystemExit(1)
        cred = credentials.Certificate(SA_PATH)
        firebase_admin.initialize_app(cred)

    print(f"Checking role for: {email}\n")

    # Get user from Firebase Auth
    try:
        user = auth.get_user_by_email(email)
        uid = user.uid
        print(f"[OK] User found in Firebase Auth")
        print(f"   UID: {uid}")
        
        # Check custom claims
        custom_claims = user.custom_claims or {}
        role_from_claims = custom_claims.get("role", "not set")
        tenant_from_claims = custom_claims.get("tenant_id", "not set")
        print(f"\nFirebase Custom Claims:")
        print(f"   Role: {role_from_claims}")
        print(f"   Tenant ID: {tenant_from_claims}")
        
    except Exception as e:
        print(f"[ERROR] User not found in Firebase Auth: {e}")
        raise SystemExit(1)

    # Get user from Firestore
    try:
        db = firestore.client()
        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            role_from_firestore = user_data.get("role", "not set")
            tenant_from_firestore = user_data.get("tenant_id", "not set")
            email_from_firestore = user_data.get("email", "not set")
            
            print(f"\nFirestore User Document:")
            print(f"   Email: {email_from_firestore}")
            print(f"   Role: {role_from_firestore}")
            print(f"   Tenant ID: {tenant_from_firestore}")
            
            # Check if roles match
            print(f"\nRole Comparison:")
            if role_from_claims.lower() == role_from_firestore.lower():
                print(f"   [OK] Roles match: {role_from_firestore}")
            else:
                print(f"   [WARNING] Roles don't match!")
                print(f"      Custom Claims: {role_from_claims}")
                print(f"      Firestore: {role_from_firestore}")
            
            # Check if it's super_admin
            print(f"\nSuper Admin Check:")
            if role_from_firestore.lower() == "super_admin":
                print(f"   [OK] User IS set as super_admin")
            else:
                print(f"   [NO] User is NOT super_admin (current role: {role_from_firestore})")
                print(f"\nTo set as super_admin:")
                print(f"   python scripts/set_claims.py {uid} super_admin {tenant_from_firestore}")
        else:
            print(f"\n[WARNING] User document not found in Firestore")
            print(f"   User may need to log in first to create the document")
            
    except Exception as e:
        print(f"[ERROR] Error checking Firestore: {e}")
        import traceback
        traceback.print_exc()
        raise SystemExit(1)

    # Check environment variable
    print(f"\nEnvironment Check:")
    first_admin_email = os.getenv("FIRST_SUPER_ADMIN_EMAIL", "").strip().lower()
    if first_admin_email:
        print(f"   FIRST_SUPER_ADMIN_EMAIL: {first_admin_email}")
        if first_admin_email == email:
            print(f"   [OK] Email matches FIRST_SUPER_ADMIN_EMAIL")
            print(f"   [OK] User will be set as super_admin on next login/registration")
        else:
            print(f"   [WARNING] Email does NOT match FIRST_SUPER_ADMIN_EMAIL")
            print(f"   To set this email as super_admin, set:")
            print(f"      FIRST_SUPER_ADMIN_EMAIL={email}")
    else:
        print(f"   [WARNING] FIRST_SUPER_ADMIN_EMAIL not set")
        print(f"   To set this email as super_admin, set:")
        print(f"      FIRST_SUPER_ADMIN_EMAIL={email}")

if __name__ == "__main__":
    main()

