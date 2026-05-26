"use client";

import { MessageSquare } from "lucide-react";

export default function ProspectorChatEmptyPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 space-y-4 animate-in fade-in duration-700">
      <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center shadow-inner border border-muted/50">
        <MessageSquare size={32} className="text-muted-foreground/40" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-black uppercase tracking-tighter text-muted-foreground text-sm italic">Nexus Intelligence</p>
        <p className="text-xs text-muted-foreground font-medium">Selecione um lead no pipeline para iniciar o chat assistido</p>
      </div>
    </div>
  );
}
