import React from 'react';
import { cn } from '@/lib/utils';

interface MatchScoreBadgeProps {
  score: number;
  className?: string;
}

export function MatchScoreBadge({ score, className }: MatchScoreBadgeProps) {
  const getColorClass = (val: number) => {
    if (val >= 80) return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20';
    if (val >= 50) return 'bg-amber-500/15 text-amber-500 border-amber-500/20';
    return 'bg-rose-500/15 text-rose-500 border-rose-500/20';
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black tracking-tight border shadow-sm transition-all duration-300',
        getColorClass(score),
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', 
          score >= 80 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-rose-400'
        )}></span>
        <span className={cn('relative inline-flex rounded-full h-2 w-2',
          score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
        )}></span>
      </span>
      {score}% Match
    </span>
  );
}
