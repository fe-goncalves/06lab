import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import CompeticoesClient from "./competicoes-client";

export default async function CompeticoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, full_name, short_name, gender, logo_url, pinned_in_sidebar")
    .eq("organization_id", profile?.organization_id ?? "")
    .order("full_name");

  return <CompeticoesClient competitions={competitions ?? []} />;
}