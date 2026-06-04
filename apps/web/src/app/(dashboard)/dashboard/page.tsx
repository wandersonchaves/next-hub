"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

export default function DashboardRedirect() {
  const { isLoaded, orgSlug } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      if (orgSlug) {
        router.push(`/${orgSlug}`);
      } else {
        // Handle case where user has no organization or logic to select one
        router.push("/onboarding"); // Or whatever fallback
      }
    }
  }, [isLoaded, orgSlug, router]);

  return <div className="flex h-screen items-center justify-center">Carregando contexto...</div>;
}
