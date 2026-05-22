"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";

interface Procedure {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export default function ProceduresPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const columns = [
    { header: "Procedimento", accessorKey: "name" as keyof Procedure },
    { 
      header: "Duração", 
      accessorKey: "duration" as keyof Procedure,
      render: (val: number) => `${val} min`
    },
    { 
      header: "Preço", 
      accessorKey: "price" as keyof Procedure,
      render: (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    {
      header: "Ações",
      accessorKey: "id" as keyof Procedure,
      render: (val: string) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">Editar</Button>
          <Button variant="ghost" size="sm" className="text-destructive">Excluir</Button>
        </div>
      )
    }
  ];

  const data: Procedure[] = [
    { id: "1", name: "Botox (Fronte)", duration: 30, price: 450.00 },
    { id: "2", name: "Preenchimento Labial", duration: 45, price: 1200.00 },
    { id: "3", name: "Limpeza de Pele Profunda", duration: 60, price: 180.00 },
    { id: "4", name: "Peeling Químico", duration: 40, price: 350.00 },
    { id: "5", name: "Harmonização Facial", duration: 120, price: 3500.00 },
  ];

  const filteredData = data.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Procedimentos</h1>
          <p className="text-muted-foreground">
            Catálogo de serviços oferecidos pela sua clínica.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Procedimento
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar procedimento..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
      />
    </div>
  );
}
