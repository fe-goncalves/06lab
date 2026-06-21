-- Execute no Supabase SQL Editor
-- Permite ocultar períodos "Sem clube" na linha do tempo (após o vínculo indicado)

ALTER TABLE athlete_team_stints
  ADD COLUMN IF NOT EXISTS hide_free_after boolean NOT NULL DEFAULT false;

ALTER TABLE staff_team_stints
  ADD COLUMN IF NOT EXISTS hide_free_after boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN athlete_team_stints.hide_free_after IS 'Quando true, oculta o período sem clube imediatamente após este vínculo.';
COMMENT ON COLUMN staff_team_stints.hide_free_after IS 'Quando true, oculta o período sem clube imediatamente após este vínculo.';
