import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AtletasClient from "./atletas-client";

export default async function AtletasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const [{ data: athletes }, { data: positions }] = await Promise.all([
    supabase.from("athletes")
      .select("id, full_name, surname, gender, photo_url, position_id, birth_date, athlete_team_stints(team_id, is_current, teams(full_name, abbreviation, logo_url, primary_color))")
      .eq("organization_id", profile?.organization_id ?? "")
      .order("full_name"),
    supabase.from("player_positions")
      .select("id, full_name, abbreviation")
      .eq("sport_slug", "football7")
      .order("display_order"),
  ]);

  return <AtletasClient athletes={athletes ?? []} positions={positions ?? []} />;
}
