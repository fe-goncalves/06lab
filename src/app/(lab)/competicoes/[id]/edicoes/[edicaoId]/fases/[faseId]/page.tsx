import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import FaseClient from "./fase-client";

export default async function FasePage({
  params,
}: {
  params: Promise<{ id: string; edicaoId: string; faseId: string }>;
}) {
  const { id: competitionId, edicaoId, faseId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: phase, error } = await supabase
    .from("phases").select("*").eq("id", faseId).maybeSingle();

  if (error || !phase) redirect(`/competicoes/${competitionId}`);

  const [
    { data: edition },
    { data: rounds },
    { data: matchups },
    { data: editionTeams },
    { data: phaseTeams },
    { data: groups },
  ] = await Promise.all([
    supabase.from("competition_editions")
      .select("seasons(name), competitions(full_name)")
      .eq("id", edicaoId).maybeSingle(),
    supabase.from("rounds")
      .select("id, name, custom_label, display_order, is_current")
      .eq("phase_id", faseId).order("display_order"),
    supabase.from("matchups")
      .select("id, round_label, team_a_id, team_b_id, is_completed, is_current, display_order, teams_a:teams!matchups_team_a_id_fkey(id, full_name, abbreviation, logo_url), teams_b:teams!matchups_team_b_id_fkey(id, full_name, abbreviation, logo_url)")
      .eq("phase_id", faseId).order("display_order"),
    supabase.from("edition_teams")
      .select("id, team_id, teams(id, full_name, abbreviation, logo_url)")
      .eq("edition_id", edicaoId)
      .eq("is_free_agent_pool", false),
    supabase.from("phase_teams")
      .select("id, edition_team_id")
      .eq("phase_id", faseId),
    supabase.from("groups")
      .select("id, name, custom_label, display_order")
      .eq("phase_id", faseId).order("display_order"),
  ]);

  // Busca group_teams separadamente para evitar query aninhada
  const groupIds = (groups ?? []).map((g: any) => g.id);
  let groupTeams: any[] = [];
  if (groupIds.length > 0) {
    const { data: gt } = await supabase
      .from("group_teams")
      .select("id, group_id, edition_team_id")
      .in("group_id", groupIds);
    groupTeams = gt ?? [];
  }

  return (
    <FaseClient
      phase={phase}
      rounds={rounds ?? []}
      editionTeams={editionTeams ?? []}
      phaseTeams={phaseTeams ?? []}
      groups={groups ?? []}
      groupTeams={groupTeams}
      competitionId={competitionId}
      edicaoId={edicaoId}
      competitionName={(edition as any)?.competitions?.full_name ?? "Competição"}
      seasonName={(edition as any)?.seasons?.name ?? "Temporada"}
    />
  );
}