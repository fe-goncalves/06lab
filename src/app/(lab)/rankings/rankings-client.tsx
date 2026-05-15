"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Trophy } from "lucide-react";

type RankingRow = {
  team_id: string;
  team_name: string;
  logo_url: string | null;
  total_points: number;
};

const GENDER_OPTIONS = [
  { value: "male", label: "MASCULINO" },
  { value: "female", label: "FEMININO" },
];

const SPORT_OPTIONS = [
  { value: "football7", label: "FUTEBOL 7" },
];

export default function RankingsClient({ orgId }: { orgId: string }) {
  const [gender, setGender] = useState("male");
  const [sportSlug, setSportSlug] = useState("football7");
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("calculate_ranking", {
      p_organization_id: orgId,
      p_gender: gender,
      p_sport_slug: sportSlug,
    });
    setLoading(false);
    if (error) { console.error(error); return; }
    setRows(data ?? []);
  }

  useEffect(() => { void load(); }, [orgId, gender, sportSlug]);

  const pillBase: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    padding: "6px 14px",
    borderRadius: "6px",
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.15s",
  };

  function pillStyle(active: boolean): React.CSSProperties {
    return {
      ...pillBase,
      backgroundColor: active ? "var(--color-brand)" : "transparent",
      borderColor: active ? "var(--color-brand)" : "var(--color-border)",
      color: active ? "#0a0a0a" : "#A6A6A6",
    };
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="font-mono font-black tracking-tight"
          style={{ fontSize: "22px", color: "var(--color-text-primary)" }}
        >
          RANKING
        </h1>
        <div className="mt-2 flex items-center gap-4">
          <p className="font-mono text-xs" style={{ color: "#A6A6A6" }}>
            Pontuação histórica acumulada por equipe
          </p>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
            style={{ borderColor: "var(--color-border)", color: "var(--color-brand)", backgroundColor: "transparent" }}
          >
            {loading ? "CALCULANDO..." : "↻ RECALCULAR"}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-6">
        <div className="flex flex-col gap-2">
          <span
            className="font-mono font-bold uppercase"
            style={{ fontSize: "9px", letterSpacing: "0.16em", color: "#A6A6A6" }}
          >
            Gênero
          </span>
          <div className="flex gap-2">
            {GENDER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(opt.value)}
                style={pillStyle(gender === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span
            className="font-mono font-bold uppercase"
            style={{ fontSize: "9px", letterSpacing: "0.16em", color: "#A6A6A6" }}
          >
            Modalidade
          </span>
          <div className="flex gap-2">
            {SPORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSportSlug(opt.value)}
                style={pillStyle(sportSlug === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        {/* Cabeçalho da tabela */}
        <div
          className="grid items-center border-b px-4 py-2"
          style={{
            gridTemplateColumns: "40px 1fr 100px",
            borderColor: "var(--color-border)",
          }}
        >
          <span className="font-mono font-bold" style={{ fontSize: "9px", letterSpacing: "0.16em", color: "#A6A6A6" }}>#</span>
          <span className="font-mono font-bold" style={{ fontSize: "9px", letterSpacing: "0.16em", color: "#A6A6A6" }}>EQUIPE</span>
          <span className="font-mono font-bold text-right" style={{ fontSize: "9px", letterSpacing: "0.16em", color: "#A6A6A6" }}>PONTOS</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="font-mono text-xs" style={{ color: "#A6A6A6" }}>CARREGANDO...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Trophy size={28} strokeWidth={1.5} style={{ color: "#A6A6A6" }} />
            <p className="font-mono text-xs" style={{ color: "#A6A6A6" }}>
              Nenhuma equipe encontrada para este filtro.
            </p>
          </div>
        ) : (
          rows.map((row, idx) => {
            const position = idx + 1;
            const isTop3 = position <= 3;
            const positionColor =
              position === 1 ? "#F2C005" :
              position === 2 ? "#A6A6A6" :
              position === 3 ? "#CD7F32" :
              "var(--color-text-secondary)";

            return (
              <div
                key={row.team_id}
                className="grid items-center border-b px-4 py-3 last:border-b-0"
                style={{
                  gridTemplateColumns: "40px 1fr 100px",
                  borderColor: "var(--color-border)",
                  backgroundColor: position === 1
                    ? "rgba(242,192,5,0.04)"
                    : "transparent",
                }}
              >
                {/* Posição */}
                <span
                  className="font-mono font-black"
                  style={{
                    fontSize: isTop3 ? "14px" : "12px",
                    color: positionColor,
                  }}
                >
                  {position}
                </span>

                {/* Equipe */}
                <div className="flex items-center gap-3 min-w-0">
                  {row.logo_url ? (
                    <img
                      src={row.logo_url}
                      alt=""
                      className="h-8 w-8 rounded object-contain shrink-0"
                    />
                  ) : (
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded border font-mono text-xs font-bold"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      {row.team_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span
                    className="font-mono font-bold truncate"
                    style={{ fontSize: "13px", color: "var(--color-text-primary)" }}
                  >
                    {row.team_name}
                  </span>
                </div>

                {/* Pontos */}
                <div className="text-right">
                  <span
                    className="font-mono font-black"
                    style={{
                      fontSize: "14px",
                      color: isTop3 ? positionColor : "var(--color-text-primary)",
                    }}
                  >
                    {row.total_points}
                  </span>
                  <span
                    className="font-mono ml-1"
                    style={{ fontSize: "9px", color: "#A6A6A6" }}
                  >
                    pts
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}