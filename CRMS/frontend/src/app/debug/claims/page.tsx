"use client";

import { useState } from "react";
import { refreshAndGetClaims } from "@/lib/getClaims";

export default function ClaimsDebugPage() {
  const [out, setOut] = useState<string>("(click the button)");

  const check = async () => {
    try {
      const claims = await refreshAndGetClaims();
      setOut(`role=${claims.role} | tenant_id=${claims.tenant_id}`);
      console.log(claims.raw); // full token payload for inspection
    } catch (e: any) {
      setOut(`Error: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Custom Claims</h1>
      <button onClick={check} style={{ padding: 8, border: "1px solid #ccc" }}>
        Refresh & Read Claims
      </button>
      <pre>{out}</pre>
    </div>
  );
}
