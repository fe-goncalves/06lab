"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { validarTipoImagem, MAX_IMAGE_SIZE, gerarNomeSeguro, extensaoSegura } from "@/lib/security/uploads";

function parseDate(ddmmaaaa: string): string | null {
  const cleaned = ddmmaaaa.replace(/\D/g, "");
  if (cleaned.length !== 8) return null;
  const d = cleaned.slice(0, 2);
  const m = cleaned.slice(2, 4);
  const y = cleaned.slice(4, 8);
  return `${y}-${m}-${d}`;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return { user, organization_id: profile?.organization_id ?? null };
}

export async function criarAtleta(formData: FormData) {
  const supabase = await createClient();
  const { organization_id } = await getProfile(supabase);

  if (!organization_id) return { error: "Organização não encontrada." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Nome completo é obrigatório." };

  const surname = String(formData.get("surname") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "") || null;
  const position_id = String(formData.get("position_id") ?? "") || null;
  const rg = onlyDigits(String(formData.get("rg") ?? "")) || null;

  const birthRaw = String(formData.get("birth_date") ?? "").trim();
  const birth_date = birthRaw ? parseDate(birthRaw) : null;

  let photo_url: string | null = null;
  const file = formData.get("photo") as File | null;
  if (file && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: "A imagem deve ter no máximo 5 MB." };
    }
    const tipoValido = await validarTipoImagem(file);
    if (!tipoValido) {
      return { error: "Formato inválido. Envie PNG, JPEG ou WebP." };
    }
    const ext = await extensaoSegura(file);
    const path = `athletes/${gerarNomeSeguro(ext)}`;
    const { error: uploadError } = await supabase.storage
      .from("photo")
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photo").getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  const { data: inserted, error } = await supabase
    .from("athletes")
    .insert({ full_name, surname, gender, position_id, rg, birth_date, photo_url, organization_id })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: inserted.id };
}

export async function editarAtleta(id: string, formData: FormData) {
  const supabase = await createClient();
  const { organization_id } = await getProfile(supabase);

  if (!organization_id) return { error: "Organização não encontrada." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Nome completo é obrigatório." };

  const surname = String(formData.get("surname") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "") || null;
  const position_id = String(formData.get("position_id") ?? "") || null;
  const rg = onlyDigits(String(formData.get("rg") ?? "")) || null;
  const cpf = onlyDigits(String(formData.get("cpf") ?? "")) || null;

  const birthRaw = String(formData.get("birth_date") ?? "").trim();
  const birth_date = birthRaw ? parseDate(birthRaw) : null;

  const { data: existing } = await supabase
    .from("athletes")
    .select("id, photo_url")
    .eq("id", id)
    .eq("organization_id", organization_id)
    .maybeSingle();

  if (!existing) return { error: "Atleta não encontrado." };

  let photo_url: string | null = existing.photo_url;
  const file = formData.get("photo") as File | null;
  if (file && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: "A imagem deve ter no máximo 5 MB." };
    }
    const tipoValido = await validarTipoImagem(file);
    if (!tipoValido) {
      return { error: "Formato inválido. Envie PNG, JPEG ou WebP." };
    }
    const ext = await extensaoSegura(file);
    const path = `athletes/${gerarNomeSeguro(ext)}`;
    const { error: uploadError } = await supabase.storage
      .from("photo")
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("photo").getPublicUrl(path);
    photo_url = pub.publicUrl;
  }

  const { error } = await supabase
    .from("athletes")
    .update({ full_name, surname, gender, position_id, rg, cpf, birth_date, photo_url })
    .eq("id", id)
    .eq("organization_id", organization_id);

  if (error) return { error: error.message };
  return { success: true };
}

