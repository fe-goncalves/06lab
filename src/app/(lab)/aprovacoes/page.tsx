// APROVAÇÕES / PAGE

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { OrgGestaoPageShell } from "@/app/(lab)/components/org-gestao-page-shell";
import AprovacoesClient from "./aprovacoes-client";
import {
  repRequestTypeLabel,
  type DraftMemberData,
  type RepRosterRequest,
} from "./admin-roster-rpc-errors";

export default async function AprovacoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  // ── Inscrições pendentes ────────────────────────────────────────────────────
  const { data: pendingRoster } = await supabase
    .from("edition_roster_entries")
    .select(`
      id, member_type, submitted_at, submitter_type,
      athletes(id, full_name, surname, photo_url, birth_date, player_positions(full_name, abbreviation)),
      staff_members(id, full_name, surname, photo_url, staff_roles(full_name)),
      edition_teams(
        id, team_id,
        teams(id, full_name, short_name, abbreviation, logo_url, primary_color),
        competition_editions(
          id, season_id,
          competitions(id, full_name, short_name, organization_id),
          seasons(name)
        )
      )
    `)
    .eq("status", "pending")
    .order("submitted_at");

  // Filtra só a organização do usuário
  const rosterFiltered = (pendingRoster ?? []).filter((r: any) =>
    r.edition_teams?.competition_editions?.competitions?.organization_id === orgId
  );

  // ── Relatórios pendentes ────────────────────────────────────────────────────
  const { data: pendingReports } = await supabase
    .from("match_reports")
    .select(`
      id, submitted_at, submitter_type,
      matches(
        id, score_a, score_b, match_date,
        teams_a:teams!matches_team_a_id_fkey(full_name, abbreviation),
        teams_b:teams!matches_team_b_id_fkey(full_name, abbreviation),
        phases(
          edition_id,
          competition_editions(
            competitions(full_name, organization_id),
            seasons(name)
          )
        )
      )
    `)
    .eq("status", "pending")
    .order("submitted_at");

  const reportsFiltered = (pendingReports ?? []).filter((r: any) =>
    r.matches?.phases?.competition_editions?.competitions?.organization_id === orgId
  );

  // ── Solicitações de representantes ──────────────────────────────────────────
  const { data: pendingRepRequests } = await supabase
    .from("roster_requests")
    .select(`
      id, request_type, member_type, status, created_at,
      draft_data, requires_counterparty_approval, counterparty_approved_at,
      edition_id, athlete_id, staff_member_id, requesting_team_id, source_team_id,
      requested_by_representative_id,
      representatives!roster_requests_requested_by_representative_id_fkey(full_name, email, organization_id),
      athletes(full_name, surname, photo_url, player_positions(full_name, abbreviation)),
      staff_members(full_name, surname, photo_url, staff_roles(full_name)),
      competition_editions(id, competitions(full_name, short_name), seasons(name))
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const teamIds = new Set<string>();
  for (const r of pendingRepRequests ?? []) {
    if (r.requesting_team_id) teamIds.add(r.requesting_team_id as string);
    if (r.source_team_id) teamIds.add(r.source_team_id as string);
  }

  const teamMap = new Map<string, { full_name: string; abbreviation: string | null; short_name: string | null }>();
  if (teamIds.size > 0) {
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, full_name, abbreviation, short_name, organization_id")
      .in("id", Array.from(teamIds));
    for (const t of teamsData ?? []) {
      if (t.organization_id === orgId) {
        teamMap.set(t.id as string, {
          full_name: t.full_name as string,
          abbreviation: t.abbreviation as string | null,
          short_name: t.short_name as string | null,
        });
      }
    }
  }

  const repRequests: RepRosterRequest[] = (pendingRepRequests ?? [])
    .filter((r: any) =>
      r.representatives?.organization_id === orgId
      || teamMap.has(r.requesting_team_id as string),
    )
    .map((r: any) => {
      const isAthlete = r.member_type === "athlete";
      const draft = (r.draft_data ?? null) as DraftMemberData | null;
      const athlete = r.athletes as {
        full_name: string;
        surname: string | null;
        photo_url: string | null;
        player_positions: { full_name: string; abbreviation: string } | null;
      } | null;
      const staff = r.staff_members as {
        full_name: string;
        surname: string | null;
        photo_url: string | null;
        staff_roles: { full_name: string } | null;
      } | null;
      const edition = r.competition_editions as {
        competitions: { full_name: string; short_name: string | null } | null;
        seasons: { name: string } | null;
      } | null;
      const reqTeam = teamMap.get(r.requesting_team_id as string);
      const srcTeam = r.source_team_id ? teamMap.get(r.source_team_id as string) : null;

      let personName = "—";
      let personPhoto: string | null = null;
      let personSubtitle: string | null = null;

      if (isAthlete && athlete) {
        personName = athlete.surname
          ? `${athlete.full_name} ${athlete.surname}`
          : athlete.full_name;
        personPhoto = athlete.photo_url;
        personSubtitle = athlete.player_positions?.full_name ?? null;
      } else if (!isAthlete && staff) {
        personName = staff.surname ? `${staff.full_name} ${staff.surname}` : staff.full_name;
        personPhoto = staff.photo_url;
        personSubtitle = staff.staff_roles?.full_name ?? null;
      } else if (draft?.full_name) {
        personName = draft.surname ? `${draft.full_name} ${draft.surname}` : draft.full_name;
        personSubtitle = "Cadastro novo (draft)";
      }

      const contextLabel = edition
        ? `${edition.competitions?.short_name ?? edition.competitions?.full_name ?? "Competição"} · ${edition.seasons?.name ?? "—"}`
        : "Elenco Geral";

      return {
        id: r.id as string,
        requestType: r.request_type as string,
        memberType: r.member_type as string,
        createdAt: r.created_at as string,
        repName: (r.representatives as { full_name: string })?.full_name ?? "—",
        requestingTeamName: reqTeam?.full_name ?? "—",
        requestingTeamAbbr: reqTeam?.abbreviation ?? reqTeam?.short_name ?? null,
        typeLabel: repRequestTypeLabel(r.request_type as string, r.member_type as string),
        personName,
        personPhoto,
        personSubtitle,
        contextLabel,
        requiresCounterparty: !!r.requires_counterparty_approval,
        counterpartyApproved: !!r.counterparty_approved_at,
        draftData: draft,
        athleteId: (r.athlete_id as string | null) ?? null,
        staffMemberId: (r.staff_member_id as string | null) ?? null,
        editionId: (r.edition_id as string | null) ?? null,
        sourceTeamName: srcTeam?.full_name ?? null,
      };
    });

  // ── Monta estrutura agrupada para as inscrições ────────────────────────────
  // Agrupa: competition_id → edition_id → edition_team_id → entries[]
  type RosterGroup = {
    competitionId: string;
    competitionName: string;
    editionId: string;
    seasonName: string;
    editionTeamId: string;
    teamId: string;
    teamName: string;
    teamShortName: string | null;
    teamAbbr: string | null;
    teamLogo: string | null;
    teamColor: string | null;
    entries: {
      id: string;
      memberType: string;
      memberName: string;
      memberSurname: string | null;
      memberPhoto: string | null;
      positionAbbr: string | null;
      positionFull: string | null;
      roleLabel: string | null;
      birthDate: string | null;
      submitterType: string;
      submittedAt: string;
    }[];
  };

  const groupMap: Map<string, RosterGroup> = new Map();

  for (const r of rosterFiltered as any[]) {
    const et = r.edition_teams;
    const ce = et?.competition_editions;
    const key = `${ce?.competitions?.id}_${ce?.id}_${et?.id}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        competitionId: ce?.competitions?.id ?? "",
        competitionName: ce?.competitions?.full_name ?? "—",
        editionId: ce?.id ?? "",
        seasonName: ce?.seasons?.name ?? "—",
        editionTeamId: et?.id ?? "",
        teamId: et?.team_id ?? "",
        teamName: et?.teams?.full_name ?? "—",
        teamShortName: et?.teams?.short_name ?? null,
        teamAbbr: et?.teams?.abbreviation ?? null,
        teamLogo: et?.teams?.logo_url ?? null,
        teamColor: et?.teams?.primary_color ?? null,
        entries: [],
      });
    }

    const group = groupMap.get(key)!;
    const isAthlete = r.member_type === "athlete";
    group.entries.push({
      id: r.id,
      memberType: r.member_type,
      memberName: isAthlete ? (r.athletes?.full_name ?? "—") : (r.staff_members?.full_name ?? "—"),
      memberSurname: isAthlete ? r.athletes?.surname : r.staff_members?.surname,
      memberPhoto: isAthlete ? r.athletes?.photo_url : r.staff_members?.photo_url,
      positionAbbr: isAthlete ? r.athletes?.player_positions?.abbreviation ?? null : null,
      positionFull: isAthlete ? r.athletes?.player_positions?.full_name ?? null : null,
      roleLabel: !isAthlete ? r.staff_members?.staff_roles?.full_name ?? null : null,
      birthDate: isAthlete ? r.athletes?.birth_date ?? null : null,
      submitterType: r.submitter_type ?? "admin",
      submittedAt: r.submitted_at,
    });
  }

  const rosterGroups = Array.from(groupMap.values());

  // ── Reports formatados ─────────────────────────────────────────────────────
  const reportsList = (reportsFiltered as any[]).map(r => ({
    id: r.id,
    matchId: r.matches?.id ?? "",
    teamA: r.matches?.teams_a?.abbreviation ?? r.matches?.teams_a?.full_name ?? "?",
    teamB: r.matches?.teams_b?.abbreviation ?? r.matches?.teams_b?.full_name ?? "?",
    scoreA: r.matches?.score_a ?? 0,
    scoreB: r.matches?.score_b ?? 0,
    matchDate: r.matches?.match_date ?? null,
    competitionName: r.matches?.phases?.competition_editions?.competitions?.full_name ?? "—",
    seasonName: r.matches?.phases?.competition_editions?.seasons?.name ?? "—",
    submitterType: r.submitter_type ?? "relator",
    submittedAt: r.submitted_at,
  }));

  return (
    <OrgGestaoPageShell>
      <AprovacoesClient
        rosterGroups={rosterGroups}
        reports={reportsList}
        repRequests={repRequests}
      />
    </OrgGestaoPageShell>
  );
}