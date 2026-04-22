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

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const [
    { data: phase, error },
    { data: rounds },
    { data: matchups },
    { data: editionTeams },
    { data: roundLabels },
  ] = await Promise.all([
    supabase
      .from("phases")
      .select(
        "*, competition_editions(seasons(name), competitions(full_name))",
      )
      .eq("id", faseId)
      .maybeSingle(),
    supabase.from("rounds").select("id, name, custom_label, display_order")
      .eq("phase_id", faseId).order("display_order"),
    supabase.from("matchups")
      .select("id, round_label, team_a_id, team_b_id, is_completed, display_order, teams_a:teams!matchups_team_a_id_fkey(full_name, abbreviation), teams_b:teams!matchups_team_b_id_fkey(full_name, abbreviation)")
      .eq("phase_id", faseId).order("display_order"),
    supabase.from("edition_teams")
      .select("id, team_id, teams(id, full_name, abbreviation)")
      .eq("edition_id", edicaoId),
    supabase.from("phase_round_labels")
      .select("id, label, display_order")
      .eq("phase_type_code", "knockout")
      .order("display_order"),
  ]);

  if (error || !phase) redirect(`/competicoes/${competitionId}/edicoes/${edicaoId}`);

  return (
    <FaseClient
      phase={phase}
      rounds={rounds ?? []}
      matchups={matchups ?? []}
      editionTeams={editionTeams ?? []}
      roundLabels={roundLabels ?? []}
      competitionId={competitionId}
      edicaoId={edicaoId}
      competitionName={(phase as any)?.competition_editions?.competitions?.full_name ?? "Competição"}
      seasonName={(phase as any)?.competition_editions?.seasons?.name ?? "Temporada"}
    />
  );
}