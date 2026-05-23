"use client";

import { TrendingUp, DollarSign } from "lucide-react";

interface ROICalculatorProps {
  potentialValue: number;
  conversionRate?: number;
}

export function ROICalculator({ potentialValue, conversionRate = 0.15 }: ROICalculatorProps) {
  const estimatedROI = potentialValue * conversionRate;

  return (
    <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-100 space-y-3">
      <div className="flex items-center gap-2 text-emerald-700">
        <TrendingUp size={18} />
        <span className="font-bold text-sm uppercase tracking-tight">Projeção de ROI</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-emerald-600 font-medium uppercase">Valor Potencial</p>
          <p className="text-lg font-black text-emerald-900">
            R$ {potentialValue.toLocaleString('pt-BR')}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-emerald-600 font-medium uppercase">Expectativa Retorno</p>
          <p className="text-lg font-black text-emerald-900">
            R$ {estimatedROI.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-emerald-200/50">
        <p className="text-[9px] text-emerald-600 italic leading-tight">
          * Baseado na taxa de conversão média de {conversionRate * 100}% para este segmento.
        </p>
      </div>
    </div>
  );
}
