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

  // Verifica se já existe edição desta competição nesta temporada
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

  // Upsert nas edition_settings
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

  const { error } = await supabase
    .from("edition_teams")
    .insert({ edition_id: edicaoId, team_id: teamId, arrival_origin: arrivalOrigin || null });

  if (error) return { error: error.message };
  return { success: true };
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
      status: "approved",
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

  // Busca season_id e year_id da edição
  const { data: edition } = await supabase
    .from("competition_editions")
    .select("season_id, seasons(year_id)")
    .eq("id", editionId)
    .maybeSingle();

  const season_id = edition?.season_id ?? null;
  const year_id = (edition?.seasons as any)?.year_id ?? null;

  // Remove premiação anterior do mesmo tipo na edição (uma por tipo)
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