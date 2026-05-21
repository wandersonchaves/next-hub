import React from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn(
      "p-6 rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md",
      "flex flex-col gap-4",
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Icon size={20} />
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        {trend && (
          <div className={cn(
            "flex items-center text-xs font-medium px-2 py-1 rounded-full",
            trend.isPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
          )}>
            {trend.isPositive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
            {trend.value}%
          </div>
        )}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-6 rounded-xl border bg-card animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-9 w-9 bg-muted rounded-lg" />
      </div>
      <div className="flex items-end justify-between">
        <div className="h-8 w-20 bg-muted rounded" />
        <div className="h-5 w-12 bg-muted rounded-full" />
      </div>
    </div>
  );
}
