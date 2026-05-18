"use server";

import { createClient } from "@/lib/supabase-server";

export async function submeterInscricao(
  editionTeamId: string,
  athleteId: string,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Confirma que é representante ativo
  const { data: rep } = await supabase
    .from("representatives")
    .select("id")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!rep) return { error: "Sem permissão." };

  // Busca edition_id a partir do edition_team
  const { data: editionTeam } = await supabase
    .from("edition_teams")
    .select("id, edition_id")
    .eq("id", editionTeamId)
    .maybeSingle();

  if (!editionTeam) return { error: "Vínculo equipe-edição não encontrado." };

  const editionId = editionTeam.edition_id;

  // ── Validação 1: janela de inscrição aberta ──
  const now = new Date().toISOString();
  const { data: windows } = await supabase
    .from("edition_registration_windows")
    .select("opens_at, closes_at")
    .eq("edition_id", editionId)
    .eq("is_active", true)
    .lte("opens_at", now)
    .gte("closes_at", now);

  if (!windows || windows.length === 0) {
    return { error: "Não há janela de inscrição aberta no momento." };
  }

  // ── Validação 2: limite de atletas ──
  const { data: settings } = await supabase
    .from("edition_settings")
    .select("max_athletes, min_age, max_age")
    .eq("edition_id", editionId)
    .maybeSingle();

  if (settings?.max_athletes) {
    const { count } = await supabase
      .from("edition_roster_entries")
      .select("id", { count: "exact", head: true })
      .eq("edition_team_id", editionTeamId)
      .eq("member_type", "athlete")
      .neq("status", "inactive")
      .neq("status", "rejected");

    if ((count ?? 0) >= settings.max_athletes) {
      return { error: `Limite de ${settings.max_athletes} atletas atingido para esta equipe.` };
    }
  }

  // ── Validação 3: faixa etária ──
  if (settings?.min_age || settings?.max_age) {
    const { data: athlete } = await supabase
      .from("athletes")
      .select("birth_date, full_name")
      .eq("id", athleteId)
      .maybeSingle();

    if (athlete?.birth_date) {
      const birthYear = new Date(athlete.birth_date).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;

      if (settings.min_age && age < settings.min_age) {
        return { error: `${athlete.full_name} tem ${age} anos — abaixo da idade mínima (${settings.min_age}).` };
      }
      if (settings.max_age && age > settings.max_age) {
        return { error: `${athlete.full_name} tem ${age} anos — acima da idade máxima (${settings.max_age}).` };
      }
    }
  }

  // ── Validação 4: já inscrito ──
  const { data: existing } = await supabase
    .from("edition_roster_entries")
    .select("id, status")
    .eq("edition_team_id", editionTeamId)
    .eq("athlete_id", athleteId)
    .neq("status", "inactive")
    .maybeSingle();

  if (existing) {
    const statusLabel = existing.status === "pending" ? "pendente de aprovação" : "já aprovado";
    return { error: `Este atleta já está inscrito nesta equipe (${statusLabel}).` };
  }

  // ── INSERT ──
  const { data: inserted, error } = await supabase
    .from("edition_roster_entries")
    .insert({
      edition_team_id: editionTeamId,
      athlete_id: athleteId,
      member_type: "athlete",
      status: "pending",
      submitter_type: "representative",
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}