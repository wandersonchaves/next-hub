"use client";

import { TrendingUp, Users, Ticket } from "lucide-react";

interface ROICalculatorProps {
  weeklyVolume?: number;
  averageTicket?: number;
  conversionRate?: number;
}

export function ROICalculator({ 
  weeklyVolume = 100, 
  averageTicket = 150, 
  conversionRate = 0.15 
}: ROICalculatorProps) {
  // Cálculo: Volume Semanal * Ticket Médio * 4 semanas
  const potentialValue = weeklyVolume * averageTicket * 4;
  const estimatedROI = potentialValue * conversionRate;

  return (
    <div className="p-4 rounded-2xl border bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between text-emerald-700">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} />
          <span className="font-black text-[10px] uppercase tracking-widest">Inteligência de ROI</span>
        </div>
        <span className="bg-emerald-200/50 text-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-bold">
          CONV. {conversionRate * 100}%
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 bg-white/50 rounded-xl border border-emerald-100/50">
           <div className="flex items-center gap-1.5 mb-1">
              <Users size={12} className="text-emerald-600" />
              <p className="text-[9px] text-emerald-600 font-bold uppercase">Volume Mensal</p>
           </div>
           <p className="text-sm font-black text-emerald-900 leading-none">
              {(weeklyVolume * 4).toLocaleString('pt-BR')} <span className="text-[9px] font-medium opacity-60">Pacientes</span>
           </p>
        </div>
        <div className="p-2 bg-white/50 rounded-xl border border-emerald-100/50">
           <div className="flex items-center gap-1.5 mb-1">
              <Ticket size={12} className="text-emerald-600" />
              <p className="text-[9px] text-emerald-600 font-bold uppercase">Ticket Médio</p>
           </div>
           <p className="text-sm font-black text-emerald-900 leading-none">
              R$ {averageTicket.toLocaleString('pt-BR')}
           </p>
        </div>
      </div>

      <div className="pt-3 border-t border-emerald-200/30 grid grid-cols-1 gap-2">
        <div>
          <p className="text-[10px] text-emerald-600 font-bold uppercase mb-0.5">Retorno Estimado Mensal</p>
          <p className="text-2xl font-black text-emerald-900 tracking-tighter">
            R$ {estimatedROI.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="p-2 bg-emerald-900 text-emerald-50 rounded-xl text-center">
         <p className="text-[9px] font-medium leading-tight italic">
            "Este valor representa o faturamento recuperado apenas com a eliminação do No-Show."
         </p>
      </div>
    </div>
  );
}