function subtractDay(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function rangesOverlap(
  aStart: string,
  aEnd: string | null,
  bStart: string,
  bEnd: string | null,
): boolean {
  const ae = aEnd ?? "9999-12-31";
  const be = bEnd ?? "9999-12-31";
  return aStart <= be && bStart <= ae;
}

export async function transferirAtleta(
  athleteId: string,
  startedAt: string,
  teamId: string | null,
  leaveFree: boolean,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: allStints } = await supabase
    .from("athlete_team_stints")
    .select("id, started_at, ended_at, is_current")
    .eq("athlete_id", athleteId);

  const current = (allStints ?? []).find((s) => s.ended_at === null || s.is_current);

  if (leaveFree) {
    if (!current) return { error: "Já está sem clube." };
    if (startedAt <= current.started_at) return { error: "A data deve ser posterior ao início do vínculo atual." };
    const { error } = await supabase
      .from("athlete_team_stints")
      .update({ ended_at: startedAt, is_current: false })
      .eq("id", current.id);
    if (error) return { error: error.message };
    return { success: true };
  }

  if (!teamId) return { error: "Selecione uma equipe." };

  if (current) {
    if (startedAt <= current.started_at) return { error: "A data deve ser posterior ao início do vínculo atual." };
    const prevEnd = subtractDay(startedAt);
    const { error: endErr } = await supabase
      .from("athlete_team_stints")
      .update({ ended_at: prevEnd < current.started_at ? current.started_at : prevEnd, is_current: false })
      .eq("id", current.id);
    if (endErr) return { error: endErr.message };
  } else {
    for (const s of allStints ?? []) {
      if (rangesOverlap(startedAt, null, s.started_at, s.ended_at)) {
        return { error: "A data conflita com um vínculo existente." };
      }
    }
  }

  const { error } = await supabase.from("athlete_team_stints").insert({
    athlete_id: athleteId,
    team_id: teamId,
    started_at: startedAt,
    is_current: true,
    ended_at: null,
    movement_type: "transfer",
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function editarStintCompleto(
  stintId: string,
  payload: {
    startedAt: string;
    endedAt: string | null;
    isCurrent: boolean;
    isActive: boolean;
    hideFreeAfter?: boolean;
  },
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: stint } = await supabase
    .from("athlete_team_stints")
    .select("id, athlete_id")
    .eq("id", stintId)
    .maybeSingle();
  if (!stint) return { error: "Vínculo não encontrado." };

  const { data: allStints } = await supabase
    .from("athlete_team_stints")
    .select("id, started_at, ended_at")
    .eq("athlete_id", stint.athlete_id);

  if (payload.endedAt && payload.startedAt > payload.endedAt) {
    return { error: "A data de fim não pode ser anterior ao início." };
  }

  const effectiveEnd = payload.isCurrent ? null : payload.endedAt;
  for (const other of allStints ?? []) {
    if (other.id === stintId) continue;
    if (rangesOverlap(payload.startedAt, effectiveEnd, other.started_at, other.ended_at)) {
      return { error: "O período conflita com outro vínculo." };
    }
  }

  if (payload.isCurrent) {
    const others = (allStints ?? []).filter((s) => s.id !== stintId);
    const latestOther = others.reduce((max, s) => (s.started_at > max ? s.started_at : max), "");
    if (latestOther && payload.startedAt < latestOther) {
      return { error: "Só pode ser atual se a data de início for a mais recente." };
    }
    for (const other of others) {
      if (other.ended_at !== null) {
        await supabase
          .from("athlete_team_stints")
          .update({ is_current: false })
          .eq("id", other.id);
        continue;
      }
      const prevEnd = subtractDay(payload.startedAt);
      const effectiveEnd = prevEnd < other.started_at ? other.started_at : prevEnd;
      await supabase
        .from("athlete_team_stints")
        .update({ is_current: false, ended_at: effectiveEnd })
        .eq("id", other.id);
    }
  } else {
    await supabase
      .from("athlete_team_stints")
      .update({ is_current: false })
      .eq("athlete_id", stint.athlete_id)
      .neq("id", stintId);
  }

  const updatePayload: Record<string, unknown> = {
    started_at: payload.startedAt,
    ended_at: payload.isCurrent ? null : payload.endedAt,
    is_current: payload.isCurrent,
    is_active: payload.isActive,
  };
  if (payload.hideFreeAfter !== undefined) {
    updatePayload.hide_free_after = payload.hideFreeAfter;
  }

  const { error } = await supabase
    .from("athlete_team_stints")
    .update(updatePayload)
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function vincularAtleta(
  athleteId: string,
  teamId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  // Encerra stint atual se existir
  await supabase
    .from("athlete_team_stints")
    .update({ ended_at: new Date().toISOString().split("T")[0], is_current: false })
    .eq("athlete_id", athleteId)
    .eq("is_current", true);

  // Cria novo stint
  const { error } = await supabase
    .from("athlete_team_stints")
    .insert({
      athlete_id: athleteId,
      team_id: teamId,
      started_at: new Date().toISOString().split("T")[0],
      is_current: true,
    });

  if (error) return { error: error.message };

  return { success: true };
}

export async function encerrarVinculoAtual(
  athleteId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: current } = await supabase
    .from("athlete_team_stints")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("is_current", true)
    .maybeSingle();

  if (!current) return { error: "Não há vínculo atual para encerrar." };

  const { error } = await supabase
    .from("athlete_team_stints")
    .update({
      ended_at: new Date().toISOString().split("T")[0],
      is_current: false,
    })
    .eq("id", current.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function adicionarStint(
  athleteId: string,
  teamId: string,
  startedAt: string,
  endedAt: string | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("athlete_team_stints")
    .insert({
      athlete_id: athleteId,
      team_id: teamId,
      movement_type: "arrival",
      started_at: startedAt,
      ended_at: endedAt,
      is_current: false,
    });

  if (error) return { error: error.message };
  return { success: true };
}

export async function removerStint(
  stintId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: stint } = await supabase
    .from("athlete_team_stints")
    .select("id, athlete_id, ended_at, is_current, started_at")
    .eq("id", stintId)
    .maybeSingle();

  if (!stint) return { error: "Vínculo não encontrado." };
  if (stint.ended_at === null || stint.is_current) {
    return { error: "Não é possível excluir o vínculo atual. Transfira ou encerre antes." };
  }

  const { data: siblings } = await supabase
    .from("athlete_team_stints")
    .select("id, started_at, ended_at")
    .eq("athlete_id", stint.athlete_id)
    .neq("id", stintId)
    .order("started_at", { ascending: true });

  const chron = siblings ?? [];
  for (let i = 1; i < chron.length; i++) {
    const prev = chron[i - 1];
    const next = chron[i];
    const ae = prev.ended_at ?? "9999-12-31";
    const be = next.ended_at ?? "9999-12-31";
    if (prev.started_at <= be && next.started_at <= ae) {
      return { error: "Excluir este vínculo deixaria períodos sobrepostos no histórico." };
    }
  }

  const { error } = await supabase
    .from("athlete_team_stints")
    .delete()
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function editarStint(
  stintId: string,
  startedAt: string,
  endedAt: string | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("athlete_team_stints")
    .update({
      started_at: startedAt,
      ended_at: endedAt ?? null,
    })
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleStintAtivo(
  stintId: string,
  isActive: boolean,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("athlete_team_stints")
    .update({ is_active: isActive })
    .eq("id", stintId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function reordenarStints(
  updates: { id: string; display_order: number }[],
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  for (const update of updates) {
    const { error } = await supabase
      .from("athlete_team_stints")
      .update({ display_order: update.display_order })
      .eq("id", update.id);
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function toggleAtletaAtivo(
  id: string,
  isActive: boolean,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { organization_id } = await getProfile(supabase);
  if (!organization_id) return { error: "Organização não encontrada." };

  const { error } = await supabase
    .from("athletes")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("organization_id", organization_id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function verificarPodeExcluirAtleta(
  id: string,
): Promise<{ canDelete: boolean; reasons: string[] }> {
  const supabase = await createClient();
  const { organization_id } = await getProfile(supabase);
  if (!organization_id) return { canDelete: false, reasons: ["Organização não encontrada."] };

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("id", id)
    .eq("organization_id", organization_id)
    .maybeSingle();

  if (!athlete) return { canDelete: false, reasons: ["Atleta não encontrado."] };

  const reasons: string[] = [];

  const [
    { count: rosterCount },
    { count: currentTeamCount },
    { count: lineupCount },
  ] = await Promise.all([
    supabase
      .from("edition_roster_entries")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", id)
      .eq("member_type", "athlete"),
    supabase
      .from("athlete_team_stints")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", id)
      .eq("is_current", true),
    supabase
      .from("match_lineups")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", id),
  ]);

  if ((rosterCount ?? 0) > 0) reasons.push("possui inscrições em competições");
  if ((currentTeamCount ?? 0) > 0) reasons.push("possui vínculo com equipe atual");
  if ((lineupCount ?? 0) > 0) reasons.push("possui participação em jogos");

  return { canDelete: reasons.length === 0, reasons };
}

export async function excluirAtleta(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { organization_id } = await getProfile(supabase);
  if (!organization_id) return { error: "Organização não encontrada." };

  const check = await verificarPodeExcluirAtleta(id);
  if (!check.canDelete) {
    return { error: `Não é possível excluir: ${check.reasons.join(", ")}.` };
  }

  const { error } = await supabase
    .from("athletes")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization_id);

  if (error) return { error: error.message };
  return { success: true };
}
