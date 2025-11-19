# backend/scripts/set_claims.py
"""
Bootstrap script to set user roles and tenant_id.
This bypasses API restrictions and is used to create the first admin.

Usage:
    python scripts/set_claims.py <uid> <role> <tenant_id>

Example:
    python scripts/set_claims.py abc123xyz admin default
    python scripts/set_claims.py xyz789abc super_admin default

Roles: admin, manager, sales_rep, support, viewer, super_admin
"""

import sys, os
import firebase_admin
from firebase_admin import auth, credentials
from google.cloud import firestore
from datetime import datetime

# Point to your service account JSON:
SA_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or "serviceAccountKey.json"

def main():
    if len(sys.argv) != 4:
        print("Usage: python scripts/set_claims.py <uid> <role> <tenant_id>")
        print("\nExample:")
        print("  python scripts/set_claims.py abc123xyz admin default")
        print("  python scripts/set_claims.py xyz789abc super_admin default")
        raise SystemExit(1)

    uid, role, tenant_id = sys.argv[1], sys.argv[2], sys.argv[3]
    
    # Normalize role to lowercase
    role = role.lower().strip()
    
    # Validate role
    valid_roles = {"admin", "tenant_admin", "super_admin", "manager", "sales_rep", "support", "viewer", "support_agent"}
    if role not in valid_roles:
        print(f"[ERROR] Invalid role: {role}")
        print(f"   Valid roles: {', '.join(sorted(valid_roles))}")
        raise SystemExit(1)

    # Initialize Firebase Admin SDK
    if not firebase_admin._apps:
        if not os.path.exists(SA_PATH):
            print(f"[ERROR] Service account key not found: {SA_PATH}")
            print("   Set GOOGLE_APPLICATION_CREDENTIALS env var or place serviceAccountKey.json in backend/")
            raise SystemExit(1)
        cred = credentials.Certificate(SA_PATH)
        firebase_admin.initialize_app(cred)

    # Verify user exists
    try:
        user = auth.get_user(uid)
        print(f"User: {user.email} ({uid})")
    except Exception as e:
        print(f"[ERROR] User not found: {uid}")
        print(f"   Error: {e}")
        raise SystemExit(1)

    # Set Firebase custom claims
    try:
        auth.set_custom_user_claims(uid, {"role": role, "tenant_id": tenant_id})
        print(f"[OK] Firebase custom claims set: role={role}, tenant_id={tenant_id}")
    except Exception as e:
        print(f"[ERROR] Failed to set custom claims: {e}")
        raise SystemExit(1)

    # Update Firestore user document
    try:
        db = firestore.Client()
        user_ref = db.collection("users").document(uid)
        
        # Check if user document exists
        user_doc = user_ref.get()
        if user_doc.exists:
            # Update existing document
            user_ref.update({
                "role": role,
                "tenant_id": tenant_id,
                "updated_at": datetime.utcnow().isoformat()
            })
            print(f"[OK] Firestore user document updated")
        else:
            # Create new document
            user_ref.set({
                "uid": uid,
                "email": user.email,
                "email_lower": (user.email or "").lower(),
                "role": role,
                "tenant_id": tenant_id,
                "is_active": True,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "created_by_source": "set_claims_script"
            }, merge=True)
            print(f"[OK] Firestore user document created")
    except Exception as e:
        print(f"[WARNING] Failed to update Firestore: {e}")
        print(f"   Custom claims were set, but Firestore update failed.")
        print(f"   User will need to sign out and sign back in for changes to take effect.")

    print(f"\n[OK] Role assignment complete!")
    print(f"   User must sign out and sign back in for the new role to take effect.")
    print(f"   (Firebase tokens cache the role, so a refresh is required)")

if __name__ == "__main__":
    main()
