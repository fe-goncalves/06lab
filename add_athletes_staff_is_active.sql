-- Execute no Supabase SQL Editor
-- Adiciona suporte a desativação de atletas e membros da comissão

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN athletes.is_active IS 'Quando false, o atleta fica oculto das listagens padrão.';
COMMENT ON COLUMN staff_members.is_active IS 'Quando false, o membro fica oculto das listagens padrão.';

CREATE INDEX IF NOT EXISTS idx_athletes_org_active
  ON athletes (organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_staff_members_org_active
  ON staff_members (organization_id, is_active);
