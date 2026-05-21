"use client";

import React from "react";
import { UserProfile } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Palette
} from "lucide-react";

export default function SettingsPage() {
  const { orgSlug } = useParams();

  return (
    <div className="space-y-8 page-transition">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferências da plataforma.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar de Navegação de Settings */}
        <aside className="w-full lg:w-64 space-y-1">
          <nav>
            {[
              { name: "Perfil", icon: User, active: true },
              { name: "Preferências", icon: Palette, active: false },
              { name: "Notificações", icon: Bell, active: false },
              { name: "Segurança", icon: Shield, active: false },
              { name: "Avançado", icon: SettingsIcon, active: false },
            ].map((item) => (
              <button
                key={item.name}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  item.active 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </button>
            ))}
          </nav>
        </aside>

        {/* Área de Conteúdo Principal */}
        <div className="flex-1 bg-card rounded-xl border shadow-sm overflow-hidden">
          <UserProfile 
            path={`/${orgSlug}/settings`}
            routing="path"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-none w-full max-w-full",
                navbar: "hidden", 
                pageScrollBox: "p-0",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
