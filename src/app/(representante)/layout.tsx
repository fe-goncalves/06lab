import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import RepresentanteSidebarClient from "./sidebar-client";
import { ToastContainer } from "@/app/(lab)/components/toast";

export default async function RepresentanteLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Confirma que é representante ativo — bloqueia admins que acessem /representante pela URL
  const { data: rep } = await supabase
    .from("representatives")
    .select("id, full_name, organization_id")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!rep) redirect("/");

  // Busca org para exibir nome/logo na sidebar
  const { data: org } = await supabase
    .from("organizations")
    .select("name, short_name, logo_url, favicon_url")
    .eq("id", rep.organization_id)
    .maybeSingle();

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-background)" }}>
      <RepresentanteSidebarClient
        repName={rep.full_name}
        orgName={org?.short_name ?? org?.name ?? "06LAB"}
        orgLogo={org?.favicon_url ?? org?.logo_url ?? null}
      />
      <main className="min-w-0 flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-background)" }}>
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}