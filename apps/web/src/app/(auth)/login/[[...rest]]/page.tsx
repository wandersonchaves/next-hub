"use client";

import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate login for now - you would implement a real fetch to /auth/login here
    setTimeout(() => {
      login("mock-token", { id: "user-1", email: "admin@nexthub.com", name: "Admin" }, [{ id: "org-1", slug: "nexthub-core", name: "NextHub Core", role: "ADMIN" }]);
    }, 1000);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/5">
      <div className="w-full max-w-sm p-8 bg-background rounded-2xl shadow-xl border">
        <h1 className="text-2xl font-black mb-6 text-center">NextHub Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Email</label>
            <input type="email" required className="w-full p-3 bg-muted/50 border rounded-xl outline-none focus:border-primary" defaultValue="admin@nexthub.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Senha</label>
            <input type="password" required className="w-full p-3 bg-muted/50 border rounded-xl outline-none focus:border-primary" defaultValue="password" />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading}>
            {loading ? "Autenticando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
