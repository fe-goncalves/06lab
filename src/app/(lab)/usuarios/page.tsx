import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import UsuariosClient from "./usuarios-client";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id, role, id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (profile?.role !== "main" && profile?.role !== "supporter") redirect("/");

  const { data: users } = await supabase
    .from("user_profiles")
    .select("id, full_name, role, status, created_at")
    .eq("organization_id", profile?.organization_id ?? "")
    .order("created_at");

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Usuários</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Gerencie os usuários do painel administrativo.
        </p>
      </header>
      <UsuariosClient
        users={users ?? []}
        currentUserId={profile?.id ?? ""}
        currentRole={profile?.role ?? ""}
        organizationId={profile?.organization_id ?? ""}
      />
    </div>
  );
}