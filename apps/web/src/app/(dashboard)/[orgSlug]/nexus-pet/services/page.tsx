"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Scissors, Plus, Search } from "lucide-react";

interface PetService {
  id: string;
  name: string;
  price: number;
  duration: number;
  type: string;
}

export default function PetServicesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const columns = [
    { header: "Serviço", accessorKey: "name" as keyof PetService },
    { 
      header: "Preço", 
      accessorKey: "price" as keyof PetService,
      render: (val: number) => `R$ ${val.toFixed(2)}`
    },
    { 
      header: "Duração", 
      accessorKey: "duration" as keyof PetService,
      render: (val: number) => `${val} min`
    },
    { 
      header: "Tipo", 
      accessorKey: "type" as keyof PetService,
      render: (val: string) => (
        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-primary/10 text-primary uppercase">
          {val}
        </span>
      )
    },
    {
      header: "Ações",
      accessorKey: "id" as keyof PetService,
      render: () => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">Editar</Button>
        </div>
      )
    }
  ];

  const data: PetService[] = [
    { id: "1", name: "Banho Simples", price: 60.00, duration: 45, type: "BATH" },
    { id: "2", name: "Banho e Tosa Higiênica", price: 90.00, duration: 90, type: "GROOMING" },
    { id: "3", name: "Tosa de Raça (Tesoura)", price: 150.00, duration: 120, type: "GROOMING" },
    { id: "4", name: "Consulta Veterinária", price: 200.00, duration: 30, type: "VET" },
  ];

  const filteredData = data.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serviços do Pet Shop</h1>
          <p className="text-muted-foreground">
            Configure os pacotes e preços de banho, tosa e consultas.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar serviço..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
      />
    </div>
  );
}
