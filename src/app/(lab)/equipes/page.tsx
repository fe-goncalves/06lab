import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EquipesClient from "./equipes-client";

export default async function EquipesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, full_name, short_name, abbreviation, gender, logo_url, primary_color, secondary_color, founded_year")
    .eq("organization_id", profile?.organization_id ?? "")
    .order("full_name");

  return <EquipesClient teams={teams ?? []} />;
}