import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ConfiguracoesCompeticaoClient from "./configuracoes-client";

export default async function ConfiguracoesCompeticaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [{ data: comp, error }, { data: others }] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).maybeSingle(),
    supabase.from("competitions").select("id, full_name")
      .eq("organization_id", orgId).neq("id", id).order("full_name"),
  ]);

  if (error || !comp) redirect("/competicoes");

  return (
    <ConfiguracoesCompeticaoClient
      competition={comp}
      allCompetitions={others ?? []}
    />
  );
}