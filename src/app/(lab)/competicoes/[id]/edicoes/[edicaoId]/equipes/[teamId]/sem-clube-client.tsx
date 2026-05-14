"use client";

import Link from "next/link";
import Breadcrumb from "@/app/(lab)/components/breadcrumb";

type Props = {
  competitionId: string;
  competitionName: string;
  edicaoId: string;
  edicaoName: string;
  gender: "male" | "female" | string;
  rosterEntries: any[];
};

export default function SemClubeClient({
  competitionId,
  competitionName,
  edicaoId,
  edicaoName,
  gender,
  rosterEntries,
}: Props) {
  const titulo = gender === "female" ? "Sem Clube — Feminino" : "Sem Clube — Masculino";

  const atletas = rosterEntries
    .filter((e) => e.member_type === "athlete" && e.athletes)
    .sort((a, b) => {
      const nA = a.athletes?.surname ?? a.athletes?.full_name ?? "";
      const nB = b.athletes?.surname ?? b.athletes?.full_name ?? "";
      return nA.localeCompare(nB, "pt-BR");
    });

  const statusLabel: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    inactive: "Inativo",
  };

  const statusColor: Record<string, string> = {
    pending: "#A6A6A6",
    approved: "var(--color-brand)",
    inactive: "var(--color-danger)",
  };

  return (
    <div className="p-6 md:p-8">
      <header className="mb-8 flex items-center gap-4">
        <Link
          href={`/competicoes/${competitionId}`}
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          ← {competitionName}
        </Link>
      </header>

      <Breadcrumb
        items={[
          { label: "Competições", href: "/competicoes" },
          { label: competitionName, href: `/competicoes/${competitionId}` },
          { label: edicaoName },
          { label: titulo },
        ]}
      />

      <div className="mb-8">
        <h1
          className="font-display text-2xl"
          style={{ color: "var(--color-text-primary)" }}
        >
          {titulo}
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Atletas sem vínculo com clube nesta edição.
        </p>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <h2
          className="mb-4 font-mono text-xs uppercase tracking-widest"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Atletas ({atletas.length})
        </h2>

        {atletas.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Nenhum atleta sem clube nesta edição.
          </p>
        ) : (
          <ul className="space-y-2">
            {atletas.map((entry) => {
              const athlete = entry.athletes;
              const nome =
                athlete?.surname && athlete.surname !== athlete.full_name
                  ? `${athlete.surname}, ${athlete.full_name}`
                  : athlete?.full_name ?? "—";

              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3"
                  style={{
                    borderColor: "var(--color-border)",
                    backgroundColor: "var(--color-background)",
                  }}
                >
                  {athlete?.photo_url ? (
                    <img
                      src={athlete.photo_url}
                      alt=""
                      className="h-8 w-8 rounded-full border object-cover"
                      style={{ borderColor: "var(--color-border)" }}
                    />
                  ) : (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold"
                      style={{
                        borderColor: "var(--color-border)",
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {(athlete?.surname ?? athlete?.full_name ?? "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <p
                    className="flex-1 text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {nome}
                  </p>

                  {entry.athletes?.player_positions?.abbreviation && (
                    <span
                      className="font-mono text-xs"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {entry.athletes.player_positions.abbreviation}
                    </span>
                  )}

                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-xs"
                    style={{
                      backgroundColor: "var(--color-border)",
                      color: statusColor[entry.status] ?? "var(--color-text-secondary)",
                    }}
                  >
                    {statusLabel[entry.status] ?? entry.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}