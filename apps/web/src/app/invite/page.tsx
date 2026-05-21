"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const { isLoaded, userId } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "processing">("loading");
  const { fetcher } = useApi();

  useEffect(() => {
    // Só tentamos processar se o Clerk já carregou
    if (!isLoaded) return;

    // Se não tiver userId, o middleware do Clerk deve ter redirecionado para o login,
    // mas por segurança validamos aqui também.
    if (!userId) {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      router.push(`/login?redirect_url=${encodeURIComponent(currentUrl)}`);
      return;
    }

    if (!token) {
      setStatus("error");
      return;
    }

    const acceptInvite = async () => {
      try {
        setStatus("processing");
        await fetcher(`/organizations/invites/accept`, {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setStatus("success");
        toast.success("Convite aceito com sucesso!");
        
        // Redireciona automaticamente após 5 segundos, 
        // mas o usuário terá um botão para ir antes.
        const timer = setTimeout(() => {
          router.push("/dashboard");
        }, 5000);
        
        return () => clearTimeout(timer);
      } catch (error) {
        console.error("Invite error:", error);
        setStatus("error");
        toast.error("Este convite é inválido ou expirou.");
      }
    };

    if (status === "loading") {
      acceptInvite();
    }
  }, [token, fetcher, router, isLoaded, userId, status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <div className="max-w-md w-full bg-card border rounded-3xl p-10 text-center shadow-xl">
        {(status === "loading" || status === "processing") && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h1 className="text-xl font-bold">Validando seu convite...</h1>
            <p className="text-muted-foreground text-sm">Aguarde um momento enquanto processamos seu acesso.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="text-emerald-600 w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black">Tudo certo!</h1>
              <p className="text-muted-foreground">Você agora faz parte da organização.</p>
            </div>
            
            <Button 
              onClick={() => router.push("/dashboard")} 
              className="w-full h-12 rounded-2xl font-bold gap-2"
            >
              Ir para o Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Você será redirecionado automaticamente em alguns segundos.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="text-red-600 w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black">Convite Inválido</h1>
              <p className="text-muted-foreground text-sm">O link pode ter expirado ou já foi utilizado. Peça ao administrador um novo convite.</p>
            </div>
            <Link href="/" className="block text-sm font-bold text-primary hover:underline">
              Voltar para a Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
