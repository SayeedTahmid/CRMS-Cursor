import { getAuth } from "firebase/auth";

/** Forces a token refresh, returns { role, tenant_id } or nulls if missing */
export async function refreshAndGetClaims() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No logged-in user");

  await user.getIdToken(true);               // force refresh
  const idToken = await user.getIdToken();   // read new token

  // decode base64url payload
  const b64 = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(atob(b64));

  return {
    role: payload.role ?? null,
    tenant_id: payload.tenant_id ?? null,
    raw: payload, // optional for debugging
  };
}
