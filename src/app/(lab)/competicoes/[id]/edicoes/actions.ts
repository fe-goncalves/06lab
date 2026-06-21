"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function criarEdicao(
  competitionId: string,
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const season_id = String(formData.get("season_id") ?? "").trim();
  if (!season_id) return { error: "Temporada é obrigatória." };

  const { data: existing } = await supabase
    .from("competition_editions")
    .select("id")
    .eq("competition_id", competitionId)
    .eq("season_id", season_id)
    .maybeSingle();

  if (existing) return { error: "Já existe uma edição desta competição nesta temporada." };

  const { data: inserted, error } = await supabase
    .from("competition_editions")
    .insert({ competition_id: competitionId, season_id, status: "planned" })
    .select("id").single();

  if (error) return { error: error.message };

  await supabase.from("edition_settings").insert({ edition_id: inserted.id });

  // Busca o gênero da competição para selecionar o "Sem Clube" correto
  const { data: competition } = await supabase
    .from("competitions")
    .select("gender")
    .eq("id", competitionId)
    .maybeSingle();

  const competitionGender = competition?.gender ?? "male";

  const { data: freeAgentTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("full_name", "Sem Clube")
    .eq("gender", competitionGender)
    .maybeSingle();

  if (freeAgentTeam) {
    await supabase.from("edition_teams").insert({
      edition_id: inserted.id,
      team_id: freeAgentTeam.id,
      is_free_agent_pool: true,
      display_order: 999,
    });
  }

  return { id: inserted.id };
}

export async function editarEdicao(
  edicaoId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const status = String(formData.get("status") ?? "planned");
  const startDateRaw = formData.get("start_date");
  const endDateRaw = formData.get("end_date");
  const min_athletes = Number(formData.get("min_athletes") ?? 0) || null;
  const max_athletes = Number(formData.get("max_athletes") ?? 0) || null;
  const min_age = Number(formData.get("min_age") ?? 0) || null;
  const max_age = Number(formData.get("max_age") ?? 0) || null;
  const yellowCardThresholdRaw = formData.get("yellow_card_threshold");
  const is_public = formData.get("is_public") === "true";

  const editionUpdate: Record<string, unknown> = { status };
  if (startDateRaw !== null) {
    editionUpdate.start_date = String(startDateRaw).trim() || null;
  }
  if (endDateRaw !== null) {
    editionUpdate.end_date = String(endDateRaw).trim() || null;
  }

  const { error: editionError } = await supabase
    .from("competition_editions")
    .update(editionUpdate)
    .eq("id", edicaoId);

  if (editionError) return { error: editionError.message };

  const settingsRow: Record<string, unknown> = {
    edition_id: edicaoId,
    is_public,
    min_athletes,
    max_athletes,
    min_age,
    max_age,
  };
  if (yellowCardThresholdRaw !== null) {
    settingsRow.yellow_card_suspension_threshold = Number(yellowCardThresholdRaw) || null;
  }

  const { error: settingsError } = await supabase
    .from("edition_settings")
    .upsert(settingsRow, { onConflict: "edition_id" });

  if (settingsError) return { error: settingsError.message };
  return { success: true };
}

function parseDatetimeLocalToIso(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export type ConfiguracaoInscricoesPayload = {
  athlete_doc_type: "rg" | "cpf";
  staff_doc_type: "rg" | "cpf";
  max_athletes: number | null;
  max_staff: number | null;
  max_transfers: number | null;
  min_birth_year: number | null;
  max_birth_year: number | null;
  registration_window_start: string | null;
  registration_window_end: string | null;
};

export async function salvarConfiguracaoInscricoes(
  edicaoId: string,
  payload: ConfiguracaoInscricoesPayload,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const start = parseDatetimeLocalToIso(payload.registration_window_start);
  const end = parseDatetimeLocalToIso(payload.registration_window_end);

  if (start && end && new Date(start) >= new Date(end)) {
    return { error: "A data de início deve ser anterior ao fim das inscrições." };
  }

  const { error } = await supabase
    .from("edition_settings")
    .upsert({
      edition_id: edicaoId,
      athlete_doc_type: payload.athlete_doc_type,
      staff_doc_type: payload.staff_doc_type,
      max_athletes: payload.max_athletes,
      max_staff: payload.max_staff,
      max_transfers: payload.max_transfers,
      min_birth_year: payload.min_birth_year,
      max_birth_year: payload.max_birth_year,
      registration_window_start: start,
      registration_window_end: end,
    }, { onConflict: "edition_id" });

  if (error) return { error: error.message };
  return { success: true };
}

export async function atualizarVisibilidadeHome(
  editionId: string,
  show: boolean,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("competition_editions")
    .update({ show_in_home: show })
    .eq("id", editionId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function criarJanelaInscricao(
  edicaoId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const opens_at = String(formData.get("opens_at") ?? "").trim();
  const closes_at = String(formData.get("closes_at") ?? "").trim();

  if (!opens_at || !closes_at) return { error: "Datas de abertura e fechamento são obrigatórias." };

  const { error } = await supabase
    .from("edition_registration_windows")
    .insert({ edition_id: edicaoId, opens_at, closes_at, is_active: true });

  if (error) return { error: error.message };
  return { success: true };
}

export async function adicionarEquipeEdicao(
  edicaoId: string,
  teamId: string,
  arrivalOrigin: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: existing } = await supabase
    .from("edition_teams")
    .select("id")
    .eq("edition_id", edicaoId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (existing) return { error: "Equipe já está inscrita nesta edição." };

  const { data: inserted, error } = await supabase
    .from("edition_teams")
    .insert({ edition_id: edicaoId, team_id: teamId, arrival_origin: arrivalOrigin || null })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function removerEquipeEdicao(
  editionTeamId: string,
): Promise<{ success: true; deactivated?: boolean } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Busca o team_id desta edition_team para checar partidas
  const { data: editionTeam } = await supabase
    .from("edition_teams")
    .select("team_id")
    .eq("id", editionTeamId)
    .maybeSingle();

  if (!editionTeam) return { error: "Equipe não encontrada nesta edição." };

  // Verifica se há atletas inscritos vinculados a esta edition_team
  const { data: rosterEntries } = await supabase
    .from("edition_roster_entries")
    .select("id")
    .eq("edition_team_id", editionTeamId)
    .limit(1);

  // Verifica se há partidas onde esta equipe participou (como team_a ou team_b)
  // dentro desta edição — matches referencia team_id diretamente
  const { data: matchesA } = await supabase
    .from("matches")
    .select("id")
    .eq("team_a_id", editionTeam.team_id)
    .limit(1);

  const hasMatches = matchesA && matchesA.length > 0;
  const hasRoster = rosterEntries && rosterEntries.length > 0;

  if (hasRoster || hasMatches) {
    // Tem vínculos: desativa em vez de deletar
    const { error } = await supabase
      .from("edition_teams")
      .update({ is_active: false })
      .eq("id", editionTeamId);

    if (error) return { error: error.message };
    return { success: true, deactivated: true };
  }

  // Sem vínculos: pode deletar com segurança
  const { error } = await supabase
    .from("edition_teams")
    .delete()
    .eq("id", editionTeamId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function inscreverAtleta(
  editionTeamId: string,
  athleteId: string,
  positionId: string | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: existing } = await supabase
    .from("edition_roster_entries")
    .select("id")
    .eq("edition_team_id", editionTeamId)
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (existing) return { error: "Atleta já inscrito nesta edição." };

  const { error } = await supabase
    .from("edition_roster_entries")
    .insert({
      edition_team_id: editionTeamId,
      athlete_id: athleteId,
      member_type: "athlete",
      position_id_at_inscription: positionId,
      status: "pending",
      submitter_type: "admin",
    });

  if (error) return { error: error.message };
  return { success: true };
}

export async function removerAtletaEdicao(
  rosterEntryId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("edition_roster_entries")
    .delete()
    .eq("id", rosterEntryId);

  if (error) return { error: error.message };
  return { success: true };
}

const COLLECTIVE_AWARD_TYPES = new Set([
  "champion",
  "runner_up",
  "third_place",
  "fourth_place",
  "fifth_place",
  "sixth_place",
  "seventh_place",
  "eighth_place",
  "ninth_place",
  "tenth_place",
  "eleventh_place",
  "twelfth_place",
  "thirteenth_place",
  "fourteenth_place",
  "fifteenth_place",
  "sixteenth_place",
  "seventeenth_place",
  "eighteenth_place",
  "nineteenth_place",
  "twentieth_place",
  "twenty_first_or_more",
]);

function isCollectiveAwardType(awardType: string): boolean {
  return COLLECTIVE_AWARD_TYPES.has(awardType);
}

const AWARD_TYPE_TO_POSITION: Record<string, number> = {
  champion: 1,
  runner_up: 2,
  third_place: 3,
  fourth_place: 4,
  fifth_place: 5,
  sixth_place: 6,
  seventh_place: 7,
  eighth_place: 8,
  ninth_place: 9,
  tenth_place: 10,
  eleventh_place: 11,
  twelfth_place: 12,
  thirteenth_place: 13,
  fourteenth_place: 14,
  fifteenth_place: 15,
  sixteenth_place: 16,
  seventeenth_place: 17,
  eighteenth_place: 18,
  nineteenth_place: 19,
  twentieth_place: 20,
  relegated: 99,
};

async function recalculateCareerStatsForAwards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteIds: string[],
  staffIds: string[],
): Promise<string | null> {
  const uniqueAthletes = [...new Set(athleteIds.filter(Boolean))];
  const uniqueStaff = [...new Set(staffIds.filter(Boolean))];

  const results = await Promise.all([
    ...uniqueAthletes.map((athleteId) =>
      supabase.rpc("recalculate_athlete_career_stats", { p_athlete_id: athleteId }),
    ),
    ...uniqueStaff.map((staffId) =>
      supabase.rpc("recalculate_staff_career_stats", { p_staff_member_id: staffId }),
    ),
  ]);

  const failed = results.find((r) => r.error);
  return failed?.error?.message ?? null;
}

async function resolveEditionTeamForAward(
  supabase: Awaited<ReturnType<typeof createClient>>,
  editionId: string,
  teamOrEditionTeamId: string,
): Promise<{ editionTeamId: string; winningTeamId: string } | { error: string }> {
  const { data: editionTeam, error } = await supabase
    .from("edition_teams")
    .select("id, team_id")
    .eq("edition_id", editionId)
    .or(`team_id.eq.${teamOrEditionTeamId},id.eq.${teamOrEditionTeamId}`)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!editionTeam?.id || !editionTeam.team_id) {
    return { error: "Equipe não encontrada nesta edição." };
  }

  return { editionTeamId: editionTeam.id, winningTeamId: editionTeam.team_id };
}

async function propagateCollectiveAwardToRoster(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    editionId: string;
    organizationId: string;
    awardType: string;
    teamId: string;
    seasonId: string | null;
    yearId: string | null;
    assignedBy: string;
  },
): Promise<{ error?: string; athleteIds: string[]; staffIds: string[] }> {
  const { editionId, organizationId, awardType, teamId, seasonId, yearId, assignedBy } = params;

  const resolved = await resolveEditionTeamForAward(supabase, editionId, teamId);
  if ("error" in resolved) return { error: resolved.error, athleteIds: [], staffIds: [] };

  const { editionTeamId, winningTeamId } = resolved;
  const assignedAt = new Date().toISOString();

  const { data: eligibleAthletes, error: athletesError } = await supabase
    .from("edition_roster_entries")
    .select("athlete_id")
    .eq("edition_team_id", editionTeamId)
    .eq("status", "approved")
    .eq("member_type", "athlete")
    .eq("is_transfer_origin", false)
    .not("athlete_id", "is", null);

  if (athletesError) return { error: athletesError.message, athleteIds: [], staffIds: [] };

  const athleteIds = (eligibleAthletes ?? [])
    .map((e) => e.athlete_id)
    .filter((id): id is string => Boolean(id));

  if (athleteIds.length > 0) {
    const athleteAwards = athleteIds.map((athleteId) => ({
      edition_id: editionId,
      organization_id: organizationId,
      award_type: awardType,
      athlete_id: athleteId,
      staff_member_id: null,
      winning_team_id: winningTeamId,
      season_id: seasonId,
      year_id: yearId,
      assigned_by: assignedBy,
      assigned_at: assignedAt,
    }));

    const { error: insertAthletesError } = await supabase
      .from("edition_awards")
      .insert(athleteAwards);

    if (insertAthletesError) return { error: insertAthletesError.message, athleteIds: [], staffIds: [] };
  }

  const { data: eligibleStaff, error: staffError } = await supabase
    .from("edition_roster_entries")
    .select("staff_member_id, edition_team_id")
    .eq("edition_team_id", editionTeamId)
    .eq("status", "approved")
    .eq("member_type", "staff")
    .or("is_transfer_origin.eq.false,is_transfer_origin.is.null")
    .not("staff_member_id", "is", null);

  if (staffError) return { error: staffError.message, athleteIds, staffIds: [] };

  const staffIds = (eligibleStaff ?? [])
    .map((e) => e.staff_member_id)
    .filter((id): id is string => Boolean(id));

  if (staffIds.length > 0) {
    const staffAwards = staffIds.map((staffMemberId) => ({
      edition_id: editionId,
      organization_id: organizationId,
      award_type: awardType,
      athlete_id: null,
      staff_member_id: staffMemberId,
      winning_team_id: winningTeamId,
      season_id: seasonId,
      year_id: yearId,
      assigned_by: assignedBy,
      assigned_at: assignedAt,
    }));

    const { error: insertStaffError } = await supabase
      .from("edition_awards")
      .insert(staffAwards);

    if (insertStaffError) return { error: insertStaffError.message, athleteIds, staffIds: [] };
  }

  return { athleteIds, staffIds };
}

export async function atribuirPremiacao(
  editionId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id, organization_id")
    .eq("auth_user_id", user.id).maybeSingle();
  if (!profile) return { error: "Perfil não encontrado." };

  const award_type = String(formData.get("award_type") ?? "").trim();
  const athlete_id = String(formData.get("athlete_id") ?? "").trim() || null;
  const staff_member_id = String(formData.get("staff_member_id") ?? "").trim() || null;
  const winning_team_id = String(formData.get("winning_team_id") ?? "").trim() || null;

  if (!award_type) return { error: "Tipo de premiação obrigatório." };
  if (!athlete_id && !staff_member_id && !winning_team_id) {
    return { error: "Atleta, membro de comissão ou equipe é obrigatório." };
  }

  const { data: edition } = await supabase
    .from("competition_editions")
    .select("season_id, seasons(year_id)")
    .eq("id", editionId)
    .maybeSingle();

  const season_id = edition?.season_id ?? null;
  const year_id = (edition?.seasons as { year_id?: string | null } | null)?.year_id ?? null;

  const { data: previousAwards } = await supabase
    .from("edition_awards")
    .select("athlete_id, staff_member_id")
    .eq("edition_id", editionId)
    .eq("award_type", award_type);

  const recalcAthleteIds = new Set(
    (previousAwards ?? [])
      .map((a) => a.athlete_id)
      .filter((id): id is string => Boolean(id)),
  );
  const recalcStaffIds = new Set(
    (previousAwards ?? [])
      .map((a) => a.staff_member_id)
      .filter((id): id is string => Boolean(id)),
  );

  const { error: deleteError } = await supabase
    .from("edition_awards")
    .delete()
    .eq("edition_id", editionId)
    .eq("award_type", award_type);

  if (deleteError) return { error: deleteError.message };

  const { error } = await supabase
    .from("edition_awards")
    .insert({
      edition_id: editionId,
      organization_id: profile.organization_id,
      season_id,
      year_id,
      award_type,
      athlete_id,
      staff_member_id,
      winning_team_id,
      assigned_by: profile.id,
      assigned_at: new Date().toISOString(),
    });

  if (error) return { error: error.message };

  const finalPosition = AWARD_TYPE_TO_POSITION[award_type];
  if (finalPosition && winning_team_id && !athlete_id && !staff_member_id) {
    const resolvedTeam = await resolveEditionTeamForAward(supabase, editionId, winning_team_id);
    if (!("error" in resolvedTeam)) {
      await supabase
        .from("team_edition_stats")
        .update({ final_position: finalPosition })
        .eq("edition_id", editionId)
        .eq("team_id", resolvedTeam.winningTeamId);
    }
  }

  const isCollectiveTeamAward =
    isCollectiveAwardType(award_type) &&
    Boolean(winning_team_id) &&
    !athlete_id &&
    !staff_member_id;

  if (isCollectiveTeamAward && winning_team_id) {
    const propagation = await propagateCollectiveAwardToRoster(supabase, {
      editionId,
      organizationId: profile.organization_id,
      awardType: award_type,
      teamId: winning_team_id,
      seasonId: season_id,
      yearId: year_id,
      assignedBy: profile.id,
    });

    if (propagation.error) return { error: propagation.error };

    propagation.athleteIds.forEach((id) => recalcAthleteIds.add(id));
    propagation.staffIds.forEach((id) => recalcStaffIds.add(id));
  }

  const recalcError = await recalculateCareerStatsForAwards(
    supabase,
    [...recalcAthleteIds],
    [...recalcStaffIds],
  );
  if (recalcError) return { error: recalcError };

  return { success: true };
}

export async function removerPremiacao(
  awardId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: award } = await supabase
    .from("edition_awards")
    .select("edition_id, award_type, athlete_id, staff_member_id, winning_team_id")
    .eq("id", awardId)
    .maybeSingle();

  if (!award) return { error: "Premiação não encontrada." };

  const isCollectiveTeamAward =
    isCollectiveAwardType(award.award_type) &&
    Boolean(award.winning_team_id) &&
    !award.athlete_id &&
    !award.staff_member_id;

  let recalcAthleteIds: string[] = [];
  let recalcStaffIds: string[] = [];

  if (isCollectiveTeamAward && award.winning_team_id) {
    const { data: linkedAwards } = await supabase
      .from("edition_awards")
      .select("athlete_id, staff_member_id")
      .eq("edition_id", award.edition_id)
      .eq("award_type", award.award_type)
      .eq("winning_team_id", award.winning_team_id);

    recalcAthleteIds = (linkedAwards ?? [])
      .map((a) => a.athlete_id)
      .filter((id): id is string => Boolean(id));
    recalcStaffIds = (linkedAwards ?? [])
      .map((a) => a.staff_member_id)
      .filter((id): id is string => Boolean(id));

    const { error: deleteIndividualsError } = await supabase
      .from("edition_awards")
      .delete()
      .eq("edition_id", award.edition_id)
      .eq("award_type", award.award_type)
      .eq("winning_team_id", award.winning_team_id)
      .not("athlete_id", "is", null);

    if (deleteIndividualsError) return { error: deleteIndividualsError.message };

    const { error: deleteStaffIndividualsError } = await supabase
      .from("edition_awards")
      .delete()
      .eq("edition_id", award.edition_id)
      .eq("award_type", award.award_type)
      .eq("winning_team_id", award.winning_team_id)
      .not("staff_member_id", "is", null);

    if (deleteStaffIndividualsError) return { error: deleteStaffIndividualsError.message };
  }

  const { error } = await supabase
    .from("edition_awards")
    .delete()
    .eq("id", awardId);

  if (error) return { error: error.message };

  if (isCollectiveTeamAward && award.winning_team_id) {
    await supabase
      .from("team_edition_stats")
      .update({ final_position: null })
      .eq("edition_id", award.edition_id)
      .eq("team_id", award.winning_team_id);
  }

  if (isCollectiveTeamAward) {
    const recalcError = await recalculateCareerStatsForAwards(supabase, recalcAthleteIds, recalcStaffIds);
    if (recalcError) return { error: recalcError };
  }

  return { success: true };
}

