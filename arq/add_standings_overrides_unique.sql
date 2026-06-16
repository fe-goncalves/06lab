-- Garante um único override por fase + inscrição (edition_team).
-- Rode no Supabase se ainda não existir.

CREATE UNIQUE INDEX IF NOT EXISTS standings_overrides_phase_edition_team_uidx
  ON standings_overrides (phase_id, edition_team_id);
