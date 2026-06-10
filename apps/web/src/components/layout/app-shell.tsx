"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Settings, 
  Bell,
  Menu,
  Heart,
  Dog,
  Zap,
  ShieldCheck,
  Building2,
  ChevronDown,
  LogOut
} from "lucide-react";

import { useUser, useAuth } from "@/providers/auth-provider";
import { useTenantConfig, VerticalModule } from "@/hooks/use-tenant-config";

interface AppShellProps {
  children: React.ReactNode;
  orgSlug: string;
}

export function AppShell({ children, orgSlug }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { config, loading: configLoading, selectUnit, activeUnitId } = useTenantConfig();
  const { orgRole, logout, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  
  // Sidebar minimization state
  const [isMinimized, setIsMinimized] = useState(false);

  // 1. HYDRATION GUARD / SPLASH: Prevent flashes of internal content
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  // 2. FOCUS MANAGEMENT: Removed 'focus' listener to eliminate elastic behavior.
  // ONLY 'blur' is kept for auto-minimization when switching tabs.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBlur = () => setIsMinimized(true);

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Admin Master Bypass
  const isMasterAdmin = orgRole === 'admin' || orgRole === 'org:admin' || (user?.email && user.email.endsWith('@nexthub.com'));

  const verticalItems = [
    { name: "Prospector Omni", href: `/${orgSlug}/prospector`, icon: Zap, module: 'PROSPECTOR', emoji: "🚀" },
    { name: "Nexus Health", href: `/${orgSlug}/nexus-health`, icon: Heart, module: 'HEALTH', emoji: "🩺" },
    { name: "Nexus Pet", href: `/${orgSlug}/nexus-pet`, icon: Dog, module: 'PET', emoji: "🐾" },
  ];

  const coreItems = [
    { name: "Dashboard", href: `/${orgSlug}`, icon: LayoutDashboard },
    { name: "Configurações", href: `/${orgSlug}/settings`, icon: Settings },
  ];

  const activeVerticals = verticalItems.filter(item => 
    isMasterAdmin || config?.activeModules.includes(item.module as VerticalModule)
  );

  const navigation = [ coreItems[0], ...activeVerticals, coreItems[1] ];

  const currentUnit = config?.units.find(u => u.id === activeUnitId) || config?.units[0];

  // Splash Screen for Hydration & Session Sync
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background transition-colors duration-500">
        <div className="flex flex-col items-center gap-6">
           <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center font-black text-primary">N</div>
           </div>
           <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-black uppercase tracking-widest text-foreground animate-pulse">Sincronizando Sessão</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-50">NextHub Staff Cloud Guard</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground selection:bg-primary/10 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "hidden md:flex flex-col border-r bg-card/50 backdrop-blur-xl transition-all duration-300 ease-in-out",
        isMinimized ? "w-20" : "w-64"
      )}>
        <div className={cn("p-8 flex flex-col gap-6", isMinimized && "p-4 items-center")}>
          <div className="flex items-center gap-3 font-black text-2xl tracking-tighter cursor-default">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/20 font-black shrink-0">N</div>
            {!isMinimized && <span className="animate-in fade-in duration-500">NextHub</span>}
          </div>
          
          {!isMinimized && (
            <div className="space-y-4 animate-in fade-in duration-300">
               <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-2 opacity-50 italic">Empresa</p>
                  <div className="w-full bg-muted/30 border border-border/50 transition-all px-4 py-3 rounded-2xl text-left">
                    <span className="text-sm font-bold tracking-tight">{config?.organizationId || 'Minha Empresa'}</span>
                  </div>
               </div>

               {config?.units && config.units.length > 0 && (
                  <div className="relative">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-2 opacity-50 italic">Unidade</p>
                     <button 
                        onClick={() => setUnitMenuOpen(!unitMenuOpen)}
                        className="w-full flex items-center justify-between bg-muted/30 border border-border/50 hover:border-primary/50 transition-all px-4 py-3 rounded-2xl text-left outline-none group"
                     >
                        <div className="flex items-center gap-2 overflow-hidden">
                           <Building2 size={14} className="text-primary shrink-0" />
                           <span className="text-xs font-bold truncate tracking-tight">{currentUnit?.name || 'Unidade'}</span>
                        </div>
                        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", unitMenuOpen && "rotate-180")} />
                     </button>

                     {unitMenuOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-2xl p-2 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-100">
                           {config.units.map(unit => (
                              <button
                                 key={unit.id}
                                 onClick={() => {
                                    selectUnit(unit.id);
                                    setUnitMenuOpen(false);
                                 }}
                                 className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all mb-1 last:mb-0 text-left",
                                    unit.id === activeUnitId ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                 )}
                              >
                                 <Building2 size={12} />
                                 {unit.name}
                              </button>
                           ))}
                        </div>
                     )}
                  </div>
               )}
            </div>
          )}
        </div>
        
        <nav className={cn("flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar pt-2 border-t border-border/10", isMinimized && "px-2")}>
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
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1",
                  isMinimized && "px-0 justify-center"
                )}
                title={isMinimized ? item.name : ""}
              >
                <div className={cn(
                   "p-2 rounded-xl transition-colors shrink-0",
                   isActive ? "bg-white/20" : "bg-muted group-hover:bg-primary/10"
                )}>
                   <Icon size={18} className={cn(isActive ? "text-primary-foreground" : "group-hover:text-primary")} />
                </div>
                {!isMinimized && (
                  <span className="flex-1 truncate tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">
                     {emoji && <span className="mr-1.5">{emoji}</span>}
                     {item.name}
                  </span>
                )}
                {(isActive && !isMinimized) && (
                   <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className={cn("p-6 border-t border-border/50 bg-muted/20 flex justify-between items-center", isMinimized && "p-4 flex-col gap-4")}>
          {!isMinimized ? (
            <>
              <div className="font-black text-xs uppercase tracking-tight text-foreground truncate max-w-[120px]">{user?.name || user?.email}</div>
              <button onClick={logout} className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1">
                <LogOut size={14} />
                <span>Sair</span>
              </button>
            </>
          ) : (
            <button onClick={logout} className="text-muted-foreground hover:text-rose-500 transition-colors" title="Sair">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-muted/5">
        <header className="h-16 border-b border-border/50 bg-card/30 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1">
             <div className="md:hidden w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xs">N</div>
             <div className="hidden lg:flex items-center gap-2 text-xs font-black uppercase tracking-tighter text-muted-foreground opacity-50 italic">
                <ShieldCheck size={14} />
                NextHub Security Center • v2.0
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

        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 custom-scrollbar">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
