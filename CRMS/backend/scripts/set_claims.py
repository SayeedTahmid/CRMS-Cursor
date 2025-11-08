import sys, os
import firebase_admin
from firebase_admin import auth, credentials

# Point to your service account JSON:
SA_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or "serviceAccountKey.json"

def main():
    if len(sys.argv) != 4:
        print("Usage: python scripts/set_claims.py <uid> <role> <tenant_id>")
        raise SystemExit(1)

    uid, role, tenant_id = sys.argv[1], sys.argv[2], sys.argv[3]

    if not firebase_admin._apps:
        cred = credentials.Certificate(SA_PATH)
        firebase_admin.initialize_app(cred)

    auth.set_custom_user_claims(uid, {"role": role, "tenant_id": tenant_id})
    print(f"✅ Claims set for {uid}: role={role}, tenant_id={tenant_id}")

if __name__ == "__main__":
    main()
