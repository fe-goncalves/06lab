import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import RankingsClient from "./rankings-client";

export default async function RankingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [{ data: ranking }, { data: years }, { data: seasons }, { data: categories }] = await Promise.all([
    supabase.from("team_ranking_cache")
      .select("id, team_id, total_points, position, teams(full_name, abbreviation, logo_url, primary_color)")
      .eq("organization_id", orgId)
      .order("position"),
    supabase.from("years").select("id, value").eq("organization_id", orgId).order("value", { ascending: false }),
    supabase.from("seasons").select("id, name, year_id").eq("organization_id", orgId).order("display_order"),
    supabase.from("ranking_categories").select("id, code, label, description").order("display_order"),
  ]);

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Rankings</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Classificação geral das equipes por pontuação acumulada.
        </p>
      </header>
      <RankingsClient
        ranking={ranking ?? []}
        years={years ?? []}
        seasons={seasons ?? []}
        categories={categories ?? []}
        organizationId={orgId}
      />
    </div>
  );
}