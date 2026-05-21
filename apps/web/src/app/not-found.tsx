import Link from 'next/link';
import { FileQuestion, ChevronLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mb-8">
        <FileQuestion size={40} className="text-primary" />
      </div>
      <h1 className="text-4xl font-black mb-2">Página não encontrada</h1>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Ops! O recurso que você está procurando não existe ou foi movido para um novo endereço.
      </p>
      <Link 
        href="/dashboard" 
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-95"
      >
        <ChevronLeft size={20} />
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
