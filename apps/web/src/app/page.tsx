import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { 
  Check, 
  ShieldCheck, 
  Zap, 
  Globe, 
  ChevronRight, 
  Github,
  BarChart3,
  Layers,
  Cpu
} from 'lucide-react';
import { ModeToggle } from '@/components/layout/mode-toggle';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xl tracking-tighter">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">E</div>
            ENTERPRISE
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Preços</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            {userId ? (
              <Link 
                href="/dashboard" 
                className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                Acessar Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold hover:opacity-80 transition-opacity">
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                  Começar Agora
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(var(--primary-rgb),0.08)_0%,transparent_100%)]" />
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6 animate-in fade-in slide-in-from-top-4 duration-1000">
            <Zap size={14} />
            NOVA VERSÃO 2.0 DISPONÍVEL
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            Escalabilidade <span className="text-primary italic">Enterprise</span> <br /> 
            sem a complexidade.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            O Starter Kit definitivo para SaaS B2B. Segurança bancária, 
            multi-tenancy nativo e performance de nível global.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <Link 
              href="/register" 
              className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 group"
            >
              Iniciar meu SaaS <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="https://github.com" 
              className="w-full sm:w-auto border bg-card px-8 py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 hover:bg-muted transition-colors"
            >
              <Github size={20} /> Ver no GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30 border-y">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Construído para Performance</h2>
            <p className="text-muted-foreground">Tudo o que você precisa para sair do zero ao IPO.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                title: "Multi-tenancy Isolado", 
                desc: "Dados separados por organização com segurança nível bancário.",
                icon: ShieldCheck
              },
              { 
                title: "IA Nativa", 
                desc: "Integração pronta com modelos LLM para agentes inteligentes.",
                icon: Cpu
              },
              { 
                title: "Analíticos em Tempo Real", 
                desc: "Dashboard completo com métricas de negócio e performance.",
                icon: BarChart3
              },
              { 
                title: "Infra Escalável", 
                desc: "Pronto para Kubernetes, AWS e deploys automatizados.",
                icon: Layers
              },
              { 
                title: "Edge Ready", 
                desc: "Middleware na edge para latência global mínima.",
                icon: Globe
              },
              { 
                title: "Faturamento Stripe", 
                desc: "Gestão de assinaturas, planos e checkout integrado.",
                icon: Zap
              }
            ].map((feature, i) => (
              <div key={i} className="bg-card p-8 rounded-3xl border hover:shadow-xl hover:shadow-primary/5 transition-all group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Planos Transparentes</h2>
            <p className="text-muted-foreground">Escolha o plano ideal para o seu momento atual.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "Iniciante", price: "0", features: ["Até 3 membros", "1 Organização", "Suporte Comunitário"] },
              { name: "Pro", price: "49", popular: true, features: ["Membros ilimitados", "10 Organizações", "IA Ilimitada", "Suporte 24/7"] },
              { name: "Enterprise", price: "199", features: ["White-label Total", "Single Sign-On (SSO)", "SLA de 99.9%", "Gerente de Conta"] }
            ].map((plan, i) => (
              <div key={i} className={cn(
                "relative p-8 rounded-3xl border bg-card flex flex-col",
                plan.popular && "border-primary shadow-2xl shadow-primary/10 scale-105 z-10"
              )}>
                {plan.popular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                    Mais Popular
                  </span>
                )}
                <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black">R${plan.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={16} className="text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/register" 
                  className={cn(
                    "w-full py-3 rounded-xl font-bold text-sm text-center transition-all",
                    plan.popular ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted hover:bg-muted/80"
                  )}
                >
                  Selecionar {plan.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-muted/30 border-t">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Dúvidas Frequentes</h2>
          <div className="space-y-6">
            {[
              { q: "O código é meu?", a: "Sim, ao adquirir o kit você tem posse total do código-fonte para modificar e hospedar onde desejar." },
              { q: "Quais tecnologias são usadas?", a: "Next.js 14, NestJS, Prisma, PostgreSQL, Clerk, Stripe e Tailwind CSS." },
              { q: "Existe suporte para Multi-tenancy?", a: "Absolutamente. O isolamento de dados por organização é a funcionalidade core deste boilerplate." }
            ].map((item, i) => (
              <div key={i} className="bg-card p-6 rounded-2xl border">
                <h4 className="font-bold mb-2">{item.q}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t text-center text-muted-foreground text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Enterprise SaaS Starter Kit. Todos os direitos reservados.</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="#" className="hover:text-foreground">Privacidade</a>
            <a href="#" className="hover:text-foreground">Termos</a>
            <a href="#" className="hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
