import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function RepresentanteEquipesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rep } = await supabase
    .from("representatives")
    .select("id, full_name, organization_id")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!rep) redirect("/login");

  // Busca equipes vinculadas ao representante
  const { data: accesses } = await supabase
    .from("representative_team_access")
    .select("team_id, teams(id, full_name, abbreviation, logo_url, primary_color)")
    .eq("representative_id", rep.id);

  const teams = (accesses ?? [])
    .map((a: any) => a.teams)
    .filter(Boolean);

  return (
    <div style={{ padding: "32px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.25)", marginBottom: 6,
        }}>
          Área do representante
        </p>
        <h1 style={{
          fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900,
          color: "var(--color-text-primary)", margin: 0,
        }}>
          Minhas equipes
        </h1>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 12,
          color: "rgba(255,255,255,0.3)", marginTop: 6,
        }}>
          Selecione uma equipe para ver as competições e gerenciar inscrições.
        </p>
      </div>

      {/* Lista de equipes */}
      {teams.length === 0 ? (
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
            🏟️
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
            Nenhuma equipe vinculada
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
            Aguarde o administrador vincular sua equipe ao seu acesso.
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}>
          {teams.map((team: any) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team }: { team: any }) {
  const accent = team.primary_color ?? "#BFF205";

  return (
    <Link
      href={`/representante/equipes/${team.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          borderRadius: 14,
          border: `1px solid rgba(255,255,255,0.08)`,
          backgroundColor: "var(--color-surface)",
          overflow: "hidden",
          transition: "border-color 0.15s, transform 0.15s",
          cursor: "pointer",
          position: "relative",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}55`;
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Degradê de acento no topo */}
        <div style={{
          height: 4,
          background: `linear-gradient(90deg, ${accent} 0%, ${accent}44 100%)`,
        }} />

        <div style={{ padding: "20px 20px 22px" }}>
          {/* Logo + nome */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12, flexShrink: 0,
              border: `1px solid ${accent}33`,
              backgroundColor: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt=""
                  style={{ width: 42, height: 42, objectFit: "contain" }}
                />
              ) : (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800,
                  color: accent,
                }}>
                  {(team.abbreviation ?? team.full_name).slice(0, 3).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800,
                color: "var(--color-text-primary)", margin: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {team.full_name}
              </p>
              {team.abbreviation && (
                <p style={{
                  fontFamily: "var(--font-mono)", fontSize: 10,
                  color: "rgba(255,255,255,0.3)", margin: "3px 0 0",
                  letterSpacing: "0.08em",
                }}>
                  {team.abbreviation}
                </p>
              )}
            </div>
          </div>

          {/* CTA */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: accent,
            }}>
              Ver competições →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}