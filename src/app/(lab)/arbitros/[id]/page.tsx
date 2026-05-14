import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import ArbitroHub from "./arbitro-hub";

export default async function ArbitroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const { data: referee } = await supabase
    .from("referees")
    .select("id, full_name, surname, photo_url, phone, pix_key, referee_role_id, profile_public, birth_date")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!referee) notFound();

  const { data: matchReferees } = await supabase
    .from("match_referees")
    .select(`
      id,
      referee_role_id,
      matches (
        id,
        match_date,
        status,
        score_a,
        score_b,
        team_a_id,
        team_b_id,
        phases (
          id,
          name,
          competition_editions (
            id,
            competitions ( id, full_name, short_name ),
            seasons (
              id,
              name,
              years ( value )
            )
          )
        )
      )
    `)
    .eq("referee_id", id)
    .order("id", { ascending: false });

  const teamIds = new Set<string>();
  const matchIds: string[] = [];

  (matchReferees ?? []).forEach(mr => {
    const m = mr.matches as any;
    if (!m) return;
    matchIds.push(m.id);
    if (m.team_a_id) teamIds.add(m.team_a_id);
    if (m.team_b_id) teamIds.add(m.team_b_id);
  });

  const [teamsResult, actionsResult] = await Promise.all([
    teamIds.size > 0
      ? supabase.from("teams").select("id, full_name, abbreviation, logo_url, primary_color").in("id", Array.from(teamIds))
      : Promise.resolve({ data: [] }),
    matchIds.length > 0
      ? supabase
          .from("match_actions")
          .select("id, match_id, action_type, team_id")
          .in("match_id", matchIds)
          .in("action_type", ["yellow_card", "red_card", "yellow_red_card"])
      : Promise.resolve({ data: [] }),
  ]);

  const teamsMap: Record<string, { id: string; full_name: string; abbreviation: string | null; logo_url: string | null; primary_color: string | null }> = {};
  (teamsResult.data ?? []).forEach((t: any) => { teamsMap[t.id] = t; });

  const { data: refereeRoles } = await supabase
    .from("referee_roles")
    .select("id, name")
    .eq("organization_id", orgId);

  const matches = (matchReferees ?? [])
    .map(mr => {
      const m = mr.matches as any;
      if (!m) return null;
      const phase = m.phases as any;
      const edition = phase?.competition_editions as any;
      const competition = edition?.competitions as any;
      const season = edition?.seasons as any;
      const year = season?.years as any;

      return {
        matchRefereeId: mr.id as string,
        matchId: m.id as string,
        matchDate: m.match_date as string | null,
        status: m.status as string | null,
        scoreA: m.score_a as number | null,
        scoreB: m.score_b as number | null,
        teamA: m.team_a_id ? (teamsMap[m.team_a_id] ?? null) : null,
        teamB: m.team_b_id ? (teamsMap[m.team_b_id] ?? null) : null,
        phaseName: (phase?.name ?? null) as string | null,
        editionId: (edition?.id ?? null) as string | null,
        competitionId: (competition?.id ?? null) as string | null,
        competitionName: (competition?.full_name ?? null) as string | null,
        competitionShort: (competition?.short_name ?? null) as string | null,
        seasonName: (season?.name ?? null) as string | null,
        yearValue: (year?.value ?? null) as number | null,
        refereeRoleId: mr.referee_role_id as string | null,
      };
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof normalizeMatch>>[];

  const cardActions = (actionsResult.data ?? []).map((a: any) => ({
    id: a.id as string,
    matchId: a.match_id as string,
    actionType: a.action_type as "yellow_card" | "red_card" | "yellow_red_card",
    teamId: a.team_id as string | null,
  }));

  return (
    <ArbitroHub
      referee={referee}
      matches={matches}
      refereeRoles={refereeRoles ?? []}
      cardActions={cardActions}
    />
  );
}

function normalizeMatch(x: any) { return x; }