"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

export interface SearchResult {
  id: string;
  name: string;
  subtitle?: string;
  avatar_url?: string;
  href: string;
  category: "athletes" | "teams" | "competitions" | "matches" | "staff" | "referees";
}

export interface SearchResults {
  athletes: SearchResult[];
  teams: SearchResult[];
  competitions: SearchResult[];
  matches: SearchResult[];
  staff: SearchResult[];
  referees: SearchResult[];
}

const EMPTY: SearchResults = {
  athletes: [],
  teams: [],
  competitions: [],
  matches: [],
  staff: [],
  referees: [],
};

export function useSearch(organizationId: string | null) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);

  const search = useCallback(
    async (term: string) => {
      if (!organizationId || term.length < 2) {
        setResults(EMPTY);
        return;
      }

      setIsLoading(true);
      const supabase = createClient();
      const like = `%${term}%`;

      try {
        const [
          { data: athletesData },
          { data: teamsData },
          { data: competitionsData },
          { data: matchesAData },
          { data: matchesBData },
          { data: staffData },
          { data: refereesData },
        ] = await Promise.all([
          // Atletas
          supabase
            .from("athletes")
            .select("id, full_name, surname, avatar_url")
            .eq("organization_id", organizationId)
            .ilike("full_name", like)
            .limit(3),

          // Equipes
          supabase
            .from("teams")
            .select("id, full_name, logo_url")
            .eq("organization_id", organizationId)
            .ilike("full_name", like)
            .limit(3),

          // Competições
          supabase
            .from("competitions")
            .select("id, full_name")
            .eq("organization_id", organizationId)
            .ilike("full_name", like)
            .limit(3),

          // Partidas via team_a — busca pelo nome da equipe A
          supabase
            .from("matches")
            .select(
              "id, status, teams_a:teams!matches_team_a_id_fkey(full_name), teams_b:teams!matches_team_b_id_fkey(full_name)"
            )
            .ilike("teams_a.full_name", like)
            .limit(3),

          // Partidas via team_b — busca pelo nome da equipe B
          supabase
            .from("matches")
            .select(
              "id, status, teams_a:teams!matches_team_a_id_fkey(full_name), teams_b:teams!matches_team_b_id_fkey(full_name)"
            )
            .ilike("teams_b.full_name", like)
            .limit(3),

          // Comissão Técnica
          supabase
            .from("staff_members")
            .select("id, full_name, role, avatar_url")
            .eq("organization_id", organizationId)
            .ilike("full_name", like)
            .limit(3),

          // Árbitros
          supabase
            .from("referees")
            .select("id, full_name, avatar_url")
            .eq("organization_id", organizationId)
            .ilike("full_name", like)
            .limit(3),
        ]);

        const STATUS_PT: Record<string, string> = {
          scheduled: "Agendada",
          ongoing: "Ao Vivo",
          finished: "Encerrada",
          postponed: "Adiada",
        };

        // Merge e deduplicação das partidas
        const allMatches = [
          ...(matchesAData ?? []),
          ...(matchesBData ?? []),
        ];
        const seenMatchIds = new Set<string>();
        const uniqueMatches = allMatches.filter((m) => {
          if (seenMatchIds.has(m.id)) return false;
          seenMatchIds.add(m.id);
          return true;
        });

        setResults({
          athletes: (athletesData ?? []).map((a) => ({
            id: a.id,
            name: [a.full_name, a.surname].filter(Boolean).join(" "),
            avatar_url: a.avatar_url ?? undefined,
            href: `/atletas/${a.id}`,
            category: "athletes",
          })),

          teams: (teamsData ?? []).map((t) => ({
            id: t.id,
            name: t.full_name,
            avatar_url: t.logo_url ?? undefined,
            href: `/equipes/${t.id}`,
            category: "teams",
          })),

          competitions: (competitionsData ?? []).map((c) => ({
            id: c.id,
            name: c.full_name,
            href: `/competicoes/${c.id}`,
            category: "competitions",
          })),

          matches: uniqueMatches.slice(0, 3).map((m) => {
            const a = (m.teams_a as any)?.full_name ?? "?";
            const b = (m.teams_b as any)?.full_name ?? "?";
            return {
              id: m.id,
              name: `${a} × ${b}`,
              subtitle: STATUS_PT[m.status] ?? m.status,
              href: `/partidas/${m.id}`,
              category: "matches",
            };
          }),

          staff: (staffData ?? []).map((s) => ({
            id: s.id,
            name: s.full_name,
            subtitle: s.role ?? undefined,
            avatar_url: s.avatar_url ?? undefined,
            href: `/comissao/${s.id}`,
            category: "staff",
          })),

          referees: (refereesData ?? []).map((r) => ({
            id: r.id,
            name: r.full_name,
            avatar_url: r.avatar_url ?? undefined,
            href: `/arbitros/${r.id}`,
            category: "referees",
          })),
        });
      } catch (err) {
        console.error("[useSearch] erro:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [organizationId]
  );

  // Debounce de 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const hasResults = Object.values(results).some((arr) => arr.length > 0);

  return { query, setQuery, results, isLoading, hasResults };
}