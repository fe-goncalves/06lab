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
    .from("phases")
    .select("*")
    .eq("id", faseId)
    .maybeSingle();

  if (error || !phase) redirect(`/competicoes/${competitionId}/edicoes/${edicaoId}`);

  const [
    { data: edition },
    { data: rounds },
    { data: matchups },
    { data: editionTeams },
    { data: roundLabels },
    { data: standings },
    { data: topScorers },
  ] = await Promise.all([
    supabase.from("competition_editions")
      .select("seasons(name), competitions(full_name)")
      .eq("id", edicaoId).maybeSingle(),
    supabase.from("rounds").select("id, name, custom_label, display_order").eq("phase_id", faseId).order("display_order"),
    supabase.from("matchups").select("id, round_label, team_a_id, team_b_id, is_completed, display_order, teams_a:teams!matchups_team_a_id_fkey(full_name, abbreviation), teams_b:teams!matchups_team_b_id_fkey(full_name, abbreviation)").eq("phase_id", faseId).order("display_order"),
    supabase.from("edition_teams").select("id, team_id, teams(id, full_name, abbreviation, logo_url)").eq("edition_id", edicaoId),
    supabase.from("phase_round_labels").select("id, label, display_order").eq("phase_type_code", "knockout").order("display_order"),
    supabase.from("team_edition_stats").select("*, teams(id, full_name, abbreviation, logo_url, primary_color)").eq("edition_id", edicaoId).order("points", { ascending: false }).order("goal_difference", { ascending: false }).order("goals_for", { ascending: false }),
    supabase.from("athlete_edition_stats").select("*, athletes(id, full_name, surname, photo_url), team:teams(id, full_name, abbreviation, logo_url)").eq("edition_id", edicaoId).gt("goals", 0).order("goals", { ascending: false }).order("assists", { ascending: false }).limit(20),
  ]);

  const competitionName = (edition as any)?.competitions?.full_name ?? "Competição";
  const seasonName = (edition as any)?.seasons?.name ?? "Temporada";

  return (
    <FaseClient
      phase={phase}
      rounds={rounds ?? []}
      matchups={matchups ?? []}
      editionTeams={editionTeams ?? []}
      roundLabels={roundLabels ?? []}
      competitionId={competitionId}
      edicaoId={edicaoId}
      competitionName={competitionName}
      seasonName={seasonName}
      standings={standings ?? []}
      topScorers={topScorers ?? []}
    />
  );
}