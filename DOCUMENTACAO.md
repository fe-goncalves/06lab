# 06.lab — Documentação Técnica
> Fonte Única de Verdade (Single Source of Truth)
> Última atualização: Abril 2026

---

## 1. Visão Geral do Produto

### O que é
O **06** é uma plataforma SaaS de gestão de competições esportivas dividida em dois produtos complementares:

- **06.lab** — Painel administrativo privado. Usado pelos organizadores para gerenciar competições, equipes, atletas, partidas, relatórios e toda a estrutura operacional.
- **06.score** — Site público por organização. Exibe para o público os dados aprovados: tabelas, resultados, estatísticas, perfis de atletas, equipes e árbitros.

### Problema que resolve
Organizadores de competições amadoras (piloto: Futebol 7) não têm ferramentas acessíveis e completas para gerenciar campeonatos com dados estruturados, aprovação de relatórios, controle de elenco e publicação pública de resultados.

### Fluxo principal
1. Organização contrata licença → recebe acesso ao 06.lab
2. Admin configura competições, temporadas, equipes, fases e rodadas
3. Representantes das equipes inscrevem atletas (sujeito à aprovação e janela de inscrição)
4. Relator registra o relatório de partida (lineup, ações, placar)
5. Admin/Supporter aprova o relatório
6. Dados aprovados aparecem automaticamente no 06.score público

### Piloto atual
- **Organização:** Orange (Futebol 7)
- **Domínio:** domínio próprio via `custom_domain` no Supabase + Cloudflare Pages
- **Usuário main criado:** `orangecopa@gmail.com`

---

## 2. Tech Stack

| Camada | Tecnologia | Versão / Detalhe |
|---|---|---|
| Frontend | Next.js | 16.2.2 (App Router, Turbopack) |
| Linguagem | TypeScript | Strict |
| Estilização | Tailwind CSS | v4 (config via globals.css, sem tailwind.config.ts) |
| Banco de dados | Supabase (PostgreSQL) | Projeto: `zrkifsugemrchpppqydb` |
| Autenticação | Supabase Auth | Email/Password, Provider Email ativo |
| Storage | Supabase Storage | Buckets: `logo` (logos) e `photos` (fotos) |
| ORM/Client | @supabase/ssr + @supabase/supabase-js | SSR com cookies |
| Deploy frontend | Cloudflare Pages | — |
| Versionamento | GitHub | Repositório: `fe-goncalves/06lab` |
| Extração de cores | colorthief | Via `getPalette(img, 3)` síncrono |
| Gerenciamento de tarefas | Linear | Projetos e Issues |
| Monitoramento de erros | Sentry (planejado) | Ainda não configurado |

### Fontes (Google Fonts)
- **Inter** → `--font-inter` → fonte base (`--font-sans`)
- **Space Mono** → `--font-space-mono` → fonte mono (`--font-mono`)
- **Fjalla One** → `--font-fjalla` → fonte display (`--font-display`)

> Futuras substituições planejadas: Config Mono Var (comercial) e Sharp Grotesk (comercial)

---

## 3. Arquitetura e Regras de Negócio

### 3.1 Estrutura de pastas (Next.js)

```
src/
├── app/
│   ├── (lab)/                  # Grupo de rotas protegidas (painel admin)
│   │   ├── layout.tsx          # Layout com sidebar, busca sessão, redireciona se não autenticado
│   │   ├── page.tsx            # Dashboard (visão geral) — em construção
│   │   ├── equipes/
│   │   │   ├── page.tsx        # Lista de equipes (Server Component)
│   │   │   ├── equipes-client.tsx  # Botão "Nova equipe" + controle do modal (Client)
│   │   │   ├── nova-equipe-modal.tsx  # Modal de criação (Client, usa colorthief)
│   │   │   ├── actions.ts      # Server Actions de equipes (criarEquipe)
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Página individual da equipe
│   ├── login/
│   │   └── page.tsx            # Tela de login (Client Component)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts        # Handler de callback OAuth
│   └── layout.tsx              # Root layout (fontes, metadata, body dark)
│   └── globals.css             # Tokens de design via @theme
├── lib/
│   ├── supabase.ts             # Browser client (createBrowserClient)
│   └── supabase-server.ts      # Server client (createServerClient com cookies)
middleware.ts                   # Proteção de rotas + refresh de sessão
public/
└── brand/
    └── logo.svg                # Logo do 06.lab (ícone verde)
```

### 3.2 Multi-tenancy

