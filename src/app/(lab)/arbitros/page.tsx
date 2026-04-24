import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ArbitrosClient from "./arbitros-client";

export default async function ArbitrosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { data: referees } = await supabase
    .from("referees")
    .select("id, full_name, surname, photo_url, profile_public, birth_date, referee_role_id")
    .eq("organization_id", profile?.organization_id ?? "")
    .order("full_name");

  return <ArbitrosClient referees={referees ?? []} />;
}