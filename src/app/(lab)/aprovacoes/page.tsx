// APROVAÇÕES / PAGE

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AprovacoesClient from "./aprovacoes-client";

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
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Aprovações
        </h1>
        <p className="mt-1 font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {rosterFiltered.length + reportsFiltered.length} item{(rosterFiltered.length + reportsFiltered.length) !== 1 ? "s" : ""} aguardando.
        </p>
      </header>
      <AprovacoesClient
        rosterGroups={rosterGroups}
        reports={reportsList}
      />
    </div>
  );
}