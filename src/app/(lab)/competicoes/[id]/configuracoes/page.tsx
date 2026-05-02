import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ConfiguracoesCompeticaoClient from "./configuracoes-client";

export default async function ConfiguracoesCompeticaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [
    { data: comp, error },
    { data: others },
    { data: globalCategories },
    { data: editions },
    { data: seasons },
  ] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).maybeSingle(),
    supabase.from("competitions")
      .select("id, full_name, short_name")
      .eq("organization_id", orgId).neq("id", id).order("full_name"),
    supabase.from("categories")
      .select("id, label, display_order")
      .eq("organization_id", orgId).order("display_order"),
    supabase.from("competition_editions")
      .select("id, status, season_id, custom_name, is_current, seasons(id, name, year_id, years(value))")
      .eq("competition_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("seasons")
      .select("id, name, year_id, years(value)")
      .eq("organization_id", orgId)
      .order("display_order"),
  ]);

  if (error || !comp) redirect("/competicoes");

  const editionsList = (editions ?? []).map((e: any) => ({
    id: e.id,
    status: e.status,
    season_id: e.season_id,
    custom_name: e.custom_name ?? null,
    is_current: e.is_current ?? false,
    season_name: e.seasons?.name ?? "—",
    year_value: e.seasons?.years?.value ?? 0,
  }));

  // Ordena: ano decrescente, depois nome decrescente
  editionsList.sort((a, b) => {
    if (b.year_value !== a.year_value) return b.year_value - a.year_value;
    return b.season_name.localeCompare(a.season_name);
  });

  const seasonsList = (seasons ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    year_value: s.years?.value ?? 0,
  }));

  return (
    <ConfiguracoesCompeticaoClient
      competition={comp}
      allCompetitions={others ?? []}
      globalCategories={globalCategories ?? []}
      editions={editionsList}
      seasons={seasonsList}
    />
  );
}