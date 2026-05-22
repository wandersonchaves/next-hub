"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { AppointmentForm } from "@/components/widgets/nexus-health/appointment-form";

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);

  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const hours = Array.from({ length: 12 }, (_, i) => `${i + 8}:00`);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda da Clínica</h1>
          <p className="text-muted-foreground">
            Gerencie os horários e profissionais da sua filial.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {isFormOpen && (
        <AppointmentForm 
          branchId="main" 
          onClose={() => setIsFormOpen(false)} 
          onSuccess={() => {
            setIsFormOpen(false);
            // Aqui poderíamos recarregar os dados
          }} 
        />
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Maio 2024</h2>
            <div className="flex items-center border rounded-md">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm">Hoje</Button>
          </div>
          <div className="flex items-center gap-2">
            <select className="text-sm border rounded-md p-1 bg-background">
              <option>Filial Principal</option>
              <option>Unidade Jardins</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 border-b">
              <div className="p-2 border-r bg-muted/10"></div>
              {days.map((day, i) => (
                <div key={i} className="p-2 text-center border-r last:border-r-0 font-medium text-sm">
                  {day} <span className="text-muted-foreground ml-1">2{i}</span>
                </div>
              ))}
            </div>

            <div className="relative">
              {hours.map((hour, i) => (
                <div key={i} className="grid grid-cols-8 border-b last:border-b-0 h-20">
                  <div className="p-2 border-r text-xs text-muted-foreground text-right pr-4 bg-muted/5">
                    {hour}
                  </div>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <div key={j} className="border-r last:border-r-0 relative group hover:bg-muted/30 transition-colors cursor-pointer">
                      {/* Exemplo de agendamento ocupado */}
                      {i === 2 && j === 1 && (
                        <div className="absolute inset-x-1 top-1 bottom-1 rounded bg-primary/20 border-l-4 border-primary p-2 z-10">
                          <p className="text-[10px] font-bold text-primary truncate">BOTÓX</p>
                          <p className="text-[9px] text-primary/80 truncate">Maria Oliveira</p>
                        </div>
                      )}
                      
                      {i === 4 && j === 3 && (
                        <div className="absolute inset-x-1 top-1 bottom-1 rounded bg-blue-100 border-l-4 border-blue-500 p-2 z-10">
                          <p className="text-[10px] font-bold text-blue-700 truncate">PREENCHIMENTO</p>
                          <p className="text-[9px] text-blue-600 truncate">João Santos</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
