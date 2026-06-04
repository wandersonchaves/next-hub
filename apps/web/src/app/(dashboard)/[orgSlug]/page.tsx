"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  Zap, 
  Heart, 
  Dog,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Lock
} from "lucide-react";
import { useTenantConfig, VerticalModule } from "@/hooks/use-tenant-config";
import { cn } from "@/lib/utils";
import { useUser, useAuth } from "@/providers/auth-provider";

export default function WelcomeHubPage() {
  const { orgSlug } = useParams();
  const { config, loading } = useTenantConfig();
  const { user } = useUser();
  const { orgRole } = useAuth();

  // Admin Master Bypass
  const isMasterAdmin = orgRole === 'admin' || orgRole === 'org:admin' || (user?.email && user.email.endsWith('@nexthub.com'));

  const verticals = [
    { 
      id: 'PROSPECTOR',
      name: "Prospector Omni", 
      desc: "Prospecção automatizada com IA e SDR assistido para escala B2B.",
      href: `/${orgSlug}/prospector`, 
      icon: Zap, 
      color: "from-blue-600 to-indigo-700",
      iconBg: "bg-blue-500/20 text-blue-400",
      emoji: "🚀"
    },
    { 
      id: 'HEALTH',
      name: "Nexus Health", 
      desc: "Gestão de clínicas de estética, automação de agendas e redução de no-show.",
      href: `/${orgSlug}/nexus-health`, 
      icon: Heart, 
      color: "from-rose-600 to-pink-700",
      iconBg: "bg-rose-500/20 text-rose-400",
      emoji: "🩺"
    },
    { 
      id: 'PET',
      name: "Nexus Pet", 
      desc: "Gestão operacional de pet shops e controle inteligente de recorrência.",
      href: `/${orgSlug}/nexus-pet`, 
      icon: Dog, 
      color: "from-emerald-600 to-teal-700",
      iconBg: "bg-emerald-500/20 text-emerald-400",
      emoji: "🐾"
    },
  ];

  // STRICT MOUNTING: If not admin, filter strictly by enabledModules. 
  // If admin, show all.
  const activeVerticals = verticals.filter(v => 
    isMasterAdmin || config?.activeModules.includes(v.id as VerticalModule)
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
           <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Autenticando Torre de Controle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-6xl mx-auto py-8">
      {/* Welcome Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
           <ShieldCheck size={12} />
           Acesso Autorizado {isMasterAdmin && "• Master Admin"}
        </div>
        <div>
           <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground mb-2">
             Bem-vindo, <span className="text-primary italic">{user?.name?.split(' ')[0] || 'Líder'}</span>!
           </h1>
           <p className="text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
             {isMasterAdmin 
               ? "Selecione qualquer módulo abaixo para gerenciar como administrador global do sistema." 
               : "Sua Torre de Controle centralizada. Abaixo estão os módulos liberados para sua unidade."}
           </p>
        </div>
      </div>

      {/* Action Hub - Vertical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeVerticals.map((v) => (
          <Link 
            key={v.id} 
            href={v.href}
            className="group relative h-full flex flex-col p-8 bg-card border border-border/50 rounded-[2.5rem] overflow-hidden transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 active:scale-95"
          >
            <div className={cn(
               "absolute -top-12 -right-12 w-32 h-32 blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity",
               v.id === 'PROSPECTOR' ? "bg-blue-500" : v.id === 'HEALTH' ? "bg-rose-500" : "bg-emerald-500"
            )} />

            <div className="relative z-10 flex flex-col h-full">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner", v.iconBg)}>
                 <v.icon size={28} />
              </div>
              
              <div className="space-y-3 mb-8">
                 <div className="flex items-center gap-2">
                    <span className="text-2xl">{v.emoji}</span>
                    <h3 className="text-xl font-black tracking-tight text-foreground">{v.name}</h3>
                 </div>
                 <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                   {v.desc}
                 </p>
              </div>

              <div className="mt-auto flex items-center justify-between">
                 <span className="text-xs font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                    Entrar no Módulo
                 </span>
                 <div className="w-10 h-10 rounded-full bg-muted border flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <ArrowRight size={20} />
                 </div>
              </div>
            </div>
          </Link>
        ))}

        {activeVerticals.length === 0 && (
           <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2.5rem] bg-muted/20 flex flex-col items-center">
              <Lock size={48} className="text-muted-foreground mb-4 opacity-20" />
              <p className="text-lg font-bold text-muted-foreground italic tracking-tight uppercase">Acesso Restrito</p>
              <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">Esta unidade não possui módulos habilitados ou você não tem permissão de acesso.</p>
           </div>
        )}
      </div>

      {/* System Footer Bar */}
      <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               Ambiente: Produção Segura
            </div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground" />
            <div className="flex items-center gap-2">
               <ShieldCheck size={12} />
               Multi-Level Isolation Active
            </div>
         </div>
      </div>
    </div>
  );
}
