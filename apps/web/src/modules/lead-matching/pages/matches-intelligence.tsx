import React, { useState, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/providers/auth-provider";
import { MatchScoreBadge } from "../components/match-score-badge";
import { MatchDetailsModal } from "../components/match-details-modal";
import { SlidersHorizontal, Eye, RefreshCw, User, Briefcase } from "lucide-react";

export default function MatchesIntelligence() {
  const { fetcher } = useApi();
  const { orgId } = useAuth();
  const [minScore, setMinScore] = useState<number>(0);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["matches", orgId, minScore],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", "9");
      if (pageParam) {
        params.set("cursor", pageParam as string);
      }
      if (minScore > 0) {
        params.set("minScore", minScore.toString());
      }

      return fetcher<{ items: any[]; nextCursor: string | null }>(
        `/v1/organizations/${orgId}/matches?${params.toString()}`
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!orgId,
  });

  useEffect(() => {
    if (!hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allMatches = data?.pages.flatMap((page) => page.items) || [];

  if (!orgId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Nenhuma organização ativa encontrada. Por favor selecione uma organização.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic text-foreground flex items-center gap-2">
            Nexus Match Intelligence
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o alinhamento em tempo real entre seus leads e as vagas agregadas.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border rounded-xl bg-background text-sm font-medium hover:bg-muted/50 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar Análises
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md shadow-sm">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Score Mínimo de Match ({minScore}%)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-sm font-bold bg-muted px-2.5 py-1 rounded-lg border">
              {minScore}%
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          Carregando inteligência de match...
        </div>
      ) : allMatches.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-2xl text-muted-foreground bg-muted/10">
          Nenhum match com pontuação superior a {minScore}% foi encontrado.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allMatches.map((match) => (
            <div
              key={match.id}
              className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-card/80 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> Candidato
                    </span>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {match.lead?.name}
                    </h3>
                  </div>
                  <MatchScoreBadge score={match.score} />
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Vaga
                  </span>
                  <div className="font-semibold text-sm text-foreground">
                    {match.job?.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {match.job?.company}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  "{match.explanation}"
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-border/40 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedMatch(match);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold tracking-tight transition-all duration-200"
                >
                  <Eye className="h-3.5 w-3.5" /> Ver Análise
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasNextPage && (
        <div
          ref={loaderRef}
          className="p-6 text-center text-xs text-muted-foreground"
        >
          {isFetchingNextPage ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              Carregando mais matches...
            </span>
          ) : (
            "Carregar mais"
          )}
        </div>
      )}

      <MatchDetailsModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        match={selectedMatch}
      />
    </div>
  );
}
