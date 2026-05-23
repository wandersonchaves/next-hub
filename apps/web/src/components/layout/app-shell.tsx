"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  FileText, 
  CreditCard,
  Bell,
  Search,
  Menu,
  History,
  Sparkles,
  Heart,
  Dog,
  Zap
} from "lucide-react";

import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { useTenantConfig, VerticalModule } from "@/hooks/use-tenant-config";

interface AppShellProps {
  children: React.ReactNode;
  orgSlug: string;
}

export function AppShell({ children, orgSlug }: AppShellProps) {
  const pathname = usePathname();
  const { config, loading } = useTenantConfig();

  const navigation = [
    { name: "Dashboard", href: `/${orgSlug}`, icon: LayoutDashboard, module: 'CORE' },
    { name: "Prospector", href: `/${orgSlug}/prospector`, icon: Zap, module: 'PROSPECTOR' },
    { name: "Nexus Health", href: `/${orgSlug}/nexus-health`, icon: Heart, module: 'HEALTH' },
    { name: "Nexus Pet", href: `/${orgSlug}/nexus-pet`, icon: Dog, module: 'PET' },
    { name: "IA Assistant", href: `/${orgSlug}/ai`, icon: Sparkles, module: 'CORE' },
    { name: "Documentos", href: `/${orgSlug}/documents`, icon: FileText, module: 'CORE' },
    { name: "Audit Logs", href: `/${orgSlug}/audit-logs`, icon: History, module: 'CORE' },
    { name: "Membros", href: `/${orgSlug}/organization`, icon: Users, module: 'CORE' },
    { name: "Assinatura", href: `/${orgSlug}/billing`, icon: CreditCard, module: 'CORE' },
    { name: "Configurações", href: `/${orgSlug}/settings`, icon: Settings, module: 'CORE' },
  ];

  const filteredNavigation = navigation.filter(item => {
    if (item.module === 'CORE') return true;
    return config?.activeModules.includes(item.module as VerticalModule);
  });

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black">E</div>
            Enterprise
          </div>
          <OrganizationSwitcher 
            hidePersonal
            afterSelectOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger: "w-full bg-muted/50 border border-transparent hover:border-border transition-all px-3 py-2 rounded-xl",
              }
            }}
          />
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== `/${orgSlug}` && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon size={20} className={cn(isActive ? "text-primary-foreground" : "group-hover:text-primary transition-colors")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t flex items-center justify-center">
          <UserButton 
            showName 
            appearance={{
              elements: {
                userButtonBox: "flex-row-reverse w-full gap-3",
                userButtonOuterIdentifier: "font-semibold text-sm",
              }
            }}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Desktop & Mobile */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="md:hidden w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-black text-xs">E</div>
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Busca inteligente..." 
                className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-transparent rounded-xl text-sm focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-1 rounded-md">
              Shift + K
            </div>
            <button className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors relative group">
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-card group-hover:scale-110 transition-transform" />
            </button>
            <div className="w-9 h-9 rounded-full bg-primary/10 border flex items-center justify-center md:hidden active:scale-95 transition-transform cursor-pointer">
              <Menu size={20} className="text-primary" />
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-muted/20">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </div>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around px-2 z-50">
        {filteredNavigation.slice(0, 4).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all active:scale-90",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
