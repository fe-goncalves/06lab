"use client";

import { useState, useTransition } from "react";
import { RefreshCw, X } from "lucide-react";
import {
  buscarHallDaFama,
  recalcularEstatisticas,
  type HallFiltros,
  type HallDaFamaData,
  type AthleteEntry,
  type TeamEntry,
  type StaffEntry,
  type FiltroOpcoes,
} from "./actions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialData: HallDaFamaData;
  opcoesFiltro: FiltroOpcoes;
}

// ─── Definições de categorias ─────────────────────────────────────────────────

const ATHLETE_CATEGORIES: {
  key: keyof HallDaFamaData;
  label: string;
  suffix: string;
  icon: string;
}[] = [
  { key: "artilharia",           label: "Artilharia Histórica",    suffix: "gols",    icon: "⚽" },
  { key: "assistencias",         label: "Mais Assistências",        suffix: "assist.", icon: "🎯" },
  { key: "partidas",             label: "Mais Partidas Jogadas",    suffix: "jogos",   icon: "📋" },
  { key: "cartoes_amarelos",     label: "Mais Cartões Amarelos",    suffix: "amarelos",icon: "🟨" },
  { key: "motm",                 label: "Mais Prêmios MOTM",        suffix: "prêmios", icon: "⭐" },
  { key: "tots",                 label: "Mais Prêmios TOTS",        suffix: "prêmios", icon: "🏅" },
  { key: "totw",                 label: "Mais Prêmios TOTW",        suffix: "prêmios", icon: "📅" },
  { key: "avg_rating",           label: "Maior Média de Avaliação", suffix: "pts",     icon: "📊" },
  { key: "penalty_saves",        label: "Mais Pênaltis Defendidos", suffix: "defesas", icon: "🧤" },
  // Feitos especiais
  { key: "hat_tricks",           label: "Mais Hat-tricks",          suffix: "hat-tricks", icon: "🎩" },
  { key: "pokers",               label: "Mais Pokers",              suffix: "pokers",  icon: "🃏" },
  { key: "manitas",              label: "Mais Manitas",             suffix: "manitas", icon: "🖐️" },
  { key: "participacoes_diretas",label: "Participações Diretas",    suffix: "G+A",     icon: "⚡" },
];

const TEAM_CATEGORIES: {
  key: keyof HallDaFamaData;
  label: string;
  suffix: string;
  icon: string;
}[] = [
  { key: "titulos",            label: "Mais Títulos",             suffix: "títulos",  icon: "🏆" },
  { key: "vitorias",           label: "Mais Vitórias",            suffix: "vitórias", icon: "✅" },
  { key: "aproveitamento",     label: "Melhor Aproveitamento",    suffix: "%",        icon: "📈" },
  { key: "gols_marcados",      label: "Mais Gols Marcados",       suffix: "gols",     icon: "⚽" },
  // Novas categorias
  { key: "sequencia_vitorias", label: "Maior Sequência de V's",   suffix: "vitórias", icon: "🔥" },
  { key: "sequencia_invicto",  label: "Maior Invencibilidade",    suffix: "jogos",    icon: "🛡️" },
  { key: "maior_goleada",      label: "Maior Goleada",            suffix: "gols dif.",icon: "💥" },
  { key: "mais_cleansheets",   label: "Mais Cleansheets",         suffix: "jogos",    icon: "🧱" },
];

const STAFF_CATEGORIES: {
  key: keyof HallDaFamaData;
  label: string;
  suffix: string;
  icon: string;
}[] = [
  { key: "tecnicos_titulos",    label: "Mais Títulos como Técnico",   suffix: "títulos", icon: "🏆" },
  { key: "tecnicos_premiacoes", label: "Mais Prêmios Melhor Técnico", suffix: "prêmios", icon: "🎖️" },
];

// ─── Helpers visuais ──────────────────────────────────────────────────────────

const RANK_COLORS = ["#BFF205", "#A6A6A6", "#F2C005"];

function rankColor(idx: number) {
  return RANK_COLORS[idx] ?? "var(--color-text-secondary)";
}

