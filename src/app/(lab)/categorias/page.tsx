import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import CategoriasClient from "./categorias-client";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const { data: categories } = await supabase
    .from("categories")
    .select("id, label, display_order")
    .eq("organization_id", orgId)
    .order("display_order");

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Categorias
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Categorias globais da organização. Cada competição é atribuída a uma categoria (ex: Sub-11, Sub-13, Adulto).
        </p>
      </header>
      <CategoriasClient categories={categories ?? []} />
    </div>
  );
}