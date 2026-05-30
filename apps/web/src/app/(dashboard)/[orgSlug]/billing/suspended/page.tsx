import React from "react";
import Link from "next/link";
import { CreditCard, AlertTriangle, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuspendedPage({ params }: { params: { orgSlug: string } }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto border-4 border-rose-100">
            <AlertTriangle className="text-rose-500 w-10 h-10 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Acesso Suspenso</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Identificamos uma pendência financeira em sua conta. O acesso aos módulos especializados foi pausado temporariamente até a regularização.
            </p>
          </div>

          <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
             <p className="text-xs text-rose-700 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <CreditCard size={14} />
                Status: Inadimplente
             </p>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-4">
             <Button asChild className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 font-bold uppercase text-xs tracking-widest gap-2">
                <Link href={`/${params.orgSlug}/billing`}>
                   Ir para Pagamentos
                </Link>
             </Button>
             
             <Button variant="outline" asChild className="w-full h-12 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold uppercase text-xs tracking-widest gap-2">
                <a href="https://wa.me/5586994037788" target="_blank" rel="noopener noreferrer">
                   <MessageCircle size={18} />
                   Falar com Suporte
                </a>
             </Button>
          </div>

          <p className="text-[10px] text-slate-400 italic">
            "Regularize sua assinatura para restaurar todos os dados e automações imediatamente."
          </p>
        </div>
      </div>
    </div>
  );
}
