export const usersService = {
    list: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json(); // { users, total }
    },
    setRole: async (uid: string, role: string) => {
      const res = await fetch(`/api/users/${encodeURIComponent(uid)}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  };
  