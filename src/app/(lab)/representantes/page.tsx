import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import RepresentantesClient from "./representantes-client";

export default async function RepresentantesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id, role")
    .eq("auth_user_id", user.id).maybeSingle();

  if (profile?.role !== "main" && profile?.role !== "supporter") redirect("/");

  const orgId = profile?.organization_id ?? "";

  const [{ data: representatives }, { data: teams }] = await Promise.all([
    supabase.from("representatives")
      .select("id, full_name, status, created_at, representative_team_access(team_id, teams(full_name))")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    supabase.from("teams")
      .select("id, full_name")
      .eq("organization_id", orgId)
      .order("full_name"),
  ]);

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Representantes</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Representantes têm acesso exclusivo ao elenco das equipes vinculadas, dentro das janelas de inscrição.
        </p>
      </header>
      <RepresentantesClient
        representatives={representatives ?? []}
        teams={teams ?? []}
        organizationId={orgId}
      />
    </div>
  );
}