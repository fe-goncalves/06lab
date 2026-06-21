// comissao/page

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ComissaoClient from "./comissao-client";

export default async function ComissaoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [{ data: members }, { data: roles }, { data: teams }] = await Promise.all([
    supabase.from("staff_members")
      .select("id, full_name, surname, photo_url, staff_role_id, gender, birth_date, rg, cpf, is_active, staff_team_stints(team_id, is_current, teams(full_name, abbreviation, logo_url, primary_color))")
      .eq("organization_id", orgId)
      .order("full_name"),
    supabase.from("staff_roles").select("id, full_name").eq("sport_slug", "football7").order("display_order"),
    supabase.from("teams")
      .select("id, full_name, short_name, abbreviation, logo_url")
      .eq("organization_id", orgId)
      .eq("is_virtual", false)
      .order("full_name"),
  ]);

  return <ComissaoClient members={members ?? []} roles={roles ?? []} teams={teams ?? []} />;
}
