import Link from "next/link";
import { cn } from "@/lib/utils";
import { StateBadge, ProspectorState } from "./state-badge";

export interface Interaction {
  id: string;
  type: 'INBOUND' | 'OUTBOUND';
  content: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  score: number;
  industry?: string;
  lastInteractionAt: string;
  interactions: Interaction[];
  isPending?: boolean;
}

interface LeadCardProps {
  lead: Lead;
  activeLeadId?: string;
  orgSlug: string;
}

export function LeadCard({ lead, activeLeadId, orgSlug }: LeadCardProps) {
  const isActive = activeLeadId === lead.id;

  const isRecent = () => {
    const lastMsg = lead.interactions?.[0];
    if (!lastMsg || lastMsg.type !== 'INBOUND') return false;
    const diff = Date.now() - new Date(lastMsg.createdAt).getTime();
    return diff < 60000;
  };

  return (
    <Link
      href={`/${orgSlug}/prospector/chat/${lead.id}`}
      className={cn(
        "block p-4 border-b transition-all hover:bg-muted/30 relative",
        lead.isPending
          ? "border-l-4 border-l-blue-500 bg-blue-500/5"
          : isActive
            ? "bg-primary/5 border-l-4 border-l-primary"
            : "border-l-4 border-l-transparent"
      )}
    >
      {lead.isPending ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </div>
      ) : isRecent() && activeLeadId !== lead.id ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </div>
      ) : null}
      <div className="flex justify-between items-start mb-1">
        <span className="font-bold text-sm truncate pr-2">{lead.name}</span>
        <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap uppercase">
          {lead.interactions?.[0] ? new Date(lead.interactions[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Novo'}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground truncate mb-2 italic">
        {lead.industry}
      </p>
      <div className="flex justify-between items-center">
        <StateBadge state={lead.status as ProspectorState} className="text-[8px] px-2 py-0" />
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black tracking-tighter text-primary">
            SCORE {lead.score}
          </span>
        </div>
      </div>
    </Link>
  );
}

interface LeadsListProps {
  leads: Lead[];
  activeLeadId?: string;
  orgSlug: string;
  loading?: boolean;
}

export function LeadsList({ leads, activeLeadId, orgSlug, loading }: LeadsListProps) {
  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Carregando leads...</div>;
  }

  if (leads.length === 0) {
    return <div className="p-8 text-center text-xs text-muted-foreground italic">Nenhum lead encontrado</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          activeLeadId={activeLeadId}
          orgSlug={orgSlug}
        />
      ))}
    </div>
  );
}
