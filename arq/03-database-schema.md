# 03 — Database Schema

## Visão Geral
68 tabelas, 1 view, 24 indexes. PostgreSQL via Supabase.

## Tabelas Principais e Relacionamentos

### Organização e Acesso
```
organizations
  id, name, slug, status, logo_url, primary_color

user_profiles
  id, auth_user_id, organization_id, role (main|supporter), full_name

organizations → user_profiles (1:N)
```

### Competições
```
competitions
  id, organization_id, full_name, logo_url, sport_type

competition_editions  (alias: editions)
  id, competition_id, season_id, status, is_public

edition_settings
  id, edition_id, is_public, max_athletes, yellow_card_suspension_threshold

seasons
  id, organization_id, name, year_value

competitions → competition_editions (1:N)
competition_editions → edition_settings (1:1)
```

### Fases e Rodadas
```
phases
  id, edition_id, full_name, custom_label, phase_type (round_robin|group_stage|knockout|conference)
  display_order, is_current, legs, aggregate_score

rounds
  id, phase_id, name, custom_label, display_order, is_current
  legs (boolean), aggregate_score (boolean)

groups
  id, phase_id, name, custom_label, display_order

conferences
  id, phase_id, name, display_order

phases → rounds (1:N)
phases → groups (1:N)
phases → conferences (1:N)
```

### Times e Atletas
```
teams
  id, organization_id, full_name, abbreviation, logo_url, primary_color

athletes
  id, organization_id, full_name, surname, photo_url, position_id, birth_date

edition_teams
  id, edition_id, team_id, arrival_origin, display_order
  is_free_agent_pool (boolean) ← CRÍTICO: identifica "Sem Clube"

athlete_team_stints
  id, athlete_id, team_id, is_current, start_date, end_date

edition_roster_entries
  id, edition_team_id, athlete_id, staff_member_id, member_type (athlete|staff)
  status (pending|approved), position_id

phase_teams
  id, phase_id, edition_team_id

group_teams
  id, group_id, edition_team_id

conference_teams
  id, conference_id, edition_team_id
```

### Matchups e Partidas
```
matchups
  id, phase_id, conference_id (nullable)
  round_label (string — label estável da rodada)
  round_id (nullable — FK para rounds, pode ser null em dados legados)
  team_a_id (nullable), team_b_id (nullable)
  pending_team_a_from_matchup_id (FK self — para brackets avançados)
  pending_team_b_from_matchup_id (FK self)
  pending_team_a_result, pending_team_b_result
  display_order, is_completed

  ⚠️ NÃO tem FK declarada para teams (team_a_id, team_b_id)
  ⚠️ Joins via sintaxe Supabase !fkey falham — usar lookup manual

matches
  id, phase_id, round_id (nullable), matchup_id (nullable)
  team_a_id, team_b_id, team_a_is_home
  match_date, match_time, venue_id
  status (scheduled|ongoing|finished|postponed)
  score_a, score_b, finish_type
  is_second_leg (boolean)
  result_only_mode, motm_athlete_id
  highlights_url, photos_url

match_actions
  id, match_id, team_id, action_type (goal|yellow_card|red_card|...)
  period, minute, primary_athlete_id, secondary_athlete_id
  goalkeeper_id, goal_type, is_own_goal, miss_result

match_lineups
  id, match_id, athlete_id, edition_team_id
  is_present, played_as_goalkeeper, is_captain

match_referees
  id, match_id, referee_id, referee_role_id

match_reports
  id, match_id, submitted_by, submitter_type, status (pending|approved)
  reviewed_by, submitted_at, reviewed_at

match_penalty_shootout
  id, match_id, team_id, result (scored|missed)
```

### Estatísticas
```
team_edition_stats
  edition_id, team_id, matches_played, wins, draws, losses
  goals_scored, goals_conceded, points

athlete_edition_stats
  edition_id, athlete_id, team_id, goals, assists
  yellow_cards, red_cards, matches_played

team_career_stats
  team_id, totals agregados de carreira
```

### Premiações
```
edition_awards
  id, edition_id, award_type, athlete_id (nullable), winning_team_id (nullable)
  award_types: top_scorer|top_assists|mvp|best_goalkeeper|revelation|
               best_defense|best_performance|champion|runner_up|third_place

selection_squads
  id, edition_id, round_id, squad_type (totw|motw)

selection_squad_members
  id, squad_id, athlete_id (nullable), staff_member_id (nullable)
  team_id, display_order (1-7 = jogadores, 8 = técnico)
```

### Outros
```
venues
  id, organization_id, full_name, address

referees
  id, organization_id, full_name, photo_url

referee_roles
  id, organization_id, full_name

staff_members
  id, organization_id, full_name, surname, photo_url, staff_role_id

staff_roles
  id, organization_id, full_name

suspensions
  id, organization_id, athlete_id, edition_id, matches_suspended, matches_served

notifications
  id, organization_id, type, title, body, is_read, related_entity_id
```

## Políticas RLS Relevantes

### matchups
```sql
-- SELECT: aberto para fases da organização
matchups_select: phase_id IN (SELECT phases.id FROM phases)

-- WRITE: requer is_admin()
matchups_write: (phase_id IN (SELECT phases.id FROM phases)) AND is_admin()
```

### Padrão geral
- SELECT: filtro por organization_id via joins
- INSERT/UPDATE/DELETE: requer `is_admin()` customizado

## FKs Ausentes (Debt Técnico)
```sql
-- Pendente de execução:
ALTER TABLE matchups
  ADD CONSTRAINT matchups_team_a_id_fkey
    FOREIGN KEY (team_a_id) REFERENCES teams(id) ON DELETE SET NULL,
  ADD CONSTRAINT matchups_team_b_id_fkey
    FOREIGN KEY (team_b_id) REFERENCES teams(id) ON DELETE SET NULL;
```