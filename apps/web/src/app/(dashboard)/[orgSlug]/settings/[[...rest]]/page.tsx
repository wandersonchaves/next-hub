"use client";

import { useUser } from "@/providers/auth-provider";

export default function SettingsPage() {
  const { user } = useUser();

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-3xl font-black mb-6">Configurações do Perfil</h1>
      <div className="bg-card border rounded-2xl p-8">
         <p><strong>Nome:</strong> {user?.name}</p>
         <p><strong>Email:</strong> {user?.email}</p>
      </div>
    </div>
  );
}