function Avatar({ url, round = true }: { url: string | null; round?: boolean }) {
  return (
    <div style={{
      width: 32, height: 32, flexShrink: 0,
      borderRadius: round ? "50%" : 6,
      overflow: "hidden",
      backgroundColor: "var(--color-background)",
      border: "1px solid var(--color-border)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {url
        ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: round ? "cover" : "contain" }} />
        : <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{round ? "👤" : "🛡️"}</span>
      }
    </div>
  );
}

function ValueBadge({ value, suffix }: { value: number; suffix: string }) {
  const display = suffix === "pts" ? value.toFixed(1) : suffix === "%" ? `${value}%` : String(value);
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800,
      color: "var(--color-brand)", flexShrink: 0,
    }}>
      {display}
    </span>
  );
}

// ─── Modal de ranking completo ────────────────────────────────────────────────

type AnyEntry = AthleteEntry | TeamEntry | StaffEntry;

function isAthleteEntry(e: AnyEntry): e is AthleteEntry {
  return "athlete_id" in e;
}
function isTeamEntry(e: AnyEntry): e is TeamEntry {
  return "team_id" in e;
}

interface ModalProps {
  label: string;
  icon: string;
  suffix: string;
  entries: AnyEntry[];
  onClose: () => void;
}

function RankingModal({ label, icon, suffix, entries, onClose }: ModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#0e0e0e",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          width: "100%", maxWidth: 480,
          maxHeight: "80vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--color-text-primary)", margin: 0,
            }}>
              {label}
            </p>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
              color: "var(--color-text-secondary)", marginLeft: 4,
            }}>
              — {entries.length} atletas
            </span>
          </div>
          <button
            type="button" onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--color-text-secondary)", padding: 4, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Lista scrollável */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {entries.map((entry, idx) => {
            const isAthlete = isAthleteEntry(entry);
            const isTeam    = isTeamEntry(entry);
            const name = isAthlete
              ? (entry.surname ?? entry.full_name)
              : isTeam
                ? entry.full_name
                : ((entry as StaffEntry).surname ?? (entry as StaffEntry).full_name);
            const photoUrl = isAthlete
              ? entry.photo_url
              : isTeam
                ? entry.logo_url
                : (entry as StaffEntry).photo_url;
            const sub = isAthlete
              ? entry.team_name
              : isTeam
                ? (entry as TeamEntry).subtitle ?? null
                : null;

            return (
              <div
                key={isAthlete ? entry.athlete_id : isTeam ? entry.team_id : (entry as StaffEntry).staff_member_id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 20px",
                  borderBottom: idx < entries.length - 1 ? "1px solid var(--color-border)" : "none",
                  backgroundColor: idx < 3 ? "rgba(255,255,255,0.015)" : "transparent",
                }}
              >
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                  color: rankColor(idx), width: 24, flexShrink: 0, textAlign: "center",
                }}>
                  {idx + 1}
                </span>

                <Avatar url={photoUrl} round={!isTeam} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
                    color: "var(--color-text-primary)", margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {name}
                  </p>
                  {sub && (
                    <p style={{
                      fontFamily: "var(--font-mono)", fontSize: 10,
                      color: "var(--color-text-secondary)", margin: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {sub}
                    </p>
                  )}
                </div>

                <ValueBadge value={entry.value} suffix={suffix} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Card de categoria (genérico) ─────────────────────────────────────────────

const PREVIEW_COUNT = 10;

interface CardProps {
  label: string;
  icon: string;
  suffix: string;
  entries: AnyEntry[];
  roundAvatar?: boolean;
}

function CategoryCard({ label, icon, suffix, entries, roundAvatar = true }: CardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const preview = entries.slice(0, PREVIEW_COUNT);
  const hasMore = entries.length > PREVIEW_COUNT;

  return (
    <>
      <div style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--color-border)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--color-text-primary)", margin: 0, flex: 1,
          }}>
            {label}
          </p>
          {entries.length > 0 && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9,
              color: "var(--color-text-secondary)",
            }}>
              {entries.length}
            </span>
          )}
        </div>

        {/* Corpo */}
        {entries.length === 0 ? (
          <div style={{ padding: "20px 16px", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>
              Sem dados
            </p>
          </div>
        ) : (
          <>
            {preview.map((entry, idx) => {
              const isAthlete = isAthleteEntry(entry);
              const isTeam    = isTeamEntry(entry);
              const name = isAthlete
                ? (entry.surname ?? entry.full_name)
                : isTeam
                  ? entry.full_name
                  : ((entry as StaffEntry).surname ?? (entry as StaffEntry).full_name);
              const photoUrl = isAthlete ? entry.photo_url : isTeam ? entry.logo_url : (entry as StaffEntry).photo_url;
              const sub = isAthlete
                ? entry.team_name
                : isTeam
                  ? (entry as TeamEntry).subtitle ?? null
                  : null;

              return (
                <div
                  key={isAthlete ? entry.athlete_id : isTeam ? entry.team_id : (entry as StaffEntry).staff_member_id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "9px 16px",
                    borderTop: idx === 0 ? "none" : "1px solid var(--color-border)",
                  }}
                >
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                    color: rankColor(idx), width: 18, flexShrink: 0, textAlign: "center",
                  }}>
                    {idx + 1}
                  </span>

                  <Avatar url={photoUrl} round={!isTeam && roundAvatar} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
                      color: "var(--color-text-primary)", margin: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {name}
                    </p>
                    {sub && (
                      <p style={{
                        fontFamily: "var(--font-mono)", fontSize: 10,
                        color: "var(--color-text-secondary)", margin: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {sub}
                      </p>
                    )}
                  </div>

                  <ValueBadge value={entry.value} suffix={suffix} />
                </div>
              );
            })}

            {/* Ver mais */}
            {hasMore && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                style={{
                  width: "100%", padding: "10px 16px",
                  backgroundColor: "transparent", border: "none",
                  borderTop: "1px solid var(--color-border)",
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: "var(--color-brand)", cursor: "pointer",
                }}
              >
                Ver ranking completo ({entries.length}) ›
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <RankingModal
          label={label}
          icon={icon}
          suffix={suffix}
          entries={entries}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HallDaFamaClient({ initialData, opcoesFiltro }: Props) {
  const [data, setData] = useState<HallDaFamaData>(initialData);
  const [filtros, setFiltros] = useState<HallFiltros>({});
  const [loading, setLoading] = useState(false);
  const [recalcPending, startRecalc] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const aplicarFiltros = async (novosFiltros: HallFiltros) => {
    setLoading(true);
    const result = await buscarHallDaFama(novosFiltros);
    setLoading(false);
    if ("error" in result) { showToast(`Erro: ${result.error}`); return; }
    setData(result);
  };

  const handleFiltroChange = (campo: keyof HallFiltros, valor: string) => {
    const next = { ...filtros, [campo]: valor || undefined };
    setFiltros(next);
    aplicarFiltros(next);
  };

  const handleRecalcular = () => {
    startRecalc(async () => {
      const result = await recalcularEstatisticas();
      if ("error" in result) { showToast(`Erro: ${result.error}`); return; }
      showToast("Estatísticas atualizadas.");
      const refreshed = await buscarHallDaFama(filtros);
      if (!("error" in refreshed)) setData(refreshed);
    });
  };

  const selectStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.06em", color: "var(--color-text-primary)",
    backgroundColor: "var(--color-background)",
    border: "1px solid var(--color-border)", borderRadius: 8,
    padding: "8px 12px", cursor: "pointer", outline: "none",
    minWidth: 160, appearance: "none" as const,
  };

  const temFiltroAtivo = !!(filtros.competitionId || filtros.seasonId || filtros.teamId || filtros.gender);

  return (
    <div style={{ padding: "32px", minHeight: "100vh" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          backgroundColor: "#141414", border: "1px solid var(--color-border)",
          borderRadius: 10, padding: "12px 18px",
          fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 28, gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900,
            color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.01em",
          }}>
            HALL DA FAMA
          </h1>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "var(--color-text-secondary)", margin: "4px 0 0",
          }}>
            Recordes e líderes históricos da organização
          </p>
        </div>

        <button
          type="button" onClick={handleRecalcular} disabled={recalcPending}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 16px",
            backgroundColor: "rgba(191,242,5,0.08)",
            border: "1px solid rgba(191,242,5,0.25)", borderRadius: 8,
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: recalcPending ? "var(--color-text-secondary)" : "#BFF205",
            cursor: recalcPending ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={13} strokeWidth={2.5}
            style={{ animation: recalcPending ? "spin 1s linear infinite" : "none" }} />
          {recalcPending ? "Recalculando..." : "Recalcular estatísticas"}
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 36,
        padding: "14px 16px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)", borderRadius: 10,
        alignItems: "center",
      }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: "var(--color-text-secondary)", margin: 0, marginRight: 4,
        }}>
          Filtros
        </p>

        <select value={filtros.competitionId ?? ""} onChange={(e) => handleFiltroChange("competitionId", e.target.value)} style={selectStyle}>
          <option value="">Todas as competições</option>
          {opcoesFiltro.competitions.map((c) => (
            <option key={c.id} value={c.id}>{c.short_name ?? c.full_name}</option>
          ))}
        </select>

        <select value={filtros.seasonId ?? ""} onChange={(e) => handleFiltroChange("seasonId", e.target.value)} style={selectStyle}>
          <option value="">Todas as temporadas</option>
          {opcoesFiltro.seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select value={filtros.teamId ?? ""} onChange={(e) => handleFiltroChange("teamId", e.target.value)} style={selectStyle}>
          <option value="">Todas as equipes</option>
          {opcoesFiltro.teams.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </select>

        <select value={filtros.gender ?? ""} onChange={(e) => handleFiltroChange("gender", e.target.value)} style={selectStyle}>
          <option value="">Todos os gêneros</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>

        {temFiltroAtivo && (
          <button
            type="button"
            onClick={() => { setFiltros({}); aplicarFiltros({}); }}
            style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "#FF4444", backgroundColor: "transparent",
              border: "1px solid rgba(255,68,68,0.3)", borderRadius: 6,
              padding: "8px 12px", cursor: "pointer",
            }}
          >
            Limpar
          </button>
        )}

        {loading && (
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            color: "var(--color-brand)", margin: 0, marginLeft: "auto",
          }}>
            Atualizando...
          </p>
        )}
      </div>

      {/* ─── ATLETAS ─── */}
      <SectionHeader label="Atletas" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
        gap: 16, marginBottom: 48,
        opacity: loading ? 0.5 : 1, transition: "opacity 0.2s",
      }}>
        {ATHLETE_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.key}
            label={cat.label} icon={cat.icon} suffix={cat.suffix}
            entries={(data[cat.key] as AthleteEntry[]) ?? []}
            roundAvatar
          />
        ))}
      </div>

      {/* ─── EQUIPES ─── */}
      <SectionHeader label="Equipes" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
        gap: 16, marginBottom: 48,
        opacity: loading ? 0.5 : 1, transition: "opacity 0.2s",
      }}>
        {TEAM_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.key}
            label={cat.label} icon={cat.icon} suffix={cat.suffix}
            entries={(data[cat.key] as TeamEntry[]) ?? []}
            roundAvatar={false}
          />
        ))}
      </div>

      {/* ─── COMISSÃO TÉCNICA ─── */}
      <SectionHeader label="Comissão Técnica" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
        gap: 16,
        opacity: loading ? 0.5 : 1, transition: "opacity 0.2s",
      }}>
        {STAFF_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.key}
            label={cat.label} icon={cat.icon} suffix={cat.suffix}
            entries={(data[cat.key] as StaffEntry[]) ?? []}
            roundAvatar
          />
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <p style={{
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
        letterSpacing: "0.16em", textTransform: "uppercase",
        color: "var(--color-text-secondary)", margin: 0,
      }}>
        {label}
      </p>
      <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-border)" }} />
    </div>
  );
}