import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SignIn } from "@clerk/nextjs";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        <div className="flex items-center gap-3 font-black text-3xl tracking-tighter text-foreground mb-4">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20">
            N
          </div>
          NextHub
        </div>
        
        <SignIn 
          appearance={{
            elements: {
              rootBox: "w-full flex justify-center",
              card: "shadow-none bg-transparent border-none",
              formButtonPrimary: "bg-primary hover:bg-primary/90 text-sm normal-case rounded-xl h-11",
              footer: "hidden", // Hide "Already have an account? Sign in" etc since it's admin provisioned
              headerTitle: "text-2xl font-black tracking-tight",
              headerSubtitle: "text-muted-foreground font-medium"
            }
          }}
          routing="hash" // Use hash routing to stay on same page if needed or redirect
        />
        
        <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-50">
          Enterprise Control Tower • Versão 2.0
        </p>
      </div>
    </div>
  );
}
