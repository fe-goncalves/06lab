import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import CompeticoesClient from "./competicoes-client";

type EditionRow = {
  competition_id: string;
  status: string;
  is_current: boolean;
  custom_name: string | null;
  created_at: string;
  seasons: { name: string; years: { value: number } | null } | null;
};

function pickCurrentEdition(editions: EditionRow[]) {
  if (editions.length === 0) return null;
  return (
    editions.find((e) => e.is_current)
    ?? editions.find((e) => e.status === "ongoing")
    ?? [...editions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]
  );
}

function editionDisplayName(edition: EditionRow): string {
  const seasonName = edition.seasons?.name ?? "—";
  const yearValue = edition.seasons?.years?.value ?? 0;
  if (edition.custom_name?.trim()) return edition.custom_name.trim();
  return `${seasonName}${yearValue ? ` ${yearValue}` : ""}`;
}

export default async function CompeticoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id")
    .eq("auth_user_id", user.id).maybeSingle();

  const orgId = profile?.organization_id ?? "";

  const [{ data: competitions }] = await Promise.all([
    supabase
      .from("competitions")
      .select("id, full_name, short_name, gender, logo_url, pinned_in_sidebar, home_priority")
      .eq("organization_id", orgId)
      .order("home_priority", { ascending: false })
      .order("full_name"),
  ]);

  const competitionIds = (competitions ?? []).map((c) => c.id);
  const { data: editions } = competitionIds.length > 0
    ? await supabase
      .from("competition_editions")
      .select("competition_id, status, is_current, custom_name, created_at, seasons(name, years(value))")
      .in("competition_id", competitionIds)
    : { data: [] as EditionRow[] };

  const editionsByCompetition = new Map<string, EditionRow[]>();
  for (const edition of (editions ?? []) as EditionRow[]) {
    const list = editionsByCompetition.get(edition.competition_id) ?? [];
    list.push(edition);
    editionsByCompetition.set(edition.competition_id, list);
  }

  const list = (competitions ?? []).map((competition) => {
    const currentEdition = pickCurrentEdition(editionsByCompetition.get(competition.id) ?? []);
    return {
      id: competition.id,
      full_name: competition.full_name,
      short_name: competition.short_name,
      gender: competition.gender,
      logo_url: competition.logo_url,
      pinned_in_sidebar: competition.pinned_in_sidebar ?? false,
      home_priority: competition.home_priority ?? 0,
      current_edition_name: currentEdition ? editionDisplayName(currentEdition) : null,
      current_edition_status: currentEdition?.status ?? null,
    };
  });

  return <CompeticoesClient competitions={list} />;
}
