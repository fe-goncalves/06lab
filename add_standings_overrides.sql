-- Ajustes manuais de pontos na classificação (bônus / penalidades por fase).
-- Aplicados após recalculate_team_edition_stats para não serem sobrescritos.

CREATE TABLE IF NOT EXISTS standings_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  edition_team_id uuid NOT NULL REFERENCES edition_teams(id) ON DELETE CASCADE,
  points_adjustment integer NOT NULL DEFAULT 0,
  position_override integer,
  reason text,
  applied_by uuid,
  applied_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phase_id, edition_team_id)
);

CREATE INDEX IF NOT EXISTS standings_overrides_phase_id_idx
  ON standings_overrides (phase_id);
