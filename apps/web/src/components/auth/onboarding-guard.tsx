"use client";

import React from "react";
import { useAuth, OrganizationList } from "@clerk/nextjs";
import { Loader2, LayoutGrid } from "lucide-react";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { orgId, isLoaded } = useAuth();

  // Se o Clerk ainda não carregou, mostramos um loader minimalista
  // Mas evitamos travar o browser com lógicas pesadas
  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background animate-in fade-in duration-500">
        <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
      </div>
    );
  }

  // Se o usuário está logado mas não selecionou/não tem organização
  if (!orgId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-muted/20 p-4 animate-in zoom-in-95 duration-300">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="bg-card border rounded-3xl p-8 shadow-xl">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="text-primary w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight mb-1">Selecione um Workspace</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Você precisa de uma organização ativa para continuar.
            </p>
            
            <div className="flex flex-col gap-4">
              <OrganizationList 
                hidePersonal={true}
                afterCreateOrganizationUrl="/dashboard"
                afterSelectOrganizationUrl="/dashboard"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none border-none p-0 w-full",
                    organizationListSwitcherItem: "hover:bg-muted transition-colors"
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
