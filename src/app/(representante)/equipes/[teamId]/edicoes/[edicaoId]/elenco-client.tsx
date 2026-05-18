"use client";

import { useState, useMemo } from "react";
import { toast } from "@/app/(lab)/components/toast";
import { submeterInscricao } from "./actions";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: "Pendente",  color: "#F2C005" },
  approved: { label: "Aprovado",  color: "#BFF205" },
  rejected: { label: "Rejeitado", color: "#FF4444" },
};

function SectionHeader({ title, accent = "#BFF205" }: { title: string; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: accent }}>
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${accent}44, transparent)` }} />
    </div>
  );
}

function initials(fullName: string, surname: string | null) {
  const parts = [fullName, surname].filter(Boolean).join(" ").split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase() || "?";
}

type Athlete = {
  id: string;
  full_name: string;
  surname: string | null;
  birth_date: string | null;
  photo_url: string | null;
};

type Entry = {
  id: string;
  status: string;
  member_type: string;
  submitted_at: string | null;
  athletes: Athlete | null;
};

type Props = {
  editionTeamId: string;
  editionId: string;
  teamId: string;
  entries: Entry[];
  availableAthletes: Athlete[];
  hasOpenWindow: boolean;
  settings: { max_athletes: number | null; min_age: number | null; max_age: number | null } | null;
  accentColor: string;
};

export default function ElencoClient({
  editionTeamId,
  entries: initialEntries,
  availableAthletes,
  hasOpenWindow,
  settings,
  accentColor,
}: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return availableAthletes.filter(a =>
      `${a.full_name} ${a.surname ?? ""}`.toLowerCase().includes(q)
    );
  }, [search, availableAthletes]);

  async function handleSubmit(athlete: Athlete) {
    setSubmitting(true);
    const result = await submeterInscricao(editionTeamId, athlete.id);
    setSubmitting(false);

    if ("error" in result) {
      toast("error", result.error);
      return;
    }

    toast("success", `${athlete.full_name} submetido para aprovação.`);
    setSearch("");
    setEntries(prev => [...prev, {
      id: result.id,
      status: "pending",
      member_type: "athlete",
      submitted_at: new Date().toISOString(),
      athletes: athlete,
    }]);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 9,
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--color-text-primary)",
    outline: "none",
    transition: "border-color 0.15s",
    colorScheme: "dark",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Aviso de janela fechada */}
      {!hasOpenWindow && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "#F2C005",
          backgroundColor: "rgba(242,192,5,0.06)",
          border: "1px solid rgba(242,192,5,0.2)",
          borderRadius: 9, padding: "10px 14px",
        }}>
          ⚠ Não há janela de inscrição aberta no momento. Submissões estão bloqueadas.
        </div>
      )}

      {/* SEÇÃO: Submeter atleta */}
      {hasOpenWindow && (
        <div style={{
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "var(--color-surface)",
          padding: "20px 20px 24px",
        }}>
          <SectionHeader title="Submeter atleta" accent={accentColor} />

          <div style={{ position: "relative" }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 5,
            }}>
              Buscar atleta pelo nome
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Digite o nome do atleta…"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = `${accentColor}66`}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
            />

            {/* Resultados da busca */}
            {search.trim().length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                marginTop: 4, borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "#0e0e0e",
                boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                overflow: "hidden",
              }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: "12px 14px" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>
                      Nenhum atleta encontrado.
                    </p>
                  </div>
                ) : (
                  filtered.slice(0, 8).map((athlete, idx) => (
                    <AthleteSearchRow
                      key={athlete.id}
                      athlete={athlete}
                      idx={idx}
                      submitting={submitting}
                      accentColor={accentColor}
                      onSelect={() => handleSubmit(athlete)}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Info de limites */}
          {(settings?.max_athletes || settings?.min_age || settings?.max_age) && (
            <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              {settings.max_athletes && (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                  padding: "3px 10px", borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.3)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  Máx. {settings.max_athletes} atletas
                </span>
              )}
              {(settings.min_age || settings.max_age) && (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                  padding: "3px 10px", borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.3)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  Idade: {settings.min_age ?? "—"} – {settings.max_age ?? "—"} anos
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO: Elenco inscrito */}
      <div style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "var(--color-surface)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "20px 20px 14px" }}>
          <SectionHeader title={`Elenco inscrito (${entries.length})`} accent={accentColor} />
        </div>

        {entries.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "60px 0", textAlign: "center",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              border: "1px dashed rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 14, fontSize: 20,
            }}>
              👤
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
              Nenhum atleta inscrito
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
              {hasOpenWindow ? "Use o campo acima para submeter atletas." : "Aguarde uma janela de inscrição ser aberta."}
            </p>
          </div>
        ) : (
          <div>
            {entries.map((entry, idx) => {
              const athlete = entry.athletes;
              const statusCfg = STATUS_CONFIG[entry.status] ?? { label: entry.status, color: "#A6A6A6" };
              if (!athlete) return null;
              return (
                <div
                  key={entry.id}
                  style={{
                    borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    padding: "12px 20px",
                    display: "flex", alignItems: "center", gap: 12,
                    opacity: 0.85, transition: "opacity 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.85")}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    overflow: "hidden",
                    border: `1px solid ${accentColor}33`,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {athlete.photo_url ? (
                      <img src={athlete.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
                        {initials(athlete.full_name, athlete.surname)}
                      </span>
                    )}
                  </div>

                  {/* Nome */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                      {athlete.full_name}
                      {athlete.surname && (
                        <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>
                          {athlete.surname}
                        </span>
                      )}
                    </p>
                    {athlete.birth_date && (
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.25)", margin: "2px 0 0" }}>
                        {new Date(athlete.birth_date).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>

                  {/* Badge status */}
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "3px 10px", borderRadius: 20,
                    backgroundColor: `${statusCfg.color}15`,
                    color: statusCfg.color,
                    border: `1px solid ${statusCfg.color}30`,
                    flexShrink: 0,
                  }}>
                    {statusCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AthleteSearchRow({
  athlete, idx, submitting, accentColor, onSelect,
}: {
  athlete: Athlete;
  idx: number;
  submitting: boolean;
  accentColor: string;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
        padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10,
        backgroundColor: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        cursor: submitting ? "not-allowed" : "pointer",
        transition: "background-color 0.1s",
        opacity: submitting ? 0.5 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !submitting && onSelect()}
    >
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        overflow: "hidden",
        border: `1px solid ${accentColor}33`,
        backgroundColor: "rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {athlete.photo_url ? (
          <img src={athlete.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
            {initials(athlete.full_name, athlete.surname)}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
          {athlete.full_name}
          {athlete.surname && (
            <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>
              {athlete.surname}
            </span>
          )}
        </p>
        {athlete.birth_date && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.25)", margin: "1px 0 0" }}>
            {new Date(athlete.birth_date).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>

      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
        letterSpacing: "0.06em", textTransform: "uppercase",
        color: accentColor, opacity: hovered ? 1 : 0,
        transition: "opacity 0.1s",
      }}>
        Submeter →
      </span>
    </div>
  );
}