| table_name                   | constraint_name                                         | constraint_type | column_name       | foreign_table                | foreign_column  |
| ---------------------------- | ------------------------------------------------------- | --------------- | ----------------- | ---------------------------- | --------------- |
| athlete_career_stats         | athlete_career_stats_athlete_id_fkey                    | FOREIGN KEY     | athlete_id        | athletes                     | id              |
| athlete_career_stats         | athlete_career_stats_organization_id_fkey               | FOREIGN KEY     | organization_id   | organizations                | id              |
| athlete_career_stats         | athlete_career_stats_pkey                               | PRIMARY KEY     | id                | athlete_career_stats         | id              |
| athlete_career_stats         | athlete_career_stats_athlete_id_organization_id_key     | UNIQUE          | athlete_id        | athlete_career_stats         | athlete_id      |
| athlete_career_stats         | athlete_career_stats_athlete_id_organization_id_key     | UNIQUE          | athlete_id        | athlete_career_stats         | organization_id |
| athlete_career_stats         | athlete_career_stats_athlete_id_organization_id_key     | UNIQUE          | organization_id   | athlete_career_stats         | athlete_id      |
| athlete_career_stats         | athlete_career_stats_athlete_id_organization_id_key     | UNIQUE          | organization_id   | athlete_career_stats         | organization_id |
| athlete_career_stats         | athlete_career_stats_athlete_id_key                     | UNIQUE          | athlete_id        | athlete_career_stats         | athlete_id      |
| athlete_edition_stats        | athlete_edition_stats_athlete_id_fkey                   | FOREIGN KEY     | athlete_id        | athletes                     | id              |
| athlete_edition_stats        | athlete_edition_stats_edition_id_fkey                   | FOREIGN KEY     | edition_id        | competition_editions         | id              |
| athlete_edition_stats        | athlete_edition_stats_team_id_fkey                      | FOREIGN KEY     | team_id           | teams                        | id              |
| athlete_edition_stats        | athlete_edition_stats_pkey                              | PRIMARY KEY     | id                | athlete_edition_stats        | id              |
| athlete_edition_stats        | athlete_edition_stats_athlete_id_edition_id_team_id_key | UNIQUE          | team_id           | athlete_edition_stats        | edition_id      |
| athlete_edition_stats        | athlete_edition_stats_athlete_id_edition_id_team_id_key | UNIQUE          | athlete_id        | athlete_edition_stats        | team_id         |
| athlete_edition_stats        | athlete_edition_stats_athlete_id_edition_id_team_id_key | UNIQUE          | edition_id        | athlete_edition_stats        | team_id         |
| athlete_edition_stats        | athlete_edition_stats_athlete_id_edition_id_team_id_key | UNIQUE          | team_id           | athlete_edition_stats        | athlete_id      |
| athlete_edition_stats        | athlete_edition_stats_athlete_id_edition_id_team_id_key | UNIQUE          | team_id           | athlete_edition_stats        | team_id         |
| athlete_edition_stats        | athlete_edition_stats_athlete_id_edition_id_team_id_key | UNIQUE          | edition_id        | athlete_edition_stats        | athlete_id      |
| athlete_edition_stats        | athlete_edition_stats_athlete_id_edition_id_team_id_key | UNIQUE          | athlete_id        | athlete_edition_stats        | athlete_id      |
| athlete_edition_stats        | athlete_edition_stats_athlete_id_edition_id_team_id_key | UNIQUE          | edition_id        | athlete_edition_stats        | edition_id      |
| athlete_edition_stats        | athlete_edition_stats_athlete_id_edition_id_team_id_key | UNIQUE          | athlete_id        | athlete_edition_stats        | edition_id      |
| athlete_motm_entries         | athlete_motm_entries_season_id_fkey                     | FOREIGN KEY     | season_id         | seasons                      | id              |
| athlete_motm_entries         | athlete_motm_entries_team_id_fkey                       | FOREIGN KEY     | team_id           | teams                        | id              |
| athlete_motm_entries         | athlete_motm_entries_edition_id_fkey                    | FOREIGN KEY     | edition_id        | competition_editions         | id              |
| athlete_motm_entries         | athlete_motm_entries_year_id_fkey                       | FOREIGN KEY     | year_id           | years                        | id              |
| athlete_motm_entries         | athlete_motm_entries_match_id_fkey                      | FOREIGN KEY     | match_id          | matches                      | id              |
| athlete_motm_entries         | athlete_motm_entries_athlete_id_fkey                    | FOREIGN KEY     | athlete_id        | athletes                     | id              |
| athlete_motm_entries         | athlete_motm_entries_pkey                               | PRIMARY KEY     | id                | athlete_motm_entries         | id              |
| athlete_motm_entries         | athlete_motm_entries_match_id_key                       | UNIQUE          | match_id          | athlete_motm_entries         | match_id        |
| athlete_team_stints          | athlete_team_stints_team_id_fkey                        | FOREIGN KEY     | team_id           | teams                        | id              |
| athlete_team_stints          | athlete_team_stints_athlete_id_fkey                     | FOREIGN KEY     | athlete_id        | athletes                     | id              |
| athlete_team_stints          | athlete_team_stints_pkey                                | PRIMARY KEY     | id                | athlete_team_stints          | id              |
| athletes                     | athletes_position_id_fkey                               | FOREIGN KEY     | position_id       | player_positions             | id              |
| athletes                     | athletes_organization_id_fkey                           | FOREIGN KEY     | organization_id   | organizations                | id              |
| athletes                     | athletes_pkey                                           | PRIMARY KEY     | id                | athletes                     | id              |
| athletes                     | athletes_cpf_organization_unique                        | UNIQUE          | cpf               | athletes                     | organization_id |
| athletes                     | athletes_rg_organization_unique                         | UNIQUE          | organization_id   | athletes                     | rg              |
| athletes                     | athletes_organization_id_rg_key                         | UNIQUE          | rg                | athletes                     | rg              |
| athletes                     | athletes_rg_organization_unique                         | UNIQUE          | rg                | athletes                     | rg              |
| athletes                     | athletes_cpf_organization_unique                        | UNIQUE          | organization_id   | athletes                     | cpf             |
| athletes                     | athletes_organization_id_rg_key                         | UNIQUE          | rg                | athletes                     | organization_id |
| athletes                     | athletes_cpf_organization_unique                        | UNIQUE          | cpf               | athletes                     | cpf             |
| athletes                     | athletes_cpf_organization_unique                        | UNIQUE          | organization_id   | athletes                     | organization_id |
| athletes                     | athletes_organization_id_rg_key                         | UNIQUE          | organization_id   | athletes                     | rg              |
| athletes                     | athletes_rg_organization_unique                         | UNIQUE          | rg                | athletes                     | organization_id |
| athletes                     | athletes_rg_organization_unique                         | UNIQUE          | organization_id   | athletes                     | organization_id |
| athletes                     | athletes_organization_id_rg_key                         | UNIQUE          | organization_id   | athletes                     | organization_id |
| audit_logs                   | audit_logs_organization_id_fkey                         | FOREIGN KEY     | organization_id   | organizations                | id              |
| audit_logs                   | audit_logs_pkey                                         | PRIMARY KEY     | id                | audit_logs                   | id              |
| categories                   | categories_organization_id_fkey                         | FOREIGN KEY     | organization_id   | organizations                | id              |
| categories                   | categories_pkey                                         | PRIMARY KEY     | id                | categories                   | id              |
| competition_editions         | competition_editions_competition_id_fkey                | FOREIGN KEY     | competition_id    | competitions                 | id              |
| competition_editions         | competition_editions_season_id_fkey                     | FOREIGN KEY     | season_id         | seasons                      | id              |
| competition_editions         | fk_current_phase                                        | FOREIGN KEY     | current_phase_id  | phases                       | id              |
| competition_editions         | competition_editions_pkey                               | PRIMARY KEY     | id                | competition_editions         | id              |
| competition_editions         | competition_editions_competition_id_season_id_key       | UNIQUE          | season_id         | competition_editions         | season_id       |
| competition_editions         | competition_editions_competition_id_season_id_key       | UNIQUE          | season_id         | competition_editions         | competition_id  |
| competition_editions         | competition_editions_competition_id_season_id_key       | UNIQUE          | competition_id    | competition_editions         | season_id       |
| competition_editions         | competition_editions_competition_id_season_id_key       | UNIQUE          | competition_id    | competition_editions         | competition_id  |
| competitions                 | competitions_division_below_id_fkey                     | FOREIGN KEY     | division_below_id | competitions                 | id              |
| competitions                 | competitions_division_above_id_fkey                     | FOREIGN KEY     | division_above_id | competitions                 | id              |
| competitions                 | competitions_sport_slug_fkey                            | FOREIGN KEY     | sport_slug        | sports                       | slug            |
| competitions                 | competitions_organization_id_fkey                       | FOREIGN KEY     | organization_id   | organizations                | id              |
| competitions                 | competitions_category_id_fkey                           | FOREIGN KEY     | category_id       | categories                   | id              |
| competitions                 | competitions_pkey                                       | PRIMARY KEY     | id                | competitions                 | id              |
| conference_teams             | conference_teams_edition_team_id_fkey                   | FOREIGN KEY     | edition_team_id   | edition_teams                | id              |
| conference_teams             | conference_teams_conference_id_fkey                     | FOREIGN KEY     | conference_id     | conferences                  | id              |
| conference_teams             | conference_teams_pkey                                   | PRIMARY KEY     | id                | conference_teams             | id              |
| conference_teams             | conference_teams_conference_id_edition_team_id_key      | UNIQUE          | conference_id     | conference_teams             | conference_id   |
| conference_teams             | conference_teams_conference_id_edition_team_id_key      | UNIQUE          | conference_id     | conference_teams             | edition_team_id |
| conference_teams             | conference_teams_conference_id_edition_team_id_key      | UNIQUE          | edition_team_id   | conference_teams             | conference_id   |
| conference_teams             | conference_teams_conference_id_edition_team_id_key      | UNIQUE          | edition_team_id   | conference_teams             | edition_team_id |
| conferences                  | conferences_phase_id_fkey                               | FOREIGN KEY     | phase_id          | phases                       | id              |
| conferences                  | conferences_pkey                                        | PRIMARY KEY     | id                | conferences                  | id              |
| dashboard_cache              | dashboard_cache_organization_id_fkey                    | FOREIGN KEY     | organization_id   | organizations                | id              |
| dashboard_cache              | dashboard_cache_pkey                                    | PRIMARY KEY     | id                | dashboard_cache              | id              |
| dashboard_cache              | dashboard_cache_organization_id_key                     | UNIQUE          | organization_id   | dashboard_cache              | organization_id |
| edition_awards               | edition_awards_athlete_team_id_fkey                     | FOREIGN KEY     | athlete_team_id   | teams                        | id              |
| edition_awards               | edition_awards_organization_id_fkey                     | FOREIGN KEY     | organization_id   | organizations                | id              |
| edition_awards               | edition_awards_edition_id_fkey                          | FOREIGN KEY     | edition_id        | competition_editions         | id              |
| edition_awards               | edition_awards_assigned_by_fkey                         | FOREIGN KEY     | assigned_by       | user_profiles                | id              |
| edition_awards               | edition_awards_staff_member_id_fkey                     | FOREIGN KEY     | staff_member_id   | staff_members                | id              |
| edition_awards               | edition_awards_winning_team_id_fkey                     | FOREIGN KEY     | winning_team_id   | teams                        | id              |
| edition_awards               | edition_awards_season_id_fkey                           | FOREIGN KEY     | season_id         | seasons                      | id              |
| edition_awards               | edition_awards_year_id_fkey                             | FOREIGN KEY     | year_id           | years                        | id              |
| edition_awards               | edition_awards_athlete_id_fkey                          | FOREIGN KEY     | athlete_id        | athletes                     | id              |
| edition_awards               | edition_awards_pkey                                     | PRIMARY KEY     | id                | edition_awards               | id              |
| edition_ranking_config       | edition_ranking_config_category_code_fkey               | FOREIGN KEY     | category_code     | ranking_categories           | code            |
| edition_ranking_config       | edition_ranking_config_edition_id_fkey                  | FOREIGN KEY     | edition_id        | competition_editions         | id              |
| edition_ranking_config       | edition_ranking_config_pkey                             | PRIMARY KEY     | id                | edition_ranking_config       | id              |
| edition_ranking_config       | edition_ranking_config_edition_id_category_code_key     | UNIQUE          | category_code     | edition_ranking_config       | edition_id      |
| edition_ranking_config       | edition_ranking_config_edition_id_category_code_key     | UNIQUE          | category_code     | edition_ranking_config       | category_code   |
| edition_ranking_config       | edition_ranking_config_edition_id_category_code_key     | UNIQUE          | edition_id        | edition_ranking_config       | edition_id      |
| edition_ranking_config       | edition_ranking_config_edition_id_category_code_key     | UNIQUE          | edition_id        | edition_ranking_config       | category_code   |
| edition_registration_windows | edition_registration_windows_created_by_fkey            | FOREIGN KEY     | created_by        | user_profiles                | id              |
| edition_registration_windows | edition_registration_windows_edition_id_fkey            | FOREIGN KEY     | edition_id        | competition_editions         | id              |
| edition_registration_windows | edition_registration_windows_pkey                       | PRIMARY KEY     | id                | edition_registration_windows | id              |
| edition_roster_entries       | edition_roster_entries_reviewed_by_fkey                 | FOREIGN KEY     | reviewed_by       | user_profiles                | id              |
| edition_roster_entries       | edition_roster_entries_edition_team_id_fkey             | FOREIGN KEY     | edition_team_id   | edition_teams                | id              |
| edition_roster_entries       | edition_roster_entries_athlete_id_fkey                  | FOREIGN KEY     | athlete_id        | athletes                     | id              |