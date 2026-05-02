// APROVAÇÕES / ACTIONS

"use server";

import { createClient } from "@/lib/supabase-server";

// ─── Inscrições ───────────────────────────────────────────────────────────────

export async function aprovarInscricoes(
  ids: string[],
): Promise<{ success: true; count: number } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id, organization_id")
    .eq("auth_user_id", user.id).maybeSingle();
  if (!profile) return { error: "Perfil não encontrado." };

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("edition_roster_entries")
    .update({ status: "approved", reviewed_by: profile.id, reviewed_at: now })
    .in("id", ids);

  if (error) return { error: error.message };

  // Notificações — uma por entry aprovado
  await _notificarInscricoes(supabase, profile.organization_id, ids, "approved", null);

  return { success: true, count: ids.length };
}

export async function rejeitarInscricoes(
  ids: string[],
  reason: string,
): Promise<{ success: true; count: number } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id, organization_id")
    .eq("auth_user_id", user.id).maybeSingle();
  if (!profile) return { error: "Perfil não encontrado." };

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("edition_roster_entries")
    .update({
      status: "rejected",
      reviewed_by: profile.id,
      reviewed_at: now,
      rejection_reason: reason || null,
    })
    .in("id", ids);

  if (error) return { error: error.message };

  await _notificarInscricoes(supabase, profile.organization_id, ids, "rejected", reason);

  return { success: true, count: ids.length };
}

// Compat — mantém as funções antigas usadas pelo client legado
export async function aprovarInscricao(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const result = await aprovarInscricoes([id]);
  if ("error" in result) return result;
  return { success: true };
}

export async function rejeitarInscricao(
  id: string,
  reason?: string,
): Promise<{ success: true } | { error: string }> {
  const result = await rejeitarInscricoes([id], reason ?? "");
  if ("error" in result) return result;
  return { success: true };
}

// ─── Relatórios (inalterado) ──────────────────────────────────────────────────

export async function aprovarRelatorio(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { error } = await supabase
    .from("match_reports")
    .update({ status: "approved", reviewed_by: profile?.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function rejeitarRelatorio(
  id: string,
  note: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { error } = await supabase
    .from("match_reports")
    .update({ status: "rejected", reviewed_by: profile?.id, reviewed_at: new Date().toISOString(), review_note: note })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Helper de notificações ───────────────────────────────────────────────────

async function _notificarInscricoes(
  supabase: any,
  orgId: string,
  entryIds: string[],
  status: "approved" | "rejected",
  reason: string | null,
) {
  try {
    // Busca dados dos entries para montar as notificações
    const { data: entries } = await supabase
      .from("edition_roster_entries")
      .select("id, member_type, athlete_id, staff_member_id, edition_team_id, edition_teams(team_id, edition_id, teams(full_name))")
      .in("id", entryIds);

    if (!entries?.length) return;

    const notifications = entries.map((e: any) => ({
      organization_id: orgId,
      type: status === "approved" ? "roster_approved" : "roster_rejected",
      payload: {
        entry_id: e.id,
        member_type: e.member_type,
        team_name: e.edition_teams?.teams?.full_name ?? "—",
        edition_id: e.edition_teams?.edition_id ?? null,
        ...(reason ? { reason } : {}),
      },
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    await supabase.from("notifications").insert(notifications);
  } catch {
    // Notificações são best-effort — não interrompem o fluxo principal
  }
}