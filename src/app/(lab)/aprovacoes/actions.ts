"use server";

import { createClient } from "@/lib/supabase-server";

export async function aprovarInscricao(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { error } = await supabase
    .from("edition_roster_entries")
    .update({ status: "approved", reviewed_by: profile?.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function rejeitarInscricao(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { error } = await supabase
    .from("edition_roster_entries")
    .update({ status: "rejected", reviewed_by: profile?.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

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