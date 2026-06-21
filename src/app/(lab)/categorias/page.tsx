import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { OrgGestaoPageShell } from "@/app/(lab)/components/org-gestao-page-shell";
import CategoriasClient from "./categorias-client";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const orgId = profile?.organization_id ?? "";
  if (!orgId) redirect("/");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, label, display_order")
    .eq("organization_id", orgId)
    .order("display_order");

  return (
    <OrgGestaoPageShell>
      <CategoriasClient categories={categories ?? []} />
    </OrgGestaoPageShell>
  );
}
