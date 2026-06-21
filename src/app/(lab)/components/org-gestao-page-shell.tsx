"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ORG_GESTAO_HREF } from "@/lib/org-gestao-nav";

/** Garante que o botão voltar do navegador retorne a Organização › Gestão. */
export function useOrgGestaoBackNavigation() {
  const router = useRouter();

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      router.replace(ORG_GESTAO_HREF);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);
}

export function OrgGestaoPageShell({ children }: { children: ReactNode }) {
  useOrgGestaoBackNavigation();
  return children;
}
