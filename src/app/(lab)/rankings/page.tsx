import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import RankingsClient from "./rankings-client";
import { buscarOpcoesFiltroRanking } from "./actions";

export default async function RankingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) redirect("/");

  const opcoes = await buscarOpcoesFiltroRanking();
  if ("error" in opcoes) redirect("/");

  return <RankingsClient opcoesFiltro={opcoes} />;
}
