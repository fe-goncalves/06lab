-- Gênero do árbitro (male | female | other)
ALTER TABLE referees ADD COLUMN IF NOT EXISTS gender text;
