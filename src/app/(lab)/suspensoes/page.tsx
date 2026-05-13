import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import SuspensoesClient from "./suspensoes-client";

export default async function SuspensoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [{ data: suspensions }, { data: editions }] = await Promise.all([
    supabase.from("suspensions")
      .select(`
        id, athlete_id, scope_type, scope_edition_id,
        starts_at, games_total, games_remaining, is_active, reason,
        athletes(full_name, surname),
        competition_editions(
          id,
          seasons(name),
          competitions(full_name)
        )
      `)
      .eq("organization_id", orgId)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("competition_editions")
      .select("id, seasons(name), competitions!inner(full_name, organization_id)")
      .eq("competitions.organization_id", orgId),
  ]);

  const suspensionsList = (suspensions ?? []).map((s: any) => ({
    id: s.id,
    athlete_id: s.athlete_id,
    athlete_name: s.athletes?.full_name ?? "—",
    scope_type: s.scope_type,
    scope_edition_id: s.scope_edition_id ?? "",
    edition_label: s.competition_editions
      ? `${s.competition_editions.competitions?.full_name ?? "—"} · ${s.competition_editions.seasons?.name ?? "—"}`
      : null,
    starts_at: s.starts_at,
    games_total: s.games_total,
    games_remaining: s.games_remaining,
    is_active: s.is_active,
    reason: s.reason ?? "",
  }));

  const editionsList = (editions ?? []).map((e: any) => ({
    id: e.id,
    name: e.seasons?.name ?? "—",
    competition_name: e.competitions?.full_name ?? "—",
  }));

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Suspensões</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Visão consolidada de todas as suspensões. Para criar ou editar, acesse o hub da competição.
        </p>
      </header>
      <SuspensoesClient suspensions={suspensionsList} editions={editionsList} />
    </div>
  );
}