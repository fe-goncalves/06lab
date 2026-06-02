import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EquipeEdicaoClient from "@/app/(lab)/competicoes/[id]/edicoes/[edicaoId]/equipes/[teamId]/equipe-edicao-client";
import SemClubeClient from "@/app/(lab)/competicoes/[id]/edicoes/[edicaoId]/equipes/[teamId]/sem-clube-client";

export async function renderEquipeEdicaoPage(
  competitionId: string,
  edicaoId: string,
  teamId: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const { data: editionTeam } = await supabase
    .from("edition_teams")
    .select("id, team_id, arrival_origin, is_free_agent_pool, teams(id, full_name, short_name, abbreviation, logo_url, primary_color, secondary_color)")
    .eq("edition_id", edicaoId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!editionTeam) {
    redirect(`/competicoes/${competitionId}?edicao=${edicaoId}&aba=competicao&comp=equipes`);
  }

  const { data: allEditionTeamsForFilter } = await supabase
    .from("edition_teams")
    .select("id")
    .eq("edition_id", edicaoId);
  const allEditionTeamIds = (allEditionTeamsForFilter ?? []).map((e: { id: string }) => e.id);

  const [
    { data: competition },
    { data: edition },
    { data: rosterEntries },
    { data: allAthletes },
    { data: currentStaff },
    { data: allEditionTeams },
    { data: freeAgentPool },
    { data: positions },
    { data: allEditionRosterEntries },
  ] = await Promise.all([
    supabase.from("competitions")
      .select("id, full_name, short_name, gender")
      .eq("id", competitionId).maybeSingle(),

    supabase.from("competition_editions")
      .select("id, seasons(name)")
      .eq("id", edicaoId).maybeSingle(),

    supabase.from("edition_roster_entries")
      .select("id, member_type, status, submitted_at, reviewed_at, athlete_id, staff_member_id, position_id_at_inscription, position_label_at_inscription, athletes(id, full_name, surname, photo_url, birth_date, rg, position_id, player_positions(full_name, abbreviation)), staff_members(id, full_name, surname, photo_url, staff_role_id, staff_roles(full_name))")
      .eq("edition_team_id", editionTeam.id)
      .eq("is_transfer_origin", false)
      .order("member_type")
      .order("submitted_at"),

    supabase.from("athletes")
      .select("id, full_name, surname, photo_url, gender, position_id, player_positions(full_name, abbreviation)")
      .eq("organization_id", orgId)
      .order("full_name"),

    supabase.from("staff_members")
      .select("id, full_name, surname, photo_url, staff_role_id, staff_roles(full_name)")
      .eq("organization_id", orgId)
      .order("full_name"),

    supabase.from("edition_teams")
      .select("id, team_id, is_free_agent_pool, teams(id, full_name, abbreviation, logo_url)")
      .eq("edition_id", edicaoId)
      .eq("is_free_agent_pool", false)
      .neq("team_id", teamId),

    supabase.from("edition_teams")
      .select("id, team_id")
      .eq("edition_id", edicaoId)
      .eq("is_free_agent_pool", true)
      .maybeSingle(),

    supabase.from("player_positions")
      .select("id, full_name, abbreviation")
      .eq("sport_slug", "football7")
      .order("display_order"),

    allEditionTeamIds.length > 0
      ? supabase.from("edition_roster_entries")
          .select("athlete_id, staff_member_id, member_type")
          .in("edition_team_id", allEditionTeamIds)
          .in("status", ["pending", "approved"])
          .eq("is_transfer_origin", false)
      : Promise.resolve({ data: [] }),
  ]);

  const competitionGender = (competition as { gender?: string | null } | null)?.gender ?? null;

  const globalInscribedAthleteIds = new Set(
    (allEditionRosterEntries ?? [])
      .filter((e: { member_type?: string; athlete_id?: string | null }) => e.member_type === "athlete" && e.athlete_id)
      .map((e: { athlete_id: string }) => e.athlete_id),
  );
  const globalInscribedStaffIds = new Set(
    (allEditionRosterEntries ?? [])
      .filter((e: { member_type?: string; staff_member_id?: string | null }) => e.member_type === "staff" && e.staff_member_id)
      .map((e: { staff_member_id: string }) => e.staff_member_id),
  );

  const availableAthletes = (allAthletes ?? [])
    .filter((a: { id: string }) => !globalInscribedAthleteIds.has(a.id))
    .filter((a: { gender?: string | null }) => !competitionGender || a.gender === competitionGender);

  const availableStaff = (currentStaff ?? [])
    .filter(Boolean)
    .filter((s: { id: string }) => !globalInscribedStaffIds.has(s.id));

  if ((editionTeam as { is_free_agent_pool?: boolean }).is_free_agent_pool) {
    return (
      <SemClubeClient
        competitionId={competitionId}
        competitionName={competition?.short_name ?? competition?.full_name ?? "Competição"}
        edicaoId={edicaoId}
        edicaoName={(edition?.seasons as { name?: string } | null)?.name ?? "Edição"}
        gender={competitionGender ?? "male"}
        rosterEntries={rosterEntries ?? []}
      />
    );
  }

  return (
    <EquipeEdicaoClient
      competitionId={competitionId}
      competitionName={competition?.short_name ?? competition?.full_name ?? "Competição"}
      edicaoId={edicaoId}
      edicaoName={(edition?.seasons as { name?: string } | null)?.name ?? "Edição"}
      editionTeam={editionTeam as Parameters<typeof EquipeEdicaoClient>[0]["editionTeam"]}
      rosterEntries={rosterEntries ?? []}
      availableAthletes={availableAthletes}
      availableStaff={availableStaff}
      allEditionTeams={allEditionTeams ?? []}
      freeAgentPoolId={freeAgentPool?.id ?? null}
      positions={positions ?? []}
      competitionGender={competitionGender}
    />
  );
}
