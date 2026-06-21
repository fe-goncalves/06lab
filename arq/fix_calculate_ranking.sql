-- Corrige calculate_ranking: referência ambígua a team_id no GROUP BY/SELECT.
-- Execute no SQL Editor do Supabase quando puder aplicar a correção definitiva no banco.
--
-- Sintoma: RPC retorna erro 42702 "column reference team_id is ambiguous"
-- e a página /rankings fica vazia mesmo com edition_ranking_config preenchido.

CREATE OR REPLACE FUNCTION public.calculate_ranking(
  p_organization_id uuid,
  p_gender text,
  p_sport_slug text
)
RETURNS TABLE (
  team_id uuid,
  team_name text,
  logo_url text,
  total_points integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edition_id uuid;
  v_season_id uuid;
  v_year_id uuid;
  v_team_id uuid;
  v_config record;
  v_class_wins integer;
  v_class_draws integer;
  v_class_losses integer;
  v_knock_wins integer;
  v_knock_draws integer;
  v_knock_losses integer;
  v_knock_played integer;
  v_final_position integer;
  v_category_code text;
  v_points integer;
BEGIN
  DELETE FROM public.ranking_point_entries rpe
  WHERE rpe.organization_id = p_organization_id
    AND rpe.edition_id IN (
      SELECT ce.id
      FROM public.competition_editions ce
      JOIN public.competitions c ON c.id = ce.competition_id
      WHERE c.organization_id = p_organization_id
        AND c.gender = p_gender
        AND c.sport_slug = p_sport_slug
    );

  FOR v_edition_id, v_season_id, v_year_id IN
    SELECT ce.id, ce.season_id, s.year_id
    FROM public.competition_editions ce
    JOIN public.competitions c ON c.id = ce.competition_id
    JOIN public.seasons s ON s.id = ce.season_id
    WHERE c.organization_id = p_organization_id
      AND c.gender = p_gender
      AND c.sport_slug = p_sport_slug
  LOOP
    FOR v_team_id IN
      SELECT et.team_id
      FROM public.edition_teams et
      JOIN public.teams t ON t.id = et.team_id
      WHERE et.edition_id = v_edition_id
        AND COALESCE(et.is_active, true) = true
        AND COALESCE(et.is_free_agent_pool, false) = false
        AND COALESCE(t.is_virtual, false) = false
        AND lower(COALESCE(t.gender, '')) IN (
          CASE WHEN p_gender = 'male' THEN ARRAY['male', 'm', 'masculino'] ELSE ARRAY['female', 'f', 'feminino'] END
        )
    LOOP
      SELECT
        COALESCE(SUM(CASE WHEN p.phase_type IN ('round_robin', 'group_stage') AND m.team_a_id = v_team_id AND m.score_a > m.score_b THEN 1 WHEN p.phase_type IN ('round_robin', 'group_stage') AND m.team_b_id = v_team_id AND m.score_b > m.score_a THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN p.phase_type IN ('round_robin', 'group_stage') AND m.team_a_id = v_team_id AND m.score_a = m.score_b THEN 1 WHEN p.phase_type IN ('round_robin', 'group_stage') AND m.team_b_id = v_team_id AND m.score_b = m.score_a THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN p.phase_type IN ('round_robin', 'group_stage') AND m.team_a_id = v_team_id AND m.score_a < m.score_b THEN 1 WHEN p.phase_type IN ('round_robin', 'group_stage') AND m.team_b_id = v_team_id AND m.score_b < m.score_a THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN p.phase_type IN ('knockout', 'conference') AND m.team_a_id = v_team_id AND m.score_a > m.score_b THEN 1 WHEN p.phase_type IN ('knockout', 'conference') AND m.team_b_id = v_team_id AND m.score_b > m.score_a THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN p.phase_type IN ('knockout', 'conference') AND m.team_a_id = v_team_id AND m.score_a = m.score_b THEN 1 WHEN p.phase_type IN ('knockout', 'conference') AND m.team_b_id = v_team_id AND m.score_b = m.score_a THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN p.phase_type IN ('knockout', 'conference') AND m.team_a_id = v_team_id AND m.score_a < m.score_b THEN 1 WHEN p.phase_type IN ('knockout', 'conference') AND m.team_b_id = v_team_id AND m.score_b < m.score_a THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN p.phase_type IN ('knockout', 'conference') AND (m.team_a_id = v_team_id OR m.team_b_id = v_team_id) THEN 1 ELSE 0 END), 0)
      INTO v_class_wins, v_class_draws, v_class_losses, v_knock_wins, v_knock_draws, v_knock_losses, v_knock_played
      FROM public.matches m
      JOIN public.phases p ON p.id = m.phase_id
      WHERE p.edition_id = v_edition_id
        AND m.status = 'finished';

      SELECT tes.final_position
      INTO v_final_position
      FROM public.team_edition_stats tes
      WHERE tes.edition_id = v_edition_id
        AND tes.team_id = v_team_id;

      FOR v_config IN
        SELECT erc.category_code, erc.points_value
        FROM public.edition_ranking_config erc
        WHERE erc.edition_id = v_edition_id
      LOOP
        v_points := 0;
        CASE v_config.category_code
          WHEN 'participation' THEN v_points := v_config.points_value;
          WHEN 'win_in_classification' THEN v_points := v_config.points_value * v_class_wins;
          WHEN 'draw_in_classification' THEN v_points := v_config.points_value * v_class_draws;
          WHEN 'loss_in_classification' THEN v_points := v_config.points_value * v_class_losses;
          WHEN 'participation_knockout' THEN
            IF v_knock_played > 0 THEN v_points := v_config.points_value; END IF;
          WHEN 'advance_knockout' THEN
            IF v_knock_wins > 0 THEN v_points := v_config.points_value; END IF;
          WHEN 'win_in_knockout' THEN v_points := v_config.points_value * v_knock_wins;
          WHEN 'draw_in_knockout' THEN v_points := v_config.points_value * v_knock_draws;
          WHEN 'loss_in_knockout' THEN v_points := v_config.points_value * v_knock_losses;
          WHEN 'first_place' THEN
            IF v_final_position = 1 THEN v_points := v_config.points_value; END IF;
          WHEN 'second_place' THEN
            IF v_final_position = 2 THEN v_points := v_config.points_value; END IF;
          WHEN 'third_place' THEN
            IF v_final_position = 3 THEN v_points := v_config.points_value; END IF;
          WHEN 'fourth_place' THEN
            IF v_final_position = 4 THEN v_points := v_config.points_value; END IF;
          WHEN 'fifth_to_eighth' THEN
            IF v_final_position BETWEEN 5 AND 8 THEN v_points := v_config.points_value; END IF;
          WHEN 'ninth_plus' THEN
            IF v_final_position >= 9 THEN v_points := v_config.points_value; END IF;
          ELSE v_points := 0;
        END CASE;

        IF v_points > 0 THEN
          INSERT INTO public.ranking_point_entries (
            organization_id, team_id, edition_id, season_id, year_id, category_code, points_earned
          ) VALUES (
            p_organization_id, v_team_id, v_edition_id, v_season_id, v_year_id, v_config.category_code, v_points
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  DELETE FROM public.team_ranking_cache trc
  WHERE trc.organization_id = p_organization_id;

  INSERT INTO public.team_ranking_cache (
    organization_id, team_id, total_points, manual_adjustment_total, final_points, position, last_calculated_at
  )
  SELECT
    p_organization_id,
    agg.team_id,
    agg.total_points,
    COALESCE(man.manual_adjustment_total, 0),
    agg.total_points + COALESCE(man.manual_adjustment_total, 0),
    ROW_NUMBER() OVER (ORDER BY agg.total_points + COALESCE(man.manual_adjustment_total, 0) DESC),
    now()
  FROM (
    SELECT rpe.team_id, SUM(rpe.points_earned)::integer AS total_points
    FROM public.ranking_point_entries rpe
    WHERE rpe.organization_id = p_organization_id
    GROUP BY rpe.team_id
  ) agg
  LEFT JOIN (
    SELECT rma.team_id, SUM(rma.points_delta)::integer AS manual_adjustment_total
    FROM public.ranking_manual_adjustments rma
    WHERE rma.organization_id = p_organization_id
    GROUP BY rma.team_id
  ) man ON man.team_id = agg.team_id;

  RETURN QUERY
  SELECT
    trc.team_id,
    t.full_name AS team_name,
    t.logo_url,
    trc.final_points AS total_points
  FROM public.team_ranking_cache trc
  JOIN public.teams t ON t.id = trc.team_id
  WHERE trc.organization_id = p_organization_id
    AND trc.final_points > 0
    AND COALESCE(t.is_virtual, false) = false
    AND lower(COALESCE(t.gender, '')) IN (
      CASE WHEN p_gender = 'male' THEN ARRAY['male', 'm', 'masculino'] ELSE ARRAY['female', 'f', 'feminino'] END
    )
  ORDER BY trc.final_points DESC, t.full_name ASC;
END;
$$;
