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
    { data: categories },
    { data: editions },
  ] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).maybeSingle(),
    supabase.from("competitions")
      .select("id, full_name, short_name")
      .eq("organization_id", orgId)
      .neq("id", id)
      .order("full_name"),
    supabase.from("competition_categories")
      .select("id, label, display_order")
      .eq("competition_id", id)
      .order("display_order"),
    supabase.from("competition_editions")
      .select("id, status, season_id, seasons(name, years(value))")
      .eq("competition_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (error || !comp) redirect("/competicoes");

  const editionsList = (editions ?? []).map((e: any) => ({
    id: e.id,
    status: e.status,
    season_name: e.seasons?.name ?? "—",
    year_value: e.seasons?.years?.value ?? 0,
  }));

  return (
    <ConfiguracoesCompeticaoClient
      competition={comp}
      allCompetitions={others ?? []}
      categories={categories ?? []}
      editions={editionsList}
    />
  );
}