"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { useApi } from "@/hooks/use-api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  History, 
  User as UserIcon, 
  Activity,
  Info
} from "lucide-react";
import { useParams } from "next/navigation";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

const columns = [
  { 
    header: "Usuário", 
    accessorKey: "user", 
    render: (user: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={16} className="text-primary" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate">{user.name || "Usuário"}</span>
          <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
        </div>
      </div>
    )
  },
  { 
    header: "Ação", 
    accessorKey: "action",
    render: (val: string) => (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
          val.includes("DELETE") ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
          val.includes("CREATE") ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        }`}>
          {val.replace(/_/g, " ")}
        </span>
      </div>
    )
  },
  { header: "Entidade", accessorKey: "entity" },
  { 
    header: "Data e Hora", 
    accessorKey: "createdAt",
    render: (val: string) => (
      <span className="text-xs text-muted-foreground">
        {format(new Date(val), "dd 'de' MMM, HH:mm", { locale: ptBR })}
      </span>
    )
  },
  {
    header: "Detalhes",
    accessorKey: "metadata",
    render: (metadata: any) => (
      <button 
        onClick={() => console.log(metadata)}
        className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        title="Ver metadados"
      >
        <Info size={16} />
      </button>
    )
  }
];

export default function AuditLogsPage() {
  const { orgSlug } = useParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { fetcher } = useApi();

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await fetcher<AuditLog[]>(`/audit-logs?orgSlug=${orgSlug}`);
        setLogs(data);
      } catch (error) {
        console.error("Failed to load audit logs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (orgSlug) loadLogs();
  }, [fetcher, orgSlug]);

  return (
    <div className="space-y-8 page-transition">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h1>
          <p className="text-muted-foreground">Acompanhe todas as atividades da sua organização para conformidade e segurança.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-xl border">
          <ShieldCheck className="text-primary" size={20} />
          <span className="text-sm font-semibold italic">Padrão SOC2 Ready</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <Activity size={20} />
            </div>
            <h3 className="font-bold text-lg">Total de Ações</h3>
          </div>
          <p className="text-3xl font-black">{logs.length}</p>
          <p className="text-xs text-muted-foreground mt-2">Registradas nos últimos 30 dias</p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-medium animate-pulse">Carregando trilha de auditoria...</p>
          </div>
        ) : logs.length > 0 ? (
          <DataTable columns={columns as any} data={logs} />
        ) : (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <History size={32} />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground">Nenhum log encontrado</p>
              <p className="text-sm">As atividades da sua organização aparecerão aqui.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShieldCheck({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
