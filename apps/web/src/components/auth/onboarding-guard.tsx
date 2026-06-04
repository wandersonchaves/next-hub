"use client";

import { useAuth, useOrganizationList } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, orgId } = useAuth();
  const { userMemberships } = useOrganizationList();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !orgId && userMemberships.data?.length === 0) {
      // Allow them to stay if they have no orgs
    }
  }, [isLoaded, orgId, userMemberships, router]);

  return <>{children}</>;
}
