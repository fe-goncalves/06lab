-- Adiciona flag de ativação em competições (desativar ≠ excluir).
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS competitions_is_active_idx
  ON public.competitions (organization_id, is_active);
