import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Briefcase, MapPin, DollarSign, Award, CheckCircle2, AlertCircle } from "lucide-react";
import { MatchScoreBadge } from "./match-score-badge";

interface MatchDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  match: any;
}

export function MatchDetailsModal({ isOpen, onOpenChange, match }: MatchDetailsModalProps) {
  if (!match) return null;

  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (min === null && max === null) return "Não especificado";
    const curr = currency || "USD";
    const formatNum = (val: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(val);

    if (min !== null && max !== null) return `${formatNum(min)} - ${formatNum(max)}`;
    if (min !== null) return `A partir de ${formatNum(min)}`;
    if (max !== null) return `Até ${formatNum(max)}`;
    return "Não especificado";
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-all duration-300" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card border border-border/50 rounded-2xl shadow-2xl p-6 z-50 outline-none max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <Dialog.Title className="text-xl font-bold uppercase tracking-wider flex items-center gap-2">
              <Award className="h-5 w-5 text-primary animate-pulse" /> Detalhes da Inteligência de Match
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-xl bg-muted/35 border border-border/40">
              <div>
                <h3 className="font-bold text-lg text-foreground">{match.lead?.name}</h3>
                <p className="text-xs text-muted-foreground">{match.lead?.email || match.lead?.phone}</p>
              </div>
              <MatchScoreBadge score={match.score} />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Vaga Desejada</h4>
              <div className="p-4 rounded-xl border border-border/50 space-y-2 bg-card">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-primary" /> {match.job?.title}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {match.job?.company}
                </div>
                <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-rose-500/80" /> {match.job?.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    {formatSalary(match.job?.minSalary, match.job?.maxSalary, match.job?.currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Análise de IA</h4>
              <p className="text-sm text-foreground bg-muted/20 p-4 rounded-xl border border-border/30 italic leading-relaxed">
                "{match.explanation}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 space-y-3">
                <h5 className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Competências Alinhadas ({match.matchedSkills?.length || 0})
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {match.matchedSkills?.length > 0 ? (
                    match.matchedSkills.map((skill: string) => (
                      <span key={skill} className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 capitalize">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Nenhuma competência mapeada</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 space-y-3">
                <h5 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Competências Faltantes ({match.missingSkills?.length || 0})
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {match.missingSkills?.length > 0 ? (
                    match.missingSkills.map((skill: string) => (
                      <span key={skill} className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-500/15 text-rose-600 border border-rose-500/20 capitalize">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Todas as competências alinhadas!</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
