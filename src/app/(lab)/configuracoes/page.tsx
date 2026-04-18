import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ConfiguracoesClient from "./configuracoes-client";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id, role, full_name, id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (profile?.role !== "main") redirect("/");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, custom_domain, status, logo_url")
    .eq("id", profile?.organization_id ?? "")
    .maybeSingle();

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Configurações</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>Gerencie as configurações da organização.</p>
      </header>
      <ConfiguracoesClient org={org} userProfile={profile} />
    </div>
  );
}