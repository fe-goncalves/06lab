import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  planned:   { label: "Planejada",   color: "#A6A6A6" },
  active:    { label: "Em andamento", color: "#BFF205" },
  finished:  { label: "Encerrada",   color: "rgba(255,255,255,0.25)" },
  cancelled: { label: "Cancelada",   color: "#FF4444" },
};

export default async function RepresentanteEquipeDetalhe({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Confirma que o representante tem acesso a esta equipe
  const { data: rep } = await supabase
    .from("representatives")
    .select("id")
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

  // Busca dados da equipe
  const { data: team } = await supabase
    .from("teams")
    .select("id, full_name, abbreviation, logo_url, primary_color")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) redirect("/representante/equipes");

  // Busca edições em que a equipe participa
  const { data: editionTeams } = await supabase
    .from("edition_teams")
    .select(`
      id,
      competition_editions(
        id,
        status,
        seasons(name, years(value)),
        competitions(id, full_name, short_name, logo_url, primary_color)
      )
    `)
    .eq("team_id", teamId);

  const editions = (editionTeams ?? [])
    .map((et: any) => ({
      editionTeamId: et.id,
      editionId: et.competition_editions?.id,
      status: et.competition_editions?.status ?? "planned",
      seasonName: et.competition_editions?.seasons?.name ?? "—",
      yearValue: et.competition_editions?.seasons?.years?.value ?? "",
      competition: et.competition_editions?.competitions,
    }))
    .filter((e: any) => e.editionId && e.competition);

  const accent = team.primary_color ?? "#BFF205";

  return (
    <div style={{ padding: "32px 40px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <Link
          href="/representante/equipes"
          style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "rgba(255,255,255,0.3)", textDecoration: "none",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#BFF205")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >
          Minhas equipes
        </Link>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.15)" }}>›</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          {team.full_name}
        </span>
      </div>

      {/* Header da equipe */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12, flexShrink: 0,
          border: `1px solid ${accent}44`,
          backgroundColor: "rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {team.logo_url ? (
            <img src={team.logo_url} alt="" style={{ width: 46, height: 46, objectFit: "contain" }} />
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: accent }}>
              {(team.abbreviation ?? team.full_name).slice(0, 3).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
            letterSpacing: "0.16em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.25)", margin: 0, marginBottom: 4,
          }}>
            Competições da equipe
          </p>
          <h1 style={{
            fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900,
            color: "var(--color-text-primary)", margin: 0,
          }}>
            {team.full_name}
          </h1>
        </div>
      </div>

      {/* Lista de edições */}
      {editions.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 0", textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            border: "1px dashed rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16, fontSize: 24,
          }}>
            🏆
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
            Nenhuma competição encontrada
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
            Esta equipe ainda não está inscrita em nenhuma edição de competição.
          </p>
        </div>
      ) : (
        <div style={{
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "var(--color-surface)",
          overflow: "hidden",
        }}>
          {/* SectionHeader */}
          <div style={{ padding: "18px 20px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 0 }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
                letterSpacing: "0.16em", textTransform: "uppercase", color: "#BFF205",
              }}>
                Competições ({editions.length})
              </span>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(191,242,5,0.3), transparent)" }} />
            </div>
          </div>

          {editions.map((ed: any, idx: number) => (
            <EditionRow key={ed.editionId} edition={ed} idx={idx} teamId={teamId} />
          ))}
        </div>
      )}
    </div>
  );
}

function EditionRow({
  edition,
  idx,
  teamId,
}: {
  edition: any;
  idx: number;
  teamId: string;
}) {
  const compAccent = edition.competition?.primary_color ?? "#BFF205";
  const statusInfo = STATUS_LABEL[edition.status] ?? { label: edition.status, color: "#A6A6A6" };

  return (
    <Link
      href={`/representante/equipes/${teamId}/edicoes/${edition.editionId}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
          padding: "14px 20px",
          display: "flex", alignItems: "center", gap: 14,
          opacity: 0.85, transition: "opacity 0.12s, background-color 0.12s",
          cursor: "pointer",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.opacity = "1";
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(255,255,255,0.02)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.opacity = "0.85";
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
        }}
      >
        {/* Logo da competição */}
        <div style={{
          width: 38, height: 38, borderRadius: 9, flexShrink: 0,
          border: `1px solid ${compAccent}33`,
          backgroundColor: "rgba(255,255,255,0.03)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {edition.competition?.logo_url ? (
            <img
              src={edition.competition.logo_url}
              alt=""
              style={{ width: 28, height: 28, objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, color: compAccent }}>
              {(edition.competition?.short_name ?? edition.competition?.full_name ?? "").slice(0, 3).toUpperCase()}
            </span>
          )}
        </div>

        {/* Nome + temporada */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
            color: "var(--color-text-primary)", margin: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {edition.competition?.full_name}
          </p>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            color: "rgba(255,255,255,0.3)", margin: "3px 0 0",
          }}>
            {edition.seasonName}{edition.yearValue ? ` · ${edition.yearValue}` : ""}
          </p>
        </div>

        {/* Badge de status */}
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
          letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "3px 10px", borderRadius: 20,
          backgroundColor: `${statusInfo.color}15`,
          color: statusInfo.color,
          border: `1px solid ${statusInfo.color}30`,
          flexShrink: 0,
        }}>
          {statusInfo.label}
        </span>

        {/* Seta */}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
          ›
        </span>
      </div>
    </Link>
  );
}