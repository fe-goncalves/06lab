import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EquipeEdicaoClient from "./equipe-edicao-client";

export default async function EquipeEdicaoPage({
  params,
}: {
  params: Promise<{ id: string; edicaoId: string; teamId: string }>;
}) {
  const { id: competitionId, edicaoId, teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  // Busca edition_team
  const { data: editionTeam } = await supabase
    .from("edition_teams")
    .select("id, team_id, arrival_origin, teams(id, full_name, abbreviation, logo_url, primary_color, secondary_color)")
    .eq("edition_id", edicaoId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!editionTeam) redirect(`/competicoes/${competitionId}`);

  // Busca competição e edição para breadcrumb
  const [{ data: competition }, { data: edition }] = await Promise.all([
    supabase.from("competitions").select("id, full_name, short_name").eq("id", competitionId).maybeSingle(),
    supabase.from("competition_editions")
      .select("id, seasons(name)")
      .eq("id", edicaoId).maybeSingle(),
  ]);

  // Busca atletas e comissão inscritos
  const { data: rosterEntries } = await supabase
    .from("edition_roster_entries")
    .select("id, member_type, status, submitted_at, reviewed_at, athlete_id, staff_member_id, position_id_at_inscription, position_label_at_inscription, athletes(id, full_name, surname, photo_url, position_id, player_positions(full_name, abbreviation)), staff_members(id, full_name, surname, photo_url, staff_role_id, staff_roles(full_name))")
    .eq("edition_team_id", editionTeam.id)
    .order("member_type")
    .order("submitted_at");

  // Busca atletas disponíveis (vínculo atual com a equipe, não inscritos ainda)
  const { data: currentStints } = await supabase
    .from("athlete_team_stints")
    .select("athlete_id, athletes(id, full_name, surname, photo_url, position_id, player_positions(full_name, abbreviation))")
    .eq("team_id", teamId)
    .eq("is_current", true);

  // Busca comissão disponível
  const { data: currentStaff } = await supabase
    .from("staff_team_stints")
    .select("staff_member_id, staff_members(id, full_name, surname, photo_url, staff_role_id, staff_roles(full_name))")
    .eq("team_id", teamId)
    .eq("is_current", true);

  // Busca posições
  const { data: positions } = await supabase
    .from("player_positions")
    .select("id, full_name, abbreviation")
    .eq("sport_slug", "football7")
    .order("display_order");

  const inscribedAthleteIds = new Set(
    (rosterEntries ?? []).filter(e => e.member_type === "athlete").map(e => e.athlete_id)
  );
  const inscribedStaffIds = new Set(
    (rosterEntries ?? []).filter(e => e.member_type === "staff").map(e => e.staff_member_id)
  );

  const availableAthletes = (currentStints ?? [])
    .map((s: any) => s.athletes)
    .filter(Boolean)
    .filter((a: any) => !inscribedAthleteIds.has(a.id));

  const availableStaff = (currentStaff ?? [])
    .map((s: any) => s.staff_members)
    .filter(Boolean)
    .filter((s: any) => !inscribedStaffIds.has(s.id));

  return (
    <EquipeEdicaoClient
      competitionId={competitionId}
      competitionName={competition?.short_name ?? competition?.full_name ?? "Competição"}
      edicaoId={edicaoId}
      edicaoName={(edition?.seasons as any)?.name ?? "Edição"}
      editionTeam={editionTeam as any}
      rosterEntries={rosterEntries ?? []}
      availableAthletes={availableAthletes}
      availableStaff={availableStaff}
      positions={positions ?? []}
    />
  );
}