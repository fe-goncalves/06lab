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

  // Inscrições pendentes
  const { data: pendingRoster } = await supabase
    .from("edition_roster_entries")
    .select("id, member_type, submitted_at, athletes(full_name, surname), staff_members(full_name), edition_teams(team_id, edition_id, teams(full_name), competition_editions(competitions(full_name), seasons(name)))")
    .eq("status", "pending")
    .order("submitted_at");

  // Filtrar só as da organização
  const rosterList = (pendingRoster ?? []).filter((r: any) => {
    const compOrgId = r.edition_teams?.competition_editions?.competitions?.organization_id;
    return !compOrgId || compOrgId === orgId;
  }).map((r: any) => ({
    id: r.id,
    type: "roster" as const,
    member_type: r.member_type,
    member_name: r.member_type === "athlete"
      ? (r.athletes?.full_name ?? "—")
      : (r.staff_members?.full_name ?? "—"),
    team_name: r.edition_teams?.teams?.full_name ?? "—",
    competition_name: r.edition_teams?.competition_editions?.competitions?.full_name ?? "—",
    season_name: r.edition_teams?.competition_editions?.seasons?.name ?? "—",
    submitted_at: r.submitted_at,
  }));

  // Relatórios pendentes
  const { data: pendingReports } = await supabase
    .from("match_reports")
    .select("id, submitted_at, submitter_type, matches(id, score_a, score_b, match_date, phases(edition_id, competition_editions(competitions(full_name), seasons(name))), teams_a:teams!matches_team_a_id_fkey(full_name, abbreviation), teams_b:teams!matches_team_b_id_fkey(full_name, abbreviation))")
    .eq("status", "pending")
    .order("submitted_at");

  const reportsList = (pendingReports ?? []).map((r: any) => ({
    id: r.id,
    type: "report" as const,
    match_id: r.matches?.id,
    team_a: r.matches?.teams_a?.abbreviation ?? r.matches?.teams_a?.full_name ?? "?",
    team_b: r.matches?.teams_b?.abbreviation ?? r.matches?.teams_b?.full_name ?? "?",
    score_a: r.matches?.score_a ?? 0,
    score_b: r.matches?.score_b ?? 0,
    match_date: r.matches?.match_date,
    competition_name: r.matches?.phases?.competition_editions?.competitions?.full_name ?? "—",
    season_name: r.matches?.phases?.competition_editions?.seasons?.name ?? "—",
    submitter_type: r.submitter_type,
    submitted_at: r.submitted_at,
  }));

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Aprovações</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {rosterList.length + reportsList.length} item{rosterList.length + reportsList.length !== 1 ? "s" : ""} aguardando aprovação.
        </p>
      </header>
      <AprovacoesClient
        rosterEntries={rosterList}
        reports={reportsList}
      />
    </div>
  );
}