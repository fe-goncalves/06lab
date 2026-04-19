"use server";

import { createClient } from "@/lib/supabase-server";

export async function criarUsuario(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id, role, id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };
  if (profile.role !== "main" && profile.role !== "supporter") return { error: "Sem permissão." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "relator");

  if (!email || !password) return { error: "Email e senha são obrigatórios." };
  if (profile.role === "supporter" && role === "supporter") return { error: "Supporters não podem criar outros supporters." };
  if (role === "main") return { error: "Não é possível criar outro administrador principal." };

  const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !newUser.user) return { error: authError?.message ?? "Erro ao criar usuário." };

  const { error: profileError } = await supabase
    .from("user_profiles")
    .insert({
      auth_user_id: newUser.user.id,
      organization_id: profile.organization_id,
      role,
      full_name: full_name || null,
      status: "active",
    });

  if (profileError) return { error: profileError.message };
  return { success: true };
}

export async function alterarStatusUsuario(
  profileId: string,
  status: "active" | "inactive",
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("user_profiles").select("role, organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (profile?.role !== "main" && profile?.role !== "supporter") return { error: "Sem permissão." };

  const { error } = await supabase
    .from("user_profiles")
    .update({ status })
    .eq("id", profileId)
    .eq("organization_id", profile?.organization_id ?? "");

  if (error) return { error: error.message };
  return { success: true };
}