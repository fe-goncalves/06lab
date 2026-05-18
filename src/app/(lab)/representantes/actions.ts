"use server";

import { createClient } from "@/lib/supabase-server";

export async function criarRepresentante(
  formData: FormData,
): Promise<{ success: true; tempPassword: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id, role, id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (profile?.role !== "main" && profile?.role !== "supporter") return { error: "Sem permissão." };

  const email = String(formData.get("email") ?? "").trim();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const team_ids = formData.getAll("team_ids").map(String).filter(Boolean);

  if (!email || !full_name) return { error: "Nome e email são obrigatórios." };
  if (team_ids.length === 0) return { error: "Selecione pelo menos uma equipe." };

  // Gera senha temporária aleatória: 3 palavras + número (ex: "fox-arena-42")
  const words = ["atlas", "volta", "arena", "campo", "clube", "norte", "forte", "bola", "gol", "time"];
  const w1 = words[Math.floor(Math.random() * words.length)];
  const w2 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  const tempPassword = `${w1}-${w2}-${num}`;

  const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !newUser.user) return { error: authError?.message ?? "Erro ao criar usuário." };

  const { data: rep, error: repError } = await supabase
    .from("representatives")
    .insert({
      auth_user_id: newUser.user.id,
      organization_id: profile?.organization_id,
      full_name,
      email,
      status: "active",
      created_by: profile?.id,
    })
    .select("id").single();

  if (repError || !rep) {
    // Rollback: remove o usuário do Auth se o INSERT falhou
    await supabase.auth.admin.deleteUser(newUser.user.id);
    return { error: repError?.message ?? "Erro ao criar representante." };
  }

  const { error: accessError } = await supabase
    .from("representative_team_access")
    .insert(team_ids.map(team_id => ({ representative_id: rep.id, team_id })));

  if (accessError) return { error: accessError.message };

  return { success: true, tempPassword };
}

export async function alterarStatusRepresentante(
  id: string,
  status: "active" | "inactive",
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("representatives")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function atualizarEquipesRepresentante(
  representativeId: string,
  teamIds: string[],
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error: deleteError } = await supabase
    .from("representative_team_access")
    .delete()
    .eq("representative_id", representativeId);

  if (deleteError) return { error: deleteError.message };

  if (teamIds.length > 0) {
    const { error: insertError } = await supabase
      .from("representative_team_access")
      .insert(teamIds.map(team_id => ({ representative_id: representativeId, team_id })));
    if (insertError) return { error: insertError.message };
  }

  return { success: true };
}