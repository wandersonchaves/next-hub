"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function ProspectorSyncGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 4000);

    return () => clearInterval(interval);
  }, [router]);

  return <>{children}</>;
}

export default function ProspectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProspectorSyncGuard>{children}</ProspectorSyncGuard>;
}
