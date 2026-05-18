import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ElencoClient from "./elenco-client";

export default async function RepresentanteElencoPage({
  params,
}: {
  params: Promise<{ teamId: string; edicaoId: string }>;
}) {
  const { teamId, edicaoId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verifica representante ativo com acesso à equipe
  const { data: rep } = await supabase
    .from("representatives")
    .select("id, organization_id")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!rep) redirect("/login");

  const { data: access } = await supabase
    .from("representative_team_access")
    .select("team_id")
    .eq("representative_id", rep.id)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!access) redirect("/representante/equipes");

  // Busca edition_team (vínculo equipe↔edição)
  const { data: editionTeam } = await supabase
    .from("edition_teams")
    .select("id, edition_id, team_id, teams(id, full_name, abbreviation, logo_url, primary_color)")
    .eq("edition_id", edicaoId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!editionTeam) redirect(`/representante/equipes/${teamId}`);

  // Dados em paralelo
  const [
    { data: editionRaw },
    { data: settings },
    { data: windows },
    { data: entries },
    { data: athletes },
  ] = await Promise.all([
    supabase
      .from("competition_editions")
      .select("id, status, seasons(name, years(value)), competitions(id, full_name, short_name, logo_url, primary_color)")
      .eq("id", edicaoId)
      .maybeSingle(),

    supabase
      .from("edition_settings")
      .select("max_athletes, min_age, max_age")
      .eq("edition_id", edicaoId)
      .maybeSingle(),

    supabase
      .from("edition_registration_windows")
      .select("id, opens_at, closes_at, is_active")
      .eq("edition_id", edicaoId)
      .eq("is_active", true),

    supabase
      .from("edition_roster_entries")
      .select("id, status, member_type, submitted_at, athletes(id, full_name, surname, birth_date, photo_url)")
      .eq("edition_team_id", editionTeam.id)
      .eq("member_type", "athlete")
      .neq("status", "inactive")
      .order("submitted_at"),

    // Atletas da organização disponíveis para busca
    supabase
      .from("athletes")
      .select("id, full_name, surname, birth_date, photo_url")
      .eq("organization_id", rep.organization_id)
      .eq("status", "active")
      .order("full_name"),
  ]);

  // Verifica se há janela aberta agora
  const now = new Date();
  const hasOpenWindow = (windows ?? []).some((w: any) => {
    const opens = new Date(w.opens_at);
    const closes = new Date(w.closes_at);
    return now >= opens && now <= closes;
  });

  // IDs já inscritos (para filtrar busca)
  const enrolledAthleteIds = new Set(
    (entries ?? []).map((e: any) => e.athletes?.id).filter(Boolean)
  );

  const availableAthletes = (athletes ?? []).filter(
    (a: any) => !enrolledAthleteIds.has(a.id)
  );

  const team = (editionTeam as any).teams;
  const edition = editionRaw;
  const competition = (edition as any)?.competitions;

  return (
    <div style={{ padding: "32px 40px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <Link href="/representante/equipes" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
          Minhas equipes
        </Link>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.15)" }}>›</span>
        <Link href={`/representante/equipes/${teamId}`} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
          {team?.full_name}
        </Link>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.15)" }}>›</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          {competition?.short_name ?? competition?.full_name}
        </span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        {competition?.logo_url && (
          <img src={competition.logo_url} alt="" style={{ width: 46, height: 46, objectFit: "contain" }} />
        )}
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: 0, marginBottom: 4 }}>
            Elenco inscrito
          </p>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0 }}>
            {competition?.full_name}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.3)", marginLeft: 10 }}>
              · {(edition as any)?.seasons?.name} {(edition as any)?.seasons?.years?.value}
            </span>
          </h1>
        </div>
      </div>

      <ElencoClient
        editionTeamId={editionTeam.id}
        editionId={edicaoId}
        teamId={teamId}
        entries={entries ?? []}
        availableAthletes={availableAthletes}
        hasOpenWindow={hasOpenWindow}
        settings={settings}
        accentColor={team?.primary_color ?? "#BFF205"}
      />
    </div>
  );
}