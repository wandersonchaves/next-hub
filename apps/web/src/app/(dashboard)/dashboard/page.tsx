"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

/**
 * Component to handle dashboard entry point and redirect to the correct tenant slug.
 * Hydration safe and loop protected.
 */
export default function DashboardRedirect() {
  const { isLoaded, orgSlug } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 1. Wait for auth to be loaded from cookies
    if (!isLoaded) return;

    // 2. Ensure we are in the browser
    if (typeof window === "undefined") return;

    // 3. Handle redirection logic
    if (orgSlug) {
      router.replace(`/${orgSlug}`);
    } else {
      // If no organization is found, maybe redirect to a selection page or onboarding
      // router.replace("/onboarding"); 
      // For now, let's just log it if we haven't implemented onboarding yet
      console.warn("User has no active organization context.");
    }
  }, [isLoaded, orgSlug, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-muted/5">
      <div className="flex flex-col items-center gap-4 text-center">
         <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
         <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando Workspace...</p>
      </div>
    </div>
  );
}
