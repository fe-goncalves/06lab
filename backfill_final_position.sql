-- Backfill team_edition_stats.final_position from collective team edition_awards
UPDATE team_edition_stats tes
SET final_position = CASE ea.award_type
  WHEN 'champion' THEN 1
  WHEN 'runner_up' THEN 2
  WHEN 'third_place' THEN 3
  WHEN 'fourth_place' THEN 4
  WHEN 'fifth_place' THEN 5
  WHEN 'sixth_place' THEN 6
  WHEN 'seventh_place' THEN 7
  WHEN 'eighth_place' THEN 8
  WHEN 'ninth_place' THEN 9
  WHEN 'tenth_place' THEN 10
  WHEN 'eleventh_place' THEN 11
  WHEN 'twelfth_place' THEN 12
  WHEN 'thirteenth_place' THEN 13
  WHEN 'fourteenth_place' THEN 14
  WHEN 'fifteenth_place' THEN 15
  WHEN 'sixteenth_place' THEN 16
  WHEN 'seventeenth_place' THEN 17
  WHEN 'eighteenth_place' THEN 18
  WHEN 'nineteenth_place' THEN 19
  WHEN 'twentieth_place' THEN 20
  WHEN 'relegated' THEN 99
  ELSE NULL
END
FROM edition_awards ea
WHERE ea.winning_team_id = tes.team_id
  AND ea.edition_id = tes.edition_id
  AND ea.award_type IN (
    'champion','runner_up','third_place','fourth_place','fifth_place',
    'sixth_place','seventh_place','eighth_place','ninth_place','tenth_place',
    'eleventh_place','twelfth_place','thirteenth_place','fourteenth_place',
    'fifteenth_place','sixteenth_place','seventeenth_place','eighteenth_place',
    'nineteenth_place','twentieth_place','relegated'
  )
  AND ea.athlete_id IS NULL
  AND ea.staff_member_id IS NULL;