Cada organização é isolada por `organization_id` em todas as tabelas. O RLS (Row Level Security) do Supabase garante que nenhuma organização acessa dados de outra.

**Funções auxiliares de RLS (schema public):**
- `get_user_organization_id()` → retorna o `organization_id` do usuário autenticado
- `get_user_role()` → retorna o `role` do usuário autenticado
- `is_admin()` → retorna `true` se role é `main` ou `supporter`
- `is_representative()` → retorna `true` se é um representante ativo
- `get_representative_organization_id()` → retorna o `organization_id` do representante

**Status do RLS:** Habilitado em todas as 68 tabelas. Políticas configuradas por perfil.

**ATENÇÃO:** Operações de escrita (INSERT, UPDATE) devem sempre ser feitas via **Server Actions** (`"use server"`), nunca pelo client-side Supabase diretamente. O client-side não passa a sessão corretamente para o RLS avaliar `is_admin()`.

### 3.3 Perfis de usuário

| Perfil | Descrição | Restrições |
|---|---|---|
| `main` | Admin principal | Acesso total. Único por organização. Pode criar supporters. |
| `supporter` | Admin secundário | Acesso total exceto criar outros supporters. |
| `relator` | Operador de partidas | Acesso apenas a edições concedidas. Edições ficam `pending` até aprovação. |
| `representative` | Representante de equipe | Entidade separada de `user_profiles`. Acesso apenas ao elenco das equipes vinculadas, dentro da janela de inscrição ativa. |

### 3.4 Fluxo de aprovação (draft/published)

Qualquer dado submetido por `relator` ou `representative` fica com `status = 'pending'` até um `main` ou `supporter` aprovar. O 06.score sempre exibe apenas dados `approved`. Uma edição pendente não sobrescreve o dado público anterior.

**Tabela `pending_approvals`** é uma **VIEW** (não tabela), que agrega `match_reports` e `edition_roster_entries` com status `pending`.

### 3.5 Hierarquia de entidades de competição

```
Organization
└── Competition (tem sport_slug, gender)
    └── CompetitionEdition (competition + season)
        ├── EditionSettings (config de inscrição, limites, idade, amarelos)
        ├── EditionRegistrationWindows (janelas de inscrição, múltiplas)
        ├── EditionRankingConfig (valores do ranking por categoria)
        ├── EditionTeams (lista mestre de equipes)
        │   └── EditionRosterEntries (atletas e staff inscritos, com status)
        └── Phases (ordered, typed)
            ├── [round_robin/group_stage] → Rounds → Matches
            ├── [knockout/conference] → Matchups → Matches
            └── Groups / Conferences → GroupTeams / ConferenceTeams
```

### 3.6 Tipos de fase (phase_type)

| Código | Comportamento |
|---|---|
| `round_robin` | Pontos corridos. Tabela de classificação. Critérios de desempate. |
| `group_stage` | Igual ao round_robin, mas dividido em grupos. |
| `knockout` | Mata-mata. Confrontos (matchups). Pode ter ida e volta, agregado, terceiro lugar. |
| `conference` | Mata-mata dividido em conferências (modelo NBA/NFL). Brackets paralelos. |

### 3.7 Relatório de partida

- Cada submissão cria um registro em `match_reports` com `status = pending`
- `snapshot` (jsonb) guarda cópia imutável do estado no momento da submissão
- A fonte de verdade são as tabelas estruturadas: `match_lineups`, `match_actions`, `match_penalty_shootout`
- Quando admin salva diretamente (sem relator), o status já vai como `approved`
- Edição de relatório pelo admin: pode editar antes de aprovar sem resubmeter tudo

### 3.8 Ações de partida (match_actions)

Tipos: `goal`, `yellow_card`, `red_yellow_card`, `red_card`, `penalty_missed`, `shootout_missed`, `foul`, `fifth_foul`

**Regras de preenchimento:**
- `minute`: obrigatório para todos exceto `foul` e `fifth_foul`
- `period`: obrigatório para todos (`first` ou `second`)
- `goal_type`: obrigatório quando `action_type = goal` (valores: `normal`, `penalty`, `own_goal`)
- `miss_result`: obrigatório quando `action_type in (penalty_missed, shootout_missed)`
- Faltas não têm minuto — só período e atleta
- Quinta falta: evento da equipe (sem atleta específico), sem automação

