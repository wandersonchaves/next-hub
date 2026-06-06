"use client";

import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("wanderson.admin@nexthub.com");
  const [password, setPassword] = useState("password");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha na autenticação');
      }

      const data = await response.json();
      
      login(data.token, data.user, data.memberships);
      
      toast.success("Login realizado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao entrar. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/5 font-sans">
      <div className="w-full max-w-sm p-10 bg-background rounded-[2.5rem] shadow-2xl border border-border/50">
        <div className="flex flex-col items-center mb-8">
           <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black text-xl mb-4 shadow-xl shadow-primary/20">N</div>
           <h1 className="text-2xl font-black tracking-tighter">NextHub Login</h1>
           <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-widest">Acesso à Torre de Controle</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 italic opacity-70">Email Institucional</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-muted/30 border border-border/50 rounded-2xl outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-bold text-sm" 
              placeholder="ex: admin@nexthub.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 italic opacity-70">Senha de Acesso</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-muted/30 border border-border/50 rounded-2xl outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-bold text-sm" 
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 mt-4" disabled={loading}>
            {loading ? "Autenticando..." : "Entrar no Workspace"}
          </Button>
        </form>

        <div className="mt-8 text-center">
           <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter opacity-40">NextHub Security Center • v2.0</p>
        </div>
      </div>
    </div>
  );
}
