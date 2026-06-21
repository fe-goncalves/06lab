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
    .select("id, full_name, surname, photo_url, phone, pix_key, referee_role_id, profile_public, birth_date, gender")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!referee) notFound();

  const { data: matchRefs, error: matchRefsError } = await supabase
    .from("match_referees")
    .select("id, match_id, referee_role_id")
    .eq("referee_id", id);

  if (matchRefsError) {
    console.error("[arbitro] match_referees:", matchRefsError.message);
  }

  const matchIds = [...new Set((matchRefs ?? []).map((r) => r.match_id))];

  const { data: matchesData, error: matchesError } = matchIds.length > 0
    ? await supabase
        .from("matches")
        .select(`
          id, match_date, status, score_a, score_b,
          team_a:teams!matches_team_a_id_fkey ( id, full_name, short_name, logo_url, primary_color ),
          team_b:teams!matches_team_b_id_fkey ( id, full_name, short_name, logo_url, primary_color ),
          phases (
            edition_id,
            full_name,
            custom_label,
            competition_editions!phases_edition_id_fkey (
              id,
              competitions ( id, full_name, short_name, logo_url )
            )
          )
        `)
        .in("id", matchIds)
        .order("match_date", { ascending: false })
    : { data: [] as any[], error: null };

  if (matchesError) {
    console.error("[arbitro] matches:", matchesError.message);
  }

  const refByMatchId = new Map(
    (matchRefs ?? []).map((r) => [r.match_id, r]),
  );

  const matches = (matchesData ?? []).map((m: any) => {
    const mr = refByMatchId.get(m.id);
    const phase = m.phases as any;
    const edition = phase?.competition_editions as any;
    const competition = edition?.competitions as any;
    const teamA = m.team_a as any;
    const teamB = m.team_b as any;

    return {
      matchRefereeId: (mr?.id ?? m.id) as string,
      matchId: m.id as string,
      matchDate: m.match_date as string | null,
      status: m.status as string | null,
      scoreA: m.score_a as number | null,
      scoreB: m.score_b as number | null,
      teamA: teamA ? {
        id: teamA.id as string,
        full_name: teamA.full_name as string,
        abbreviation: (teamA.short_name ?? null) as string | null,
        logo_url: teamA.logo_url as string | null,
        primary_color: teamA.primary_color as string | null,
      } : null,
      teamB: teamB ? {
        id: teamB.id as string,
        full_name: teamB.full_name as string,
        abbreviation: (teamB.short_name ?? null) as string | null,
        logo_url: teamB.logo_url as string | null,
        primary_color: teamB.primary_color as string | null,
      } : null,
      phaseName: (phase?.custom_label ?? phase?.full_name ?? null) as string | null,
      editionId: (edition?.id ?? null) as string | null,
      competitionId: (competition?.id ?? null) as string | null,
      competitionName: (competition?.full_name ?? null) as string | null,
      competitionShort: (competition?.short_name ?? null) as string | null,
      yearValue: m.match_date ? new Date(m.match_date).getFullYear() : null,
      refereeRoleId: (mr?.referee_role_id ?? null) as string | null,
    };
  });

  const { data: actionsData } = matchIds.length > 0
    ? await supabase
        .from("match_actions")
        .select("id, match_id, action_type, team_id")
        .in("match_id", matchIds)
        .in("action_type", ["yellow_card", "red_card", "red_yellow_card"])
    : { data: [] as any[] };

  const { data: refereeRoles } = await supabase
    .from("referee_roles")
    .select("id, name")
    .eq("organization_id", orgId);

  const cardActions = (actionsData ?? []).map((a: any) => ({
    id: a.id as string,
    matchId: a.match_id as string,
    actionType: a.action_type as "yellow_card" | "red_card" | "red_yellow_card",
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
