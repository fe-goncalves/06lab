import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import CompeticaoHub from "./competicao-hub";

export default async function CompeticaoPage({
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
    compResult,
    editionsResult,
    seasonsResult,
    allTeamsResult,
  ] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).maybeSingle(),
    supabase.from("competition_editions")
      .select("id, season_id, status, custom_name, seasons(name, years(value))")
      .eq("competition_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("seasons")
      .select("id, name, years(value)")
      .eq("organization_id", orgId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("teams")
      .select("id, full_name, abbreviation, logo_url, is_virtual")
      .eq("organization_id", orgId).order("full_name"),
  ]);

  const comp = compResult?.data ?? null;
  const error = compResult?.error ?? null;
  const editions = editionsResult?.data ?? [];
  const seasons = seasonsResult?.data ?? [];
  const allTeams = allTeamsResult?.data ?? [];

  if (error) {
    console.error("[CompeticaoPage] erro ao buscar competição:", error);
  }

  if (error || !comp) redirect("/competicoes");

  const editionsList = (editions ?? []).map((e: any) => ({
    id: e.id,
    season_id: e.season_id,
    status: e.status,
    season_name: e.seasons?.name ?? "—",
    year_value: e.seasons?.years?.value ?? 0,
    custom_name: e.custom_name ?? null,
  }));

  const seasonsList = (seasons ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    year_value: s.years?.value ?? 0,
  }));

  return (
    <CompeticaoHub
      competition={comp}
      editions={editionsList}
      seasons={seasonsList}
      allTeams={allTeams ?? []}
      orgId={orgId}
    />
  );
}