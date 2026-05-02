// EDIÇÕES / ACTIONS

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

  // Cria edition_settings padrão
  await supabase.from("edition_settings").insert({ edition_id: inserted.id });

  // Cria edition_team "sem clube" automaticamente
  const { data: freeAgentTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("full_name", "Sem Clube")
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
  const min_athletes = Number(formData.get("min_athletes") ?? 0) || null;
  const max_athletes = Number(formData.get("max_athletes") ?? 0) || null;
  const min_age = Number(formData.get("min_age") ?? 0) || null;
  const max_age = Number(formData.get("max_age") ?? 0) || null;
  const yellow_card_threshold = Number(formData.get("yellow_card_threshold") ?? 0) || null;
  const is_public = formData.get("is_public") === "true";

  const { error: editionError } = await supabase
    .from("competition_editions")
    .update({ status })
    .eq("id", edicaoId);

  if (editionError) return { error: editionError.message };

  const { error: settingsError } = await supabase
    .from("edition_settings")
    .upsert({
      edition_id: edicaoId,
      is_public,
      min_athletes,
      max_athletes,
      min_age,
      max_age,
      yellow_card_suspension_threshold: yellow_card_threshold,
    }, { onConflict: "edition_id" });

  if (settingsError) return { error: settingsError.message };
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
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

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
  const winning_team_id = String(formData.get("winning_team_id") ?? "").trim() || null;

  if (!award_type) return { error: "Tipo de premiação obrigatório." };
  if (!athlete_id && !winning_team_id) return { error: "Atleta ou equipe é obrigatório." };

  const { data: edition } = await supabase
    .from("competition_editions")
    .select("season_id, seasons(year_id)")
    .eq("id", editionId)
    .maybeSingle();

  const season_id = edition?.season_id ?? null;
  const year_id = (edition?.seasons as any)?.year_id ?? null;

  await supabase
    .from("edition_awards")
    .delete()
    .eq("edition_id", editionId)
    .eq("award_type", award_type);

  const { error } = await supabase
    .from("edition_awards")
    .insert({
      edition_id: editionId,
      organization_id: profile.organization_id,
      season_id,
      year_id,
      award_type,
      athlete_id,
      winning_team_id,
      assigned_by: profile.id,
      assigned_at: new Date().toISOString(),
    });

  if (error) return { error: error.message };
  return { success: true };
}

export async function removerPremiacao(
  awardId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("edition_awards")
    .delete()
    .eq("id", awardId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function aprovarInscricao(
  entryId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { error } = await supabase
    .from("edition_roster_entries")
    .update({
      status: "approved",
      reviewed_by: profile?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) return { error: error.message };
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

export async function transferirAtletaNaEdicao(
  entryId: string,
  newEditionTeamId: string,
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
    .select("edition_id")
    .eq("id", original.edition_team_id)
    .maybeSingle();

  if (!currentET) return { error: "Edição não encontrada." };

  const { data: allETs } = await supabase
    .from("edition_teams")
    .select("id")
    .eq("edition_id", currentET.edition_id);

  const allETIds = (allETs ?? []).map((et: any) => et.id);

  // Marca TODOS os entries ativos/pendentes do membro em qualquer equipe como is_transfer_origin
  if (allETIds.length > 0) {
    const { error: deactivateError } = await supabase
      .from("edition_roster_entries")
      .update({ status: "inactive", is_transfer_origin: true })
      .eq(lookupField, lookupValue)
      .in("edition_team_id", allETIds)
      .in("status", ["pending", "approved"]);

    if (deactivateError) return { error: deactivateError.message };
  }

  // Verifica se já existe um entry (inativo) no destino — reativa em vez de duplicar
  const { data: existingInDest } = await supabase
    .from("edition_roster_entries")
    .select("id")
    .eq("edition_team_id", newEditionTeamId)
    .eq(lookupField, lookupValue)
    .maybeSingle();

  let newEntryId: string;

  if (existingInDest) {
    // Reativa marcando como não-transferência e voltando para pending
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

  // Busca edition_id diretamente
  const { data: currentET } = await supabase
    .from("edition_teams").select("edition_id").eq("id", editionTeamId).maybeSingle();

  if (currentET?.edition_id) {
    const { data: allETs } = await supabase
      .from("edition_teams").select("id").eq("edition_id", currentET.edition_id);
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

  // Busca ou cria o squad
  let squadId: string;
  const { data: existing } = await supabase
    .from("selection_squads")
    .select("id").eq("edition_id", editionId).eq("round_id", roundId).eq("squad_type", "totw")
    .maybeSingle();

  if (existing) {
    squadId = existing.id;
    await supabase.from("selection_squad_members").delete().eq("squad_id", squadId);
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

  // Recalcula totw_count para todos os atletas da edição
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

  // Recalcula motw_count para todos os atletas da edição
  await recalcularSelectionStats(supabase, editionId);

  return { success: true };
}

// Recalcula totw_count e motw_count do zero para todos os atletas da edição
async function recalcularSelectionStats(supabase: any, editionId: string) {
  // Busca todos os squads da edição
  const { data: squads } = await supabase
    .from("selection_squads")
    .select("id, squad_type")
    .eq("edition_id", editionId);

  if (!squads || squads.length === 0) return;

  const squadIds = squads.map((s: any) => s.id);
  const totwSquadIds = squads.filter((s: any) => s.squad_type === "totw").map((s: any) => s.id);
  const motwSquadIds = squads.filter((s: any) => s.squad_type === "motw").map((s: any) => s.id);

  // Busca todos os membros atletas desses squads
  const { data: allMembers } = await supabase
    .from("selection_squad_members")
    .select("athlete_id, squad_id")
    .in("squad_id", squadIds)
    .not("athlete_id", "is", null);

  if (!allMembers) return;

  // Agrupa contagens por athlete_id
  const totwCounts: Record<string, number> = {};
  const motwCounts: Record<string, number> = {};

  allMembers.forEach((m: any) => {
    if (!m.athlete_id) return;
    if (totwSquadIds.includes(m.squad_id)) {
      totwCounts[m.athlete_id] = (totwCounts[m.athlete_id] ?? 0) + 1;
    }
    if (motwSquadIds.includes(m.squad_id)) {
      motwCounts[m.athlete_id] = (motwCounts[m.athlete_id] ?? 0) + 1;
    }
  });

  // Busca todos os athlete_edition_stats da edição
  const { data: stats } = await supabase
    .from("athlete_edition_stats")
    .select("id, athlete_id")
    .eq("edition_id", editionId);

  if (!stats) return;

  // Atualiza cada stat com os novos counts
  const updates = stats.map((s: any) => ({
    id: s.id,
    totw_count: totwCounts[s.athlete_id] ?? 0,
    motw_count: motwCounts[s.athlete_id] ?? 0,
  }));

  // Upsert em lote
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
 
  // Busca a rodada para obter o label e display_order base
  const { data: round } = await supabase
    .from("rounds")
    .select("name, custom_label, display_order")
    .eq("id", roundId)
    .maybeSingle();
 
  if (!round) return { error: "Rodada não encontrada." };
 
  const roundLabel = round.name ?? "";
  const roundDisplayLabel = round.custom_label ?? round.name ?? "";
 
  // Calcula o próximo display_order dentro desta rodada
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
 
/**
 * Cria uma partida dentro de um matchup já existente.
 * Não cria matchup implicitamente — o matchup deve existir.
 * Para fases classificatórias, use criarPartida() em partidas/actions.ts.
 */
export async function criarPartidaNoConfronto(
  phaseId: string,
  matchupId: string,
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
 
  // Busca dados do matchup para obter os times e a rodada
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
      round_id: null, // em mata-mata o agrupamento é pelo matchup, não pela rodada
      matchup_id: matchupId,
      team_a_id: matchup.team_a_id,
      team_b_id: matchup.team_b_id,
      team_a_is_home: !is_second_leg, // na volta o mandante inverte
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
 
/**
 * Atualiza os times de um matchup existente.
 * Usado quando o admin define os times de um confronto "A definir".
 */
export async function editarTimesConfronto(
  matchupId: string,
  teamAId: string | null,
  teamBId: string | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
 
  // Verifica se já há partidas — se sim, não permite trocar os times
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