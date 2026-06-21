-- Foto de perfil do representante (bucket photo, path representatives/…)
ALTER TABLE representatives
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMENT ON COLUMN representatives.photo_url IS 'URL pública da foto no storage (bucket photo)';
