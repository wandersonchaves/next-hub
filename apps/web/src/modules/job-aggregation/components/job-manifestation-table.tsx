import React, { useState, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { Search, Briefcase, MapPin, DollarSign, ExternalLink, RefreshCw } from "lucide-react";

interface JobManifestationTableProps {
  organizationId: string;
}

export function JobManifestationTable({ organizationId }: JobManifestationTableProps) {
  const { fetcher } = useApi();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["jobs", organizationId, debouncedSearch, providerFilter],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", "10");
      if (pageParam) {
        params.set("cursor", pageParam as string);
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      if (providerFilter) {
        params.set("status", providerFilter);
      }

      return fetcher<{ items: any[]; nextCursor: string | null }>(
        `/v1/organizations/${organizationId}/jobs?${params.toString()}`
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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

  const allJobs = data?.pages.flatMap((page) => page.items) || [];

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

  const getProviderBadge = (provider: string) => {
    const name = provider.toLowerCase();
    if (name === "greenhouse") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          Greenhouse
        </span>
      );
    }
    if (name === "lever") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
          Lever
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">
        {provider}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl border border-border/50 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por cargo, empresa ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all w-full"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto justify-end">
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-4 py-2 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          >
            <option value="">Todos os Provedores</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30 text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                <th className="p-4">Vaga</th>
                <th className="p-4">Localização</th>
                <th className="p-4">Compensação</th>
                <th className="p-4">Provedor</th>
                <th className="p-4">Atualizado Em</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Carregando vagas...
                  </td>
                </tr>
              ) : allJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhuma vaga encontrada.
                  </td>
                </tr>
              ) : (
                allJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="transition-all duration-300 hover:bg-muted/30 group"
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {job.title}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Briefcase className="h-3 w-3" /> {job.company}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-rose-500/80" /> {job.location}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                        {formatSalary(job.compensation?.min, job.compensation?.max, job.compensation?.currency)}
                      </span>
                    </td>
                    <td className="p-4">{getProviderBadge(job.provider)}</td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-4 text-right">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {hasNextPage && (
          <div
            ref={loaderRef}
            className="p-4 text-center text-xs text-muted-foreground border-t border-border/40 bg-muted/10"
          >
            {isFetchingNextPage ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                Carregando mais vagas...
              </span>
            ) : (
              "Role para carregar mais"
            )}
          </div>
        )}
      </div>
    </div>
  );
}
