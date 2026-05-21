"use client";

import React from "react";
import { StatCard } from "@/components/ui/stat-card";
import { useParams } from "next/navigation";
import { 
  Users, 
  DollarSign, 
  Zap, 
  TrendingUp,
  BarChart3
} from "lucide-react";

export default function DashboardPage() {
  const { orgSlug } = useParams();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo de volta. Aqui está o que está acontecendo hoje no workspace {orgSlug}.</p>
      </div>

      {/* 4-Column Grid for Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Receita Total" 
          value="R$ 45.231,89" 
          icon={DollarSign} 
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard 
          title="Novas Assinaturas" 
          value="+2350" 
          icon={Users} 
          trend={{ value: 18.1, isPositive: true }}
        />
        <StatCard 
          title="Vendas" 
          value="+12,234" 
          icon={Zap} 
          trend={{ value: 19, isPositive: true }}
        />
        <StatCard 
          title="Ativos agora" 
          value="+573" 
          icon={TrendingUp} 
          trend={{ value: 201, isPositive: true }}
        />
      </div>

      {/* Charts Placeholder Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Visão Geral de Receita</h3>
            <BarChart3 size={20} className="text-muted-foreground" />
          </div>
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20 text-muted-foreground">
            [ Recharts Component Placeholder ]
          </div>
        </div>
        
        <div className="col-span-3 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-6">Atividade Recente</h3>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-muted border flex items-center justify-center text-xs font-bold">{i+1}</div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Novo usuário registrado</p>
                  <p className="text-xs text-muted-foreground">há {i+2} minutos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
