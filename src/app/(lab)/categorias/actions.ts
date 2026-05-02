"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function criarCategoriaGlobal(
  label: string,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  if (!profile?.organization_id) return { error: "Organização não encontrada." };

  const trimmed = label.trim();
  if (!trimmed) return { error: "Nome é obrigatório." };

  const { data: last } = await supabase
    .from("categories")
    .select("display_order")
    .eq("organization_id", profile.organization_id)
    .order("display_order", { ascending: false })
    .limit(1).maybeSingle();

  const { data: inserted, error } = await supabase
    .from("categories")
    .insert({
      organization_id: profile.organization_id,
      label: trimmed,
      display_order: (last?.display_order ?? 0) + 1,
    })
    .select("id").single();

  if (error) return { error: error.message };
  revalidatePath("/categorias");
  return { id: inserted.id };
}

export async function editarCategoriaGlobal(
  categoryId: string,
  label: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const trimmed = label.trim();
  if (!trimmed) return { error: "Nome é obrigatório." };

  const { error } = await supabase
    .from("categories")
    .update({ label: trimmed })
    .eq("id", categoryId);

  if (error) return { error: error.message };
  revalidatePath("/categorias");
  return { success: true };
}

export async function deletarCategoriaGlobal(
  categoryId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) return { error: error.message };
  revalidatePath("/categorias");
  return { success: true };
}