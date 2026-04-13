import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import TemporadasClient from "./temporadas-client";

export default async function TemporadasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [{ data: years }, { data: seasons }] = await Promise.all([
    supabase.from("years").select("id, value").eq("organization_id", orgId).order("value", { ascending: false }),
    supabase.from("seasons").select("id, name, year_id, display_order, starts_at, ends_at, is_current")
      .eq("organization_id", orgId).order("display_order"),
  ]);

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Temporadas</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Gerencie os anos e temporadas da organização.
        </p>
      </header>
      <TemporadasClient years={years ?? []} seasons={seasons ?? []} />
    </div>
  );
}