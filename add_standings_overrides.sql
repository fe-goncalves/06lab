-- Ajustes manuais de pontos na classificação (bônus / penalidades por edição).
-- Aplicados após recalculate_team_edition_stats para não serem sobrescritos.

CREATE TABLE IF NOT EXISTS standings_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES competition_editions(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  points_adjustment integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition_id, team_id)
);

CREATE INDEX IF NOT EXISTS standings_overrides_edition_id_idx
  ON standings_overrides (edition_id);
