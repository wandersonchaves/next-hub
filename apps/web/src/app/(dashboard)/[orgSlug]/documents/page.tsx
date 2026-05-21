"use client";

import React from "react";
import { DataTable } from "@/components/ui/data-table";
import { FileText, Download, Eye, MoreVertical } from "lucide-react";
import { useParams } from "next/navigation";

// Agora como Client Component, podemos passar funções de renderização sem erros
const documentColumns = [
  { header: "Nome", accessorKey: "name", render: (val: string) => (
    <div className="flex items-center gap-3">
      <FileText size={18} className="text-blue-500" />
      <span className="font-medium">{val}</span>
    </div>
  )},
  { header: "Tipo", accessorKey: "type" },
  { header: "Última Modificação", accessorKey: "updatedAt" },
  { header: "Ações", accessorKey: "id", render: () => (
    <div className="flex items-center gap-2">
      <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
      <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"><Download size={16} /></button>
      <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"><MoreVertical size={16} /></button>
    </div>
  )},
];

const mockDocs = [
  { id: "1", name: "Relatório Mensal - Abril.pdf", type: "PDF", updatedAt: "há 2 horas" },
  { id: "2", name: "Contrato de Parceria.docx", type: "Word", updatedAt: "há 1 dia" },
  { id: "3", name: "Planilha de Gastos.xlsx", type: "Excel", updatedAt: "há 3 dias" },
];

export default function DocumentsPage() {
  const { orgSlug } = useParams();

  return (
    <div className="space-y-6 page-transition">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground">Gerencie seus arquivos e documentos enterprise.</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <DataTable columns={documentColumns as any} data={mockDocs} />
      </div>
    </div>
  );
}