**Cartões:**
- `yellow_card` → +1 amarelo nas stats
- `red_yellow_card` → +1 amarelo +1 vermelho nas stats (segundo amarelo = expulsão)
- `red_card` → +1 vermelho direto nas stats
- Sem derivação automática — admin escolhe o tipo explicitamente

### 3.9 Suspensões

- Entidade separada, criada manualmente pelo admin após evento
- Campos: `athlete_id`, `origin_match_id`, `origin_action_id`, `scope_type` (global/edition), `starts_at`, `games_total`, `games_remaining`
- Dedução automática: quando relatório aprovado, se atleta NÃO está em `match_lineups.is_present = true` e a partida é posterior a `starts_at`, deduz 1 de `games_remaining`
- `games_remaining` nunca vai abaixo de 0 (constraint + validação)
- Quando zera: sistema gera notificação, admin desativa manualmente

### 3.10 Cache de estatísticas

- `athlete_edition_stats` — stats por atleta por edição (atualizado a cada relatório aprovado)
- `team_edition_stats` — stats por equipe por edição
- `athlete_career_stats` — histórico acumulado total do atleta
- `team_career_stats` — histórico acumulado total da equipe
- `team_ranking_cache` — cache do ranking geral (atualizado via botão de recálculo)
- `referee_cache`, `staff_cache`, `venue_cache` — caches de entidades secundárias

### 3.11 Ranking geral

- Acumula pontos por equipe ao longo de todas as edições e temporadas
- Categorias fixas configuradas em `ranking_categories` (15 categorias)
- Valores configuráveis por edição em `edition_ranking_config`
- Cada evento de pontuação gera uma linha em `ranking_point_entries` com `season_id`, `year_id`, `edition_id`, `category_code`, `points_earned`
- Ajustes manuais (deduções/bônus) em `ranking_manual_adjustments`
- Site público permite filtrar por ano, temporada e competição

---

## 4. Padrões de UI/UX

### 4.1 Identidade visual

- **Modo:** Dark mode como padrão
- **Estilo:** Minimalista, esportivo, dados em destaque
- **Referência:** Sofascore (esportivo, com dados em destaque)
- **Conceito:** Neon em dark, baixo contraste (grey), uso intenso de logos e cores das equipes
- **Futuro:** Degradês personalizados com as cores das equipes nas áreas delas

### 4.2 Paleta de cores (CSS Variables em globals.css)

```css
--color-background: #0D0D0D    /* fundo principal */
--color-surface: #141414        /* cards, sidebar, modais */
--color-border: #1F1F1F         /* bordas */
--color-text-primary: #F2F2F2   /* texto principal */
--color-text-secondary: #A6A6A6 /* texto secundário, labels */
--color-text-accent: #FBFFED    /* texto de destaque claro */
--color-brand: #BFF205          /* verde neon principal */
--color-brand-alt: #D7F205      /* verde neon alternativo */
--color-danger: #FF4444         /* erros */
--color-warning: #F2A705        /* avisos */
--color-success: #BFF205        /* sucesso */
--gradient-brand: linear-gradient(135deg, #BFF205 0%, #D7F205 100%)
--gradient-subtle: linear-gradient(180deg, #141414 0%, #0D0D0D 100%)
--gradient-glow: radial-gradient(ellipse at top, rgba(191, 242, 5, 0.08) 0%, transparent 70%)
```

### 4.3 Tipografia

```css
--font-sans: var(--font-inter)          /* Inter — corpo, UI geral */
--font-mono: var(--font-space-mono)     /* Space Mono — dados, códigos, roles */
--font-display: var(--font-fjalla)      /* Fjalla One — títulos, headings */
```

### 4.4 Regras de componentes

- **Cards:** `rounded-xl border`, background `--color-surface`, border `--color-border`
- **Inputs:** border focus muda para `--color-brand`, background `--color-background`
- **Botão primário:** background `--color-brand`, color `--color-background` (preto)
- **Botão de fechar/secundário:** border `--color-border`, color `--color-text-secondary`
- **Scrollbar:** customizada — 6px, thumb `#2A2A2A`, hover `#3A3A3A`
- **Sidebar:** `w-60`, background `--color-surface`, border-r `--color-border`
- **Modais:** overlay `rgba(0,0,0,0.55)`, card `max-w-lg rounded-xl`

### 4.5 Fluxo de formulários

- Formulário de criação → **Modal sobre a lista**
- Após criar → redireciona para a página individual da entidade
- Dados complementares → editados na página individual
- Upload de logo → bucket `logo` no Supabase Storage
- Extração de cores → `colorthief.getPalette(img, 3)` síncrono no browser
- SVG não suporta extração de cores (hexColors = [] para SVGs)

