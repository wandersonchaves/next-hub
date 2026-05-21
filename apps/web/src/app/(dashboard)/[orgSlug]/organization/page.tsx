"use client";

import React, { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { 
  Users, 
  Settings as SettingsIcon, 
  Palette, 
  ShieldCheck,
  Plus,
  Mail,
  User as UserIcon,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { Can } from "@/components/auth/can";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

const memberColumns = [
  { header: "Membro", accessorKey: "user", render: (user: any) => (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs overflow-hidden">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <UserIcon size={14} />
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-foreground truncate">{user.name || "Sem Nome"}</span>
        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
      </div>
    </div>
  )},
  { header: "Função", accessorKey: "role", render: (val: string) => (
    <div className="flex items-center gap-2">
      <ShieldCheck size={14} className={cn(
        val === "OWNER" ? "text-amber-500" : val === "ADMIN" ? "text-blue-500" : "text-muted-foreground"
      )} />
      <span className="text-xs font-semibold capitalize">{val.toLowerCase()}</span>
    </div>
  )},
  { header: "Status", accessorKey: "id", render: () => (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600">
      Ativo
    </span>
  )},
];

export default function OrganizationPage() {
  const { orgSlug } = useParams();
  const [activeTab, setActiveTab] = useState<"members" | "branding" | "settings">("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [emailToInvite, setEmailToInvite] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { fetcher } = useApi();

  const loadData = async () => {
    try {
      const [membersData, orgData] = await Promise.all([
        fetcher<Member[]>(`/organizations/${orgSlug}/members`),
        fetcher<any>(`/organizations/${orgSlug}`)
      ]);
      setMembers(membersData);
      setOrgName(orgData.name);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) loadData();
  }, [orgSlug, fetcher]);

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      await fetcher(`/organizations/${orgSlug}`, {
        method: "PATCH",
        body: JSON.stringify({ name: orgName }),
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToInvite) return;

    setIsInviting(true);
    try {
      await fetcher(`/organizations/${orgSlug}/invites`, {
        method: "POST",
        body: JSON.stringify({ email: emailToInvite, role: "MEMBER" }),
      });
      
      toast.success(`Convite enviado para ${emailToInvite}!`);
      setEmailToInvite("");
      loadData(); // Refresh members list
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar convite.");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10 page-transition">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspace Management</h1>
          <p className="text-muted-foreground">Gerencie sua equipe, identidade visual e configurações do workspace.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b pb-px overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab("members")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative shrink-0",
            activeTab === "members" 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users size={18} />
          Membros
        </button>

        <Can I={["OWNER", "ADMIN"]}>
          <button
            onClick={() => setActiveTab("branding")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative shrink-0",
              activeTab === "branding" 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Palette size={18} />
            Branding
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative shrink-0",
              activeTab === "settings" 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <SettingsIcon size={18} />
            Configurações
          </button>
        </Can>
      </div>

      {/* Content */}
      <div className="pt-4">
        {activeTab === "members" && (
          <div className="space-y-6">
            <Can I={["OWNER", "ADMIN"]}>
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Plus size={20} className="text-primary" />
                  Convidar novo membro
                </h3>
                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="email" 
                    required
                    placeholder="email@empresa.com"
                    value={emailToInvite}
                    onChange={(e) => setEmailToInvite(e.target.value)}
                    className="flex-1 bg-muted/50 border rounded-xl px-4 py-2 text-sm focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                  <button 
                    disabled={isInviting}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isInviting ? <Loader2 size={18} className="animate-spin" /> : "Enviar Convite"}
                  </button>
                </form>
              </div>
            </Can>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-lg">Membros Ativos ({members.length})</h3>
              </div>
              <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                {isLoading ? (
                  <div className="p-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                    <Loader2 size={32} className="animate-spin text-primary" />
                    <p className="font-medium">Carregando membros...</p>
                  </div>
                ) : (
                  <DataTable columns={memberColumns as any} data={members} />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "branding" && (
          <div className="grid gap-6">
            <div className="rounded-2xl border bg-card p-8 shadow-sm space-y-8">
              <div>
                <h3 className="text-xl font-bold">Identidade Visual</h3>
                <p className="text-sm text-muted-foreground">Configure como o workspace aparece para seus clientes.</p>
              </div>
              
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-sm font-bold">Nome da Organização</label>
                  <input 
                    type="text" 
                    value={orgName} 
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-4 py-2 bg-muted rounded-xl text-sm border focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold">Logo (White-label)</label>
                  <div className="h-10 border-2 border-dashed rounded-xl flex items-center justify-center text-[10px] font-black tracking-widest text-muted-foreground cursor-pointer hover:bg-muted/50 hover:border-primary/20 transition-all uppercase">
                    Breve: Upload via S3
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <button 
                  onClick={handleSaveBranding}
                  disabled={isSaving}
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="rounded-2xl border bg-card p-8 shadow-sm">
             <div className="flex items-center gap-6 text-amber-600 bg-amber-500/5 p-6 rounded-2xl border border-amber-500/10">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0">
                <Mail size={24} />
              </div>
              <div>
                <p className="text-lg font-bold">Configurações de E-mail (SMTP)</p>
                <p className="text-sm text-amber-700/80">Configure seu domínio SMTP para enviar convites e notificações através do seu próprio endereço de e-mail.</p>
                <button className="mt-4 text-xs font-black uppercase tracking-widest bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-all">
                  Configurar Agora
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