// ← ALTERADO: agora recebe startDate informado pelo admin
export async function aprovarInscricao(
  entryId: string,
  startDate: string, // formato YYYY-MM-DD
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id")
    .eq("auth_user_id", user.id).maybeSingle();

  // Busca a inscrição para obter athlete_id e edition_team_id
  const { data: entry } = await supabase
    .from("edition_roster_entries")
    .select("athlete_id, edition_team_id, member_type")
    .eq("id", entryId)
    .maybeSingle();

  if (!entry) return { error: "Inscrição não encontrada." };

  // Atualiza status da inscrição
  const { error: updateError } = await supabase
    .from("edition_roster_entries")
    .update({
      status: "approved",
      reviewed_by: profile?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (updateError) return { error: updateError.message };

// Busca o team_id real a partir do edition_team_id
const { data: editionTeam } = await supabase
.from("edition_teams")
.select("team_id, is_free_agent_pool")
.eq("id", entry.edition_team_id)
.maybeSingle();

if (!editionTeam) return { error: "Equipe da edição não encontrada." };

// Free agent pool não gera stint
if (editionTeam.is_free_agent_pool) return { success: true };

if (entry.member_type === "athlete" && entry.athlete_id) {
// Fecha stint ativo do atleta em outra equipe
await supabase
  .from("athlete_team_stints")
  .update({ ended_at: startDate, is_current: false })
  .eq("athlete_id", entry.athlete_id)
  .eq("is_current", true)
  .neq("team_id", editionTeam.team_id);

const { data: existingStint } = await supabase
  .from("athlete_team_stints")
  .select("id")
  .eq("athlete_id", entry.athlete_id)
  .eq("team_id", editionTeam.team_id)
  .eq("is_current", true)
  .maybeSingle();

if (!existingStint) {
  const { error: stintError } = await supabase
    .from("athlete_team_stints")
    .insert({
      athlete_id: entry.athlete_id,
      team_id: editionTeam.team_id,
      started_at: startDate,
      is_current: true,
      movement_type: "arrival",
    });
  if (stintError) return { error: `Inscrição aprovada, mas erro ao criar stint: ${stintError.message}` };
}
}

if (entry.member_type === "staff" && entry.staff_member_id) {
// Fecha stint ativo do membro em outra equipe
await supabase
  .from("staff_team_stints")
  .update({ ended_at: startDate, is_current: false })
  .eq("staff_member_id", entry.staff_member_id)
  .eq("is_current", true)
  .neq("team_id", editionTeam.team_id);

const { data: existingStint } = await supabase
  .from("staff_team_stints")
  .select("id")
  .eq("staff_member_id", entry.staff_member_id)
  .eq("team_id", editionTeam.team_id)
  .eq("is_current", true)
  .maybeSingle();

if (!existingStint) {
  const { error: stintError } = await supabase
    .from("staff_team_stints")
    .insert({
      staff_member_id: entry.staff_member_id,
      team_id: editionTeam.team_id,
      started_at: startDate,
      is_current: true,
      movement_type: "arrival",
    });
  if (stintError) return { error: `Inscrição aprovada, mas erro ao criar stint: ${stintError.message}` };
}
}

return { success: true };
}

export async function desativarInscricao(
  entryId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("edition_roster_entries")
    .update({ status: "inactive" })
    .eq("id", entryId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function reativarInscricao(
  entryId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("edition_roster_entries")
    .update({ status: "approved" })
    .eq("id", entryId);

  if (error) return { error: error.message };
  return { success: true };
}

// ← ALTERADO: agora recebe transferDate informado pelo admin
export async function transferirAtletaNaEdicao(
  entryId: string,
  newEditionTeamId: string,
  transferDate: string, // formato YYYY-MM-DD ← NOVO parâmetro
): Promise<{ success: true; newEntryId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { data: original } = await supabase
    .from("edition_roster_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();

  if (!original) return { error: "Inscrição não encontrada." };

  const lookupField = original.member_type === "athlete" ? "athlete_id" : "staff_member_id";
  const lookupValue = original.member_type === "athlete" ? original.athlete_id : original.staff_member_id;

  // Busca todos os edition_teams desta edição
  const { data: currentET } = await supabase
    .from("edition_teams")
    .select("edition_id, team_id, is_free_agent_pool")
    .eq("id", original.edition_team_id)
    .maybeSingle();

  if (!currentET) return { error: "Edição não encontrada." };

  const { data: allETs } = await supabase
    .from("edition_teams")
    .select("id")
    .eq("edition_id", currentET.edition_id);

  const allETIds = (allETs ?? []).map((et: any) => et.id);

  // Marca todos os entries ativos/pendentes como inativo + is_transfer_origin
  if (allETIds.length > 0) {
    const { error: deactivateError } = await supabase
      .from("edition_roster_entries")
      .update({ status: "inactive", is_transfer_origin: true })
      .eq(lookupField, lookupValue)
      .in("edition_team_id", allETIds)
      .in("status", ["pending", "approved"]);

    if (deactivateError) return { error: deactivateError.message };
  }

  // Busca dados da equipe de destino
  const { data: destET } = await supabase
    .from("edition_teams")
    .select("team_id, is_free_agent_pool")
    .eq("id", newEditionTeamId)
    .maybeSingle();

  if (!destET) return { error: "Equipe de destino não encontrada." };

  // Fecha stint atual e cria novo — atletas
  if (original.member_type === "athlete" && original.athlete_id && !currentET.is_free_agent_pool) {
    await supabase
      .from("athlete_team_stints")
      .update({ ended_at: transferDate, is_current: false })
      .eq("athlete_id", original.athlete_id)
      .eq("team_id", currentET.team_id)
      .eq("is_current", true);
  }

  if (original.member_type === "athlete" && original.athlete_id && !destET.is_free_agent_pool) {
    const { data: existingStint } = await supabase
      .from("athlete_team_stints")
      .select("id")
      .eq("athlete_id", original.athlete_id)
      .eq("team_id", destET.team_id)
      .eq("is_current", true)
      .maybeSingle();

    if (!existingStint) {
      const { error: stintError } = await supabase
        .from("athlete_team_stints")
        .insert({
          athlete_id: original.athlete_id,
          team_id: destET.team_id,
          started_at: transferDate,
          is_current: true,
          movement_type: "transfer",
        });
      if (stintError) return { error: `Transferência registrada, mas erro ao criar stint: ${stintError.message}` };
    }
  }

  // Fecha stint atual e cria novo — comissão técnica
  if (original.member_type === "staff" && original.staff_member_id && !currentET.is_free_agent_pool) {
    await supabase
      .from("staff_team_stints")
      .update({ ended_at: transferDate, is_current: false })
      .eq("staff_member_id", original.staff_member_id)
      .eq("team_id", currentET.team_id)
      .eq("is_current", true);
  }

  if (original.member_type === "staff" && original.staff_member_id && !destET.is_free_agent_pool) {
    const { data: existingStint } = await supabase
      .from("staff_team_stints")
      .select("id")
      .eq("staff_member_id", original.staff_member_id)
      .eq("team_id", destET.team_id)
      .eq("is_current", true)
      .maybeSingle();

    if (!existingStint) {
      const { error: stintError } = await supabase
        .from("staff_team_stints")
        .insert({
          staff_member_id: original.staff_member_id,
          team_id: destET.team_id,
          started_at: transferDate,
          is_current: true,
          movement_type: "transfer",
        });
      if (stintError) return { error: `Transferência registrada, mas erro ao criar stint: ${stintError.message}` };
    }
  }

  // Verifica se já existe entry (inativo) no destino — reativa em vez de duplicar
  const { data: existingInDest } = await supabase
    .from("edition_roster_entries")
    .select("id")
    .eq("edition_team_id", newEditionTeamId)
    .eq(lookupField, lookupValue)
    .maybeSingle();

  let newEntryId: string;

  if (existingInDest) {
    const { error: reactivateError } = await supabase
      .from("edition_roster_entries")
      .update({
        status: "pending",
        is_transfer_origin: false,
        submitted_by: profile?.id,
        submitter_type: "admin",
        submitted_at: new Date().toISOString(),
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq("id", existingInDest.id);
    if (reactivateError) return { error: reactivateError.message };
    newEntryId = existingInDest.id;
  } else {
    const { data: newEntry, error: insertError } = await supabase
      .from("edition_roster_entries")
      .insert({
        edition_team_id: newEditionTeamId,
        member_type: original.member_type,
        athlete_id: original.athlete_id,
        staff_member_id: original.staff_member_id,
        position_id_at_inscription: original.position_id_at_inscription,
        position_label_at_inscription: original.position_label_at_inscription,
        status: "pending",
        is_transfer_origin: false,
        submitted_by: profile?.id,
        submitter_type: "admin",
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insertError) return { error: insertError.message };
    newEntryId = newEntry.id;
  }

  return { success: true, newEntryId };
}

export async function inscreverAtletaQualquer(
  editionTeamId: string,
  memberId: string,
  positionId: string | null,
  memberType: "athlete" | "staff" = "athlete",
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { data: currentET } = await supabase
    .from("edition_teams").select("edition_id").eq("id", editionTeamId).maybeSingle();

  if (!currentET?.edition_id) return { error: "Edição não encontrada." };

  const editionId = currentET.edition_id;

  const { data: allETs } = await supabase
    .from("edition_teams").select("id").eq("edition_id", editionId);
  const allETIds = (allETs ?? []).map((et: any) => et.id);

  if (allETIds.length > 0) {
    const lookupField = memberType === "athlete" ? "athlete_id" : "staff_member_id";
    const { data: existingActive } = await supabase
      .from("edition_roster_entries")
      .select("id")
      .eq(lookupField, memberId)
      .in("edition_team_id", allETIds)
      .in("status", ["pending", "approved"])
      .eq("is_transfer_origin", false)
      .maybeSingle();

    if (existingActive) {
      return { error: memberType === "athlete"
        ? "Atleta já inscrito em outra equipe nesta edição."
        : "Membro já inscrito em outra equipe nesta edição."
      };
    }
  }

  const { data: settings } = await supabase
    .from("edition_settings")
    .select("max_athletes, max_staff, min_birth_year, max_birth_year")
    .eq("edition_id", editionId)
    .maybeSingle();

  if (settings && memberType === "athlete") {
    if (settings.min_birth_year || settings.max_birth_year) {
      const { data: athleteData } = await supabase
        .from("athletes")
        .select("birth_date, full_name, surname")
        .eq("id", memberId)
        .maybeSingle();

      if (athleteData?.birth_date) {
        const birthYear = new Date(athleteData.birth_date).getFullYear();
        const name = athleteData.surname ?? athleteData.full_name ?? "Atleta";

        if (settings.min_birth_year && birthYear < settings.min_birth_year) {
          return { error: `${name} nasceu em ${birthYear}, mas o mínimo permitido é ${settings.min_birth_year}.` };
        }
        if (settings.max_birth_year && birthYear > settings.max_birth_year) {
          return { error: `${name} nasceu em ${birthYear}, mas o máximo permitido é ${settings.max_birth_year}.` };
        }
      }
    }

    if (settings.max_athletes) {
      const { count } = await supabase
        .from("edition_roster_entries")
        .select("id", { count: "exact", head: true })
        .eq("edition_team_id", editionTeamId)
        .eq("member_type", "athlete")
        .in("status", ["pending", "approved"])
        .eq("is_transfer_origin", false);

      if ((count ?? 0) >= settings.max_athletes) {
        return { error: `Limite de ${settings.max_athletes} atletas por equipe atingido.` };
      }
    }
  }

  if (settings && memberType === "staff") {
    if (settings.max_staff) {
      const { count } = await supabase
        .from("edition_roster_entries")
        .select("id", { count: "exact", head: true })
        .eq("edition_team_id", editionTeamId)
        .eq("member_type", "staff")
        .in("status", ["pending", "approved"])
        .eq("is_transfer_origin", false);

      if ((count ?? 0) >= settings.max_staff) {
        return { error: `Limite de ${settings.max_staff} membros de comissão por equipe atingido.` };
      }
    }
  }

  let positionLabel: string | null = null;
  if (positionId && memberType === "athlete") {
    const { data: pos } = await supabase
      .from("player_positions").select("full_name").eq("id", positionId).maybeSingle();
    positionLabel = pos?.full_name ?? null;
  }

  const insertPayload: any = {
    edition_team_id: editionTeamId,
    member_type: memberType,
    status: "pending",
    is_transfer_origin: false,
    submitted_by: profile?.id,
    submitter_type: "admin",
    submitted_at: new Date().toISOString(),
  };

  if (memberType === "athlete") {
    insertPayload.athlete_id = memberId;
    insertPayload.position_id_at_inscription = positionId;
    insertPayload.position_label_at_inscription = positionLabel;
  } else {
    insertPayload.staff_member_id = memberId;
  }

  const { data: inserted, error } = await supabase
    .from("edition_roster_entries")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function criarOuAtualizarTOTW(
  editionId: string,
  roundId: string,
  members: { athleteId?: string; staffMemberId?: string; teamId: string; displayOrder: number }[],
  formation: string = '2-3-1',
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id, organization_id")
    .eq("auth_user_id", user.id).maybeSingle();
  if (!profile) return { error: "Perfil não encontrado." };

  const { data: season } = await supabase
    .from("competition_editions").select("season_id, seasons(year_id)")
    .eq("id", editionId).maybeSingle();

  let squadId: string;
  const { data: existing } = await supabase
    .from("selection_squads")
    .select("id").eq("edition_id", editionId).eq("round_id", roundId).eq("squad_type", "totw")
    .maybeSingle();

    if (existing) {
      squadId = existing.id;
      await supabase.from("selection_squad_members").delete().eq("squad_id", squadId);
      await supabase.from("selection_squads").update({ formation }).eq("id", squadId);
    } else {
      const { data: inserted, error } = await supabase
        .from("selection_squads")
        .insert({
          organization_id: profile.organization_id,
          edition_id: editionId,
          season_id: season?.season_id ?? null,
          year_id: (season?.seasons as any)?.year_id ?? null,
          squad_type: "totw",
          round_id: roundId,
          created_by: profile.id,
          formation,
        })
      .select("id").single();
    if (error) return { error: error.message };
    squadId = inserted.id;
  }

  if (members.length > 0) {
    const { error } = await supabase.from("selection_squad_members").insert(
      members.map(m => ({
        squad_id: squadId,
        athlete_id: m.athleteId ?? null,
        staff_member_id: m.staffMemberId ?? null,
        team_id: m.teamId,
        display_order: m.displayOrder,
      }))
    );
    if (error) return { error: error.message };
  }

  await recalcularSelectionStats(supabase, editionId);
  return { success: true };
}

const SQUAD_MEMBERS_SELECT =
  "id, squad_type, formation, selection_squad_members(id, athlete_id, staff_member_id, team_id, display_order, athletes(id, full_name, surname, photo_url, player_positions(full_name, abbreviation)), staff_members(id, full_name, surname, photo_url, staff_roles(full_name)), teams(id, full_name, abbreviation, logo_url, primary_color))";

export async function buscarTOTS(
  editionId: string,
): Promise<{ squad: any | null } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: squad, error } = await supabase
    .from("selection_squads")
    .select(SQUAD_MEMBERS_SELECT)
    .eq("edition_id", editionId)
    .eq("squad_type", "tots")
    .is("round_id", null)
    .maybeSingle();

  if (error) return { error: error.message };
  return { squad: squad ?? null };
}

export async function criarOuAtualizarTOTS(
  editionId: string,
  members: { athleteId?: string; staffMemberId?: string; teamId: string; displayOrder: number }[],
  formation: string = "2-3-1",
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id, organization_id")
    .eq("auth_user_id", user.id).maybeSingle();
  if (!profile) return { error: "Perfil não encontrado." };

  const { data: season } = await supabase
    .from("competition_editions").select("season_id, seasons(year_id)")
    .eq("id", editionId).maybeSingle();

  let squadId: string;
  const { data: existing } = await supabase
    .from("selection_squads")
    .select("id")
    .eq("edition_id", editionId)
    .eq("squad_type", "tots")
    .is("round_id", null)
    .maybeSingle();

  if (existing) {
    squadId = existing.id;
    await supabase.from("selection_squad_members").delete().eq("squad_id", squadId);
    await supabase.from("selection_squads").update({ formation }).eq("id", squadId);
  } else {
    const { data: inserted, error } = await supabase
      .from("selection_squads")
      .insert({
        organization_id: profile.organization_id,
        edition_id: editionId,
        season_id: season?.season_id ?? null,
        year_id: (season?.seasons as any)?.year_id ?? null,
        squad_type: "tots",
        round_id: null,
        created_by: profile.id,
        formation,
      })
      .select("id").single();
    if (error) return { error: error.message };
    squadId = inserted.id;
  }

  if (members.length > 0) {
    const { error } = await supabase.from("selection_squad_members").insert(
      members.map(m => ({
        squad_id: squadId,
        athlete_id: m.athleteId ?? null,
        staff_member_id: m.staffMemberId ?? null,
        team_id: m.teamId,
        display_order: m.displayOrder,
      })),
    );
    if (error) return { error: error.message };
  }

  await recalcularSelectionStats(supabase, editionId);
  return { success: true };
}

export async function criarOuAtualizarMOTW(
  editionId: string,
  roundId: string,
  athleteId: string,
  teamId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id, organization_id")
    .eq("auth_user_id", user.id).maybeSingle();
  if (!profile) return { error: "Perfil não encontrado." };

  const { data: season } = await supabase
    .from("competition_editions").select("season_id, seasons(year_id)")
    .eq("id", editionId).maybeSingle();

  const { data: existing } = await supabase
    .from("selection_squads")
    .select("id").eq("edition_id", editionId).eq("round_id", roundId).eq("squad_type", "motw")
    .maybeSingle();

  if (existing) {
    await supabase.from("selection_squad_members").delete().eq("squad_id", existing.id);
    await supabase.from("selection_squads").delete().eq("id", existing.id);
  }

  const { data: inserted, error } = await supabase
    .from("selection_squads")
    .insert({
      organization_id: profile.organization_id,
      edition_id: editionId,
      season_id: season?.season_id ?? null,
      year_id: (season?.seasons as any)?.year_id ?? null,
      squad_type: "motw",
      round_id: roundId,
      created_by: profile.id,
    })
    .select("id").single();

  if (error) return { error: error.message };

  const { error: memberError } = await supabase
    .from("selection_squad_members")
    .insert({ squad_id: inserted.id, athlete_id: athleteId, team_id: teamId, display_order: 1 });

  if (memberError) return { error: memberError.message };

  await recalcularSelectionStats(supabase, editionId);
  return { success: true };
}

async function recalcularSelectionStats(supabase: any, editionId: string) {
  const { data: squads } = await supabase
    .from("selection_squads")
    .select("id, squad_type")
    .eq("edition_id", editionId);

  if (!squads || squads.length === 0) return;

  const squadIds = squads.map((s: any) => s.id);
  const totwSquadIds = squads.filter((s: any) => s.squad_type === "totw").map((s: any) => s.id);
  const totsSquadIds = squads.filter((s: any) => s.squad_type === "tots").map((s: any) => s.id);
  const motwSquadIds = squads.filter((s: any) => s.squad_type === "motw").map((s: any) => s.id);

  const { data: allMembers } = await supabase
    .from("selection_squad_members")
    .select("athlete_id, squad_id")
    .in("squad_id", squadIds)
    .not("athlete_id", "is", null);

  if (!allMembers) return;

  const totwCounts: Record<string, number> = {};
  const totsCounts: Record<string, number> = {};
  const motwCounts: Record<string, number> = {};

  allMembers.forEach((m: any) => {
    if (!m.athlete_id) return;
    if (totwSquadIds.includes(m.squad_id)) {
      totwCounts[m.athlete_id] = (totwCounts[m.athlete_id] ?? 0) + 1;
    }
    if (totsSquadIds.includes(m.squad_id)) {
      totsCounts[m.athlete_id] = (totsCounts[m.athlete_id] ?? 0) + 1;
    }
    if (motwSquadIds.includes(m.squad_id)) {
      motwCounts[m.athlete_id] = (motwCounts[m.athlete_id] ?? 0) + 1;
    }
  });

  const { data: stats } = await supabase
    .from("athlete_edition_stats")
    .select("id, athlete_id")
    .eq("edition_id", editionId);

  if (!stats) return;

  const updates = stats.map((s: any) => ({
    id: s.id,
    totw_count: totwCounts[s.athlete_id] ?? 0,
    tots_count: totsCounts[s.athlete_id] ?? 0,
    motw_count: motwCounts[s.athlete_id] ?? 0,
  }));

  if (updates.length > 0) {
    await supabase
      .from("athlete_edition_stats")
      .upsert(updates, { onConflict: "id" });
  }
}

export async function deletarSquad(
  squadId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  await supabase.from("selection_squad_members").delete().eq("squad_id", squadId);
  const { error } = await supabase.from("selection_squads").delete().eq("id", squadId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function criarConfronto(
  phaseId: string,
  roundId: string,
  teamAId: string | null,
  teamBId: string | null,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
 
  const { data: round } = await supabase
    .from("rounds")
    .select("name, custom_label, display_order")
    .eq("id", roundId)
    .maybeSingle();
 
  if (!round) return { error: "Rodada não encontrada." };
 
  const roundLabel = round.name ?? "";
  const roundDisplayLabel = round.custom_label ?? round.name ?? "";
 
  const { data: existing } = await supabase
    .from("matchups")
    .select("display_order")
    .eq("phase_id", phaseId)
    .eq("round_label", roundLabel)
    .order("display_order", { ascending: false })
    .limit(1);
 
  const maxOrder = existing?.[0]?.display_order ?? 0;
  const nextOrder = maxOrder + 1;
 
  const { data: inserted, error } = await supabase
    .from("matchups")
    .insert({
      phase_id: phaseId,
      round_id: roundId,
      round_label: roundDisplayLabel,
      team_a_id: teamAId || null,
      team_b_id: teamBId || null,
      display_order: nextOrder,
      is_completed: false,
    })
    .select("id")
    .single();
 
  if (error) return { error: error.message };
  return { id: inserted.id };
}
 
export async function criarPartidaNoConfronto(
  phaseId: string,
  matchupId: string,
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
 
  const { data: matchup } = await supabase
    .from("matchups")
    .select("team_a_id, team_b_id, round_id, phase_id")
    .eq("id", matchupId)
    .maybeSingle();
 
  if (!matchup) return { error: "Confronto não encontrado." };
  if (!matchup.team_a_id || !matchup.team_b_id) {
    return { error: "Defina os dois times antes de adicionar partidas." };
  }
 
  const match_date = String(formData.get("match_date") ?? "").trim() || null;
  const match_time = String(formData.get("match_time") ?? "").trim() || null;
  const venue_id = String(formData.get("venue_id") ?? "").trim() || null;
  const is_second_leg = formData.get("is_second_leg") === "true";
 
  const { data: inserted, error } = await supabase
    .from("matches")
    .insert({
      phase_id: phaseId,
      round_id: null,
      matchup_id: matchupId,
      team_a_id: matchup.team_a_id,
      team_b_id: matchup.team_b_id,
      team_a_is_home: !is_second_leg,
      match_date,
      match_time,
      venue_id,
      is_second_leg,
      status: "scheduled",
      score_a: 0,
      score_b: 0,
      result_only_mode: false,
    })
    .select("id")
    .single();
 
  if (error) return { error: error.message };
  return { id: inserted.id };
}
 
export async function editarTimesConfronto(
  matchupId: string,
  teamAId: string | null,
  teamBId: string | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
 
  const { data: partidas } = await supabase
    .from("matches")
    .select("id")
    .eq("matchup_id", matchupId)
    .limit(1);
 
  if (partidas && partidas.length > 0) {
    return { error: "Não é possível alterar os times de um confronto que já possui partidas." };
  }
 
  const { error } = await supabase
    .from("matchups")
    .update({ team_a_id: teamAId || null, team_b_id: teamBId || null })
    .eq("id", matchupId);
 
  if (error) return { error: error.message };
  return { success: true };
}

// ← NOVO: permite editar datas de um stint manualmente (correção retroativa pelo admin)
export async function editarStint(
  stintId: string,
  startedAt: string,       // formato YYYY-MM-DD
  endedAt: string | null,  // null = stint ainda ativo
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const isCurrent = endedAt === null;

  const { error } = await supabase
    .from("athlete_team_stints")
    .update({
      started_at: startedAt,
      ended_at: endedAt,
      is_current: isCurrent,
    })
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function editarStintStaff(
  stintId: string,
  startedAt: string,
  endedAt: string | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const isCurrent = endedAt === null;

  const { error } = await supabase
    .from("staff_team_stints")
    .update({
      started_at: startedAt,
      ended_at: endedAt,
      is_current: isCurrent,
    })
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function recalcularEstatisticasEdicao(
  editionId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: roster } = await supabase
    .from("edition_roster_entries")
    .select("athlete_id, edition_teams!inner(edition_id)")
    .eq("edition_teams.edition_id", editionId)
    .eq("status", "approved")
    .eq("member_type", "athlete")
    .not("athlete_id", "is", null);

  if (roster?.length) {
    const athleteIds = [...new Set(roster.map((r) => r.athlete_id as string))];

    for (const athleteId of athleteIds) {
      const { error } = await supabase.rpc("recalculate_athlete_edition_stats", {
        p_athlete_id: athleteId,
        p_edition_id: editionId,
      });
      if (error) return { error: error.message };
    }

    for (const athleteId of athleteIds) {
      const { error } = await supabase.rpc("recalculate_athlete_career_stats", {
        p_athlete_id: athleteId,
      });
      if (error) return { error: error.message };
    }
  }

  const { error: teamError } = await supabase.rpc("recalculate_team_edition_stats", {
    p_edition_id: editionId,
  });
  if (teamError) return { error: teamError.message };

  const { reapplyStandingsOverridesForEdition } = await import("@/lib/edition-stats-sync");
  const overridesResult = await reapplyStandingsOverridesForEdition(supabase, editionId);
  if (overridesResult.error) return { error: overridesResult.error };

  return { success: true };
}

export async function salvarAjustesPontosClassificacao(
  editionId: string,
  phaseId: string,
  adjustments: { editionTeamId: string; awarded: number; deducted: number }[],
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  if (!phaseId) return { error: "Fase não selecionada." };

  const { addStandingsPointAdjustments, syncTeamEditionStandings } = await import("@/lib/edition-stats-sync");

  const deltas = adjustments
    .map((a) => ({ editionTeamId: a.editionTeamId, delta: a.awarded - a.deducted }))
    .filter((a) => a.delta !== 0);

  const adjustResult = await addStandingsPointAdjustments(supabase, phaseId, deltas);
  if (adjustResult.error) return { error: adjustResult.error };

  const syncResult = await syncTeamEditionStandings(supabase, editionId);
  if (syncResult.error) return { error: syncResult.error };

  return { success: true };
}

export async function salvarRankingConfig(
  editionId: string,
  configs: { category_code: string; points_value: number }[],
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();
  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const rows = configs.map(c => ({
    edition_id: editionId,
    category_code: c.category_code,
    points_value: c.points_value,
  }));

  const { error } = await supabase
    .from("edition_ranking_config")
    .upsert(rows, { onConflict: "edition_id,category_code" });

  if (error) return { error: error.message };
  return { success: true };
}