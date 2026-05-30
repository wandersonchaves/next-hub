"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  Bell,
  Search,
  Menu,
  Sparkles,
  Heart,
  Dog,
  Zap,
  ShieldCheck
} from "lucide-react";

import { UserButton, OrganizationSwitcher, useAuth, useUser } from "@clerk/nextjs";
import { useTenantConfig, VerticalModule } from "@/hooks/use-tenant-config";

interface AppShellProps {
  children: React.ReactNode;
  orgSlug: string;
}

export function AppShell({ children, orgSlug }: AppShellProps) {
  const pathname = usePathname();
  const { config, loading } = useTenantConfig();
  const { orgRole } = useAuth();
  const { user } = useUser();

  // Admin Master Bypass
  const isMasterAdmin = orgRole === 'admin' || orgRole === 'org:admin' || user?.emailAddresses.some(e => e.emailAddress.endsWith('@nexthub.com'));

  // Mapeamento dinâmico de verticais conforme licenciamento
  const verticalItems = [
    { 
      name: "Prospector Omni", 
      href: `/${orgSlug}/prospector`, 
      icon: Zap, 
      module: 'PROSPECTOR',
      emoji: "🚀"
    },
    { 
      name: "Nexus Health (Estética)", 
      href: `/${orgSlug}/nexus-health`, 
      icon: Heart, 
      module: 'HEALTH',
      emoji: "🩺"
    },
    { 
      name: "Nexus Pet (Pet Shop)", 
      href: `/${orgSlug}/nexus-pet`, 
      icon: Dog, 
      module: 'PET',
      emoji: "🐾"
    },
  ];

  // Links fixos permitidos
  const coreItems = [
    { name: "Dashboard", href: `/${orgSlug}`, icon: LayoutDashboard },
    { name: "Configurações", href: `/${orgSlug}/settings`, icon: Settings },
  ];

  // Filtra as verticais pelo licenciamento do tenant ou bypass do admin
  const activeVerticals = verticalItems.filter(item => 
    isMasterAdmin || config?.activeModules.includes(item.module as VerticalModule)
  );

  const navigation = [
    coreItems[0], // Dashboard no topo
    ...activeVerticals,
    coreItems[1], // Configurações no rodapé da lista
  ];

  return (
    <div className="flex h-screen bg-background text-foreground selection:bg-primary/10">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 border-r bg-card/50 backdrop-blur-xl">
        <div className="p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3 font-black text-2xl tracking-tighter">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/20 font-black">N</div>
            NextHub
          </div>
          
          <div className="space-y-1">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-2 opacity-50">Organização Ativa</p>
             <OrganizationSwitcher 
                hidePersonal
                afterSelectOrganizationUrl="/dashboard"
                appearance={{
                   elements: {
                      rootBox: "w-full",
                      organizationSwitcherTrigger: "w-full bg-muted/30 border border-border/50 hover:border-primary/50 transition-all px-4 py-3 rounded-2xl",
                      organizationPreviewTextContainer: "text-left",
                      organizationPreviewMainIdentifier: "text-sm font-bold tracking-tight",
                   }
                }}
             />
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar pt-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== `/${orgSlug}` && pathname.startsWith(item.href));
            const Icon = (item as any).icon;
            const emoji = (item as any).emoji;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group relative",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/10 scale-[1.02]" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1"
                )}
              >
                <div className={cn(
                   "p-2 rounded-xl transition-colors",
                   isActive ? "bg-white/20" : "bg-muted group-hover:bg-primary/10"
                )}>
                   <Icon size={18} className={cn(isActive ? "text-primary-foreground" : "group-hover:text-primary")} />
                </div>
                <span className="flex-1 truncate tracking-tight">
                   {emoji} {item.name}
                </span>
                {isActive && (
                   <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-border/50 bg-muted/20">
          <UserButton 
            showName 
            appearance={{
              elements: {
                userButtonBox: "flex-row-reverse w-full gap-4",
                userButtonOuterIdentifier: "font-black text-xs uppercase tracking-tight text-foreground",
                userButtonTrigger: "hover:scale-105 transition-transform"
              }
            }}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-muted/5">
        {/* Header */}
        <header className="h-16 border-b border-border/50 bg-card/30 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1">
             <div className="md:hidden w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xs">N</div>
             <div className="hidden lg:flex items-center gap-2 text-xs font-black uppercase tracking-tighter text-muted-foreground opacity-50 italic">
                <ShieldCheck size={14} />
                Sistema de Gestão Segura • v2.0
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-all relative group border border-transparent hover:border-border">
              <Bell size={20} />
              <span className="absolute top-2.5 right-3 w-2 h-2 bg-primary rounded-full border-2 border-card group-hover:scale-125 transition-transform" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center md:hidden active:scale-95 transition-transform cursor-pointer">
              <Menu size={20} className="text-primary" />
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 custom-scrollbar">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </div>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-card/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around px-4 z-50 pb-safe">
        {navigation.slice(0, 4).map((item) => {
          const isActive = pathname === item.href;
          const Icon = (item as any).icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all active:scale-90",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 3 : 2} />
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.name.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