### 4.6 Arquitetura de componentes

- **Server Components** — busca de dados, proteção de rota, render estático
- **Client Components** — interatividade, formulários, modais, estado local
- **Server Actions** (`"use server"`) — TODA operação de escrita no banco. NUNCA usar client Supabase para INSERT/UPDATE/DELETE (RLS não avalia corretamente a sessão pelo client-side)
- **`pending_approvals`** — VIEW, não tabela

---

## 5. Configurações de Infraestrutura

### Supabase
- **Project ID:** `zrkifsugemrchpppqydb`
- **Project URL:** `https://zrkifsugemrchpppqydb.supabase.co`
- **Region:** South America (São Paulo)
- **Auth URL Configuration:**
  - Site URL: `http://localhost:3000`
  - Redirect URLs: `http://localhost:3000/auth/callback`

### Storage
- **Bucket `logo`** — logos de equipes, competições, locais. Max 2MB. MIME: png, webp, svg
- **Bucket `photos`** — fotos de atletas, comissão, árbitros. Max 5MB. MIME: jpeg, png, webp

### GitHub
- **Repositório:** `fe-goncalves/06lab`
- **Branch principal:** `main`

### Ambiente local
- **OS:** Windows
- **Servidor Apache:** Apache2Triad rodando em `C:\apache2triad\` — NUNCA TOCAR
- **Porta do Next.js:** 3000 (não conflita com Apache)
- **OPENSSL fix:** sempre rodar `$env:OPENSSL_CONF=""` antes de comandos npm no terminal
- **Pasta do projeto:** `C:\apache2triad\htdocs\06\06lab-1`

### Variáveis de ambiente (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://zrkifsugemrchpppqydb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[chave anon]
```

---

## 6. Banco de Dados — Resumo das Tabelas

**68 tabelas + 1 view** organizadas em 9 camadas:

| Camada | Tabelas principais |
|---|---|
| 1 — Infraestrutura | organizations, organization_settings, user_profiles, relator_edition_access, representatives, representative_team_access, match_reports |
| 2 — Tipos/Lookup | sports, player_positions, staff_roles, referee_roles, phase_types, phase_round_labels, tiebreaker_criteria, ranking_categories |
| 3 — Competições | years, seasons, competitions, competition_editions, edition_settings, edition_registration_windows, edition_ranking_config, edition_teams, phases, phase_tiebreaker_config, groups, group_teams, conferences, conference_teams, rounds, matchups, phase_teams, table_markers, standings_overrides |
| 4 — Pessoas/Equipes | venues, teams, team_identity_history, athletes, athlete_team_stints, staff_members, staff_team_stints, referees, edition_roster_entries |
| 5 — Partidas | matches, match_lineups, match_staff_lineups, match_referees, match_actions, match_penalty_shootout, suspensions, athlete_edition_stats, team_edition_stats |
| 6 — Ranking/Produto | ranking_point_entries, ranking_manual_adjustments, team_ranking_cache, site_config, organization_redirects, referee_cache, staff_cache, venue_cache |
| 7 — Auditoria | audit_logs, notifications, pending_approvals (VIEW) |
| 8 — Premiações | edition_awards, athlete_motm_entries, selection_squads, selection_squad_members, athlete_career_stats, team_career_stats |

**Dados seed já inseridos:**
- `sports`: football7 / Futebol 7
- `player_positions`: Goleiro, Fixo, Ala Esquerda, Ala Direita, Meia, Pivô
- `staff_roles`: Técnico, Auxiliar Técnico, Diretoria, Representante
- `referee_roles`: Árbitro, Assistente, Mesário, Staff
- `phase_types`: knockout, round_robin, group_stage, conference
- `phase_round_labels`: 11 rótulos do mata-mata + 4 da conferência
- `tiebreaker_criteria`: 11 critérios de desempate
- `ranking_categories`: 15 categorias de pontuação

**Dados da Orange já inseridos:**
- Organization: `ea6c29d0-5f1d-4b42-97a7-685e6622ff45`
- Year 2026: `1eef453d-fd5d-41c1-9027-e47228e32ffb`
- Season 2026 I: `9feef599-401b-4f28-bb4a-a2e527c3bf0b` (is_current = true)
- User main: `afb39466-59ff-4c5e-b284-86ee2445218a`

