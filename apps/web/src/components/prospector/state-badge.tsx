import { cn } from "@/lib/utils";

export type ProspectorState = 
  | 'GREETING' 
  | 'QUALIFICATION' 
  | 'ROI_ANCHORING' 
  | 'NEGOTIATION' 
  | 'BOOKING' 
  | 'NEGATIVE' 
  | 'CONVERTED';

interface StateBadgeProps {
  state: ProspectorState;
  className?: string;
}

const stateConfig: Record<ProspectorState, { label: string; color: string }> = {
  GREETING: { label: 'Saudação', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  QUALIFICATION: { label: 'Qualificação', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  ROI_ANCHORING: { label: 'Ancoragem ROI', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  NEGOTIATION: { label: 'Em Negociação', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  BOOKING: { label: 'Agendamento', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  NEGATIVE: { label: 'Negativa', color: 'bg-red-100 text-red-700 border-red-200' },
  CONVERTED: { label: 'Convertido', color: 'bg-green-100 text-green-700 border-green-200' },
};

export function StateBadge({ state, className }: StateBadgeProps) {
  const config = stateConfig[state] || { label: state, color: 'bg-gray-100 text-gray-700 border-gray-200' };

  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
      config.color,
      className
    )}>
      {config.label}
    </span>
  );
}
