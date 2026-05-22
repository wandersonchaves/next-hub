"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dog, Plus, Search } from "lucide-react";
import { PetForm } from "@/components/widgets/nexus-pet/pet-form";

interface Pet {
  id: string;
  name: string;
  breed: string;
  size: string;
  lastBathAt: string;
  tutorName: string;
}

export default function PetsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const columns = [
    { header: "Nome", accessorKey: "name" as keyof Pet },
    { header: "Raça", accessorKey: "breed" as keyof Pet },
    { 
      header: "Porte", 
      accessorKey: "size" as keyof Pet,
      render: (val: string) => (
        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-muted uppercase tracking-wider">
          {val}
        </span>
      )
    },
    { header: "Último Banho", accessorKey: "lastBathAt" as keyof Pet },
    { header: "Tutor", accessorKey: "tutorName" as keyof Pet },
    {
      header: "Ações",
      accessorKey: "id" as keyof Pet,
      render: () => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">Ficha</Button>
          <Button variant="ghost" size="sm" className="text-primary">Agendar</Button>
        </div>
      )
    }
  ];

  const data: Pet[] = [
    { id: "1", name: "Rex", breed: "Vira-lata", size: "MEDIUM", lastBathAt: "2024-05-10", tutorName: "Alice Santos" },
    { id: "2", name: "Bela", breed: "Poodle", size: "SMALL", lastBathAt: "2024-05-15", tutorName: "Bruno Rocha" },
    { id: "3", name: "Max", breed: "Golden Retriever", size: "LARGE", lastBathAt: "2024-05-02", tutorName: "Carla Lima" },
    { id: "4", name: "Luna", breed: "Shih Tzu", size: "SMALL", lastBathAt: "2024-05-18", tutorName: "Daniel Silva" },
  ];

  const filteredData = data.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Pets</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os animais cadastrados na sua unidade.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cadastro
        </Button>
      </div>

      {isFormOpen && (
        <PetForm 
          onClose={() => setIsFormOpen(false)} 
          onSuccess={() => {
            setIsFormOpen(false);
            // Refresh list logic
          }} 
        />
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar pet ou tutor..."
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
