import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import RodadaClient from "./rodada-client";

export default async function RodadaPage({
  params,
}: {
  params: Promise<{ id: string; edicaoId: string; faseId: string; rodadaId: string }>;
}) {
  const { id: competitionId, edicaoId, faseId, rodadaId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [
    { data: round, error },
    { data: matches },
    { data: editionTeams },
    { data: venues },
  ] = await Promise.all([
    supabase.from("rounds")
      .select("id, name, custom_label, phase_id")
      .eq("id", rodadaId).maybeSingle(),
    supabase.from("matches")
      .select("id, match_date, match_time, status, score_a, score_b, finish_type, team_a_id, team_b_id, venues(full_name), teams_a:teams!matches_team_a_id_fkey(full_name, abbreviation, logo_url), teams_b:teams!matches_team_b_id_fkey(full_name, abbreviation, logo_url)")
      .eq("round_id", rodadaId).order("match_date"),
    supabase.from("edition_teams")
      .select("id, team_id, teams(id, full_name, abbreviation, logo_url)")
      .eq("edition_id", edicaoId),
    supabase.from("venues")
      .select("id, full_name").eq("organization_id", orgId).order("full_name"),
  ]);

  if (error || !round) redirect(`/competicoes/${competitionId}/edicoes/${edicaoId}/fases/${faseId}`);

  return (
    <RodadaClient
      round={round}
      matches={matches ?? []}
      editionTeams={editionTeams ?? []}
      venues={venues ?? []}
      competitionId={competitionId}
      edicaoId={edicaoId}
      faseId={faseId}
    />
  );
}