# 02 — Tech Stack & Architecture

## Stack Completa

### Frontend
- **Framework:** Next.js (App Router, TypeScript) — versão 16.2.2
- **Styling:** Tailwind CSS v4
- **Ícones:** lucide-react
- **State:** React hooks locais (useState, useEffect, useCallback) — sem Redux/Zustand

### Backend / Banco
- **BaaS:** Supabase
  - PostgreSQL como banco relacional
  - Row Level Security (RLS) para multi-tenancy
  - Supabase Storage para uploads (logos de times)
  - Supabase Auth para autenticação
  - RPCs (funções PostgreSQL) para recálculo de estatísticas

### Mutações de Dados
- **Server Actions** do Next.js (`"use server"`)
- Client-side usa `createClient` de `@/lib/supabase` (browser)
- Server Actions usam `createClient` de `@/lib/supabase-server`

### Infraestrutura
- **Versionamento:** GitHub — repositório `fe-goncalves/06lab`
- **Deploy:** Cloudflare Pages
- **Dev local:** Windows + Apache2Triad, porta 3000

### Workaround Crítico de Ambiente
Todo terminal PowerShell novo precisa executar antes de qualquer comando Node:
```powershell
$env:OPENSSL_CONF=""
```
Sem isso, o servidor não sobe por conflito OpenSSL/Apache2Triad.

## Estrutura de Pastas
```
src/
  app/
    (lab)/                    # Grupo de rotas do admin
      components/             # Componentes compartilhados (toast, breadcrumb, etc.)
      competicoes/
        [id]/
          competicao-hub.tsx  # Componente principal do hub de competição
          page.tsx
          edicoes/
            actions.ts        # Server Actions de edições
            [edicaoId]/
              fases/
                actions.ts    # Server Actions de fases/rounds
                [faseId]/
                  fase-client.tsx
                  page.tsx
      partidas/
        [matchId]/
          actions.ts          # criarPartida, editarPartida, adicionarAcao, etc.
          partida-client.tsx
          page.tsx
      times/
      atletas/
      arbitros/
      locais/
  lib/
    supabase.ts               # Client browser
    supabase-server.ts        # Client server (SSR)
middleware.ts                 # Gerenciamento de cookies/sessão Supabase
```

## Padrões Adotados

### Componentes
- Arquivo único por módulo (ex: `competicao-hub.tsx` contém todos os sub-componentes)
- Sub-componentes declarados como funções fora do componente principal (não inline)
- Nenhuma biblioteca de componentes externa — tudo custom com inline styles + Tailwind

### Queries Supabase (Client-side)
- Queries paralelas via `Promise.all` para carregamento de dados
- Enriquecimento manual quando FKs não existem (ex: matchups → teams)
- Padrão: buscar dados base → buscar relacionamentos separado → mapear no client

### Autenticação em Server Actions
- Session obtida via `supabase.auth.getUser()` no início de cada action
- Sem `redirect("/login")` em actions que retornam erro (usar `return { error: "..." }`)
- `redirect("/login")` apenas em `criarPartida` e similares onde é seguro

### RLS
- Todas as tabelas têm RLS habilitado
- Políticas baseadas em `organization_id` ou `phase_id IN (SELECT id FROM phases WHERE...)`
- `is_admin()` função customizada para operações de escrita
- **Bug histórico crítico:** `middleware.ts` com segundo parâmetro em `setAll(cookiesToSet)` corrompe o cookie handler → `auth.uid()` retorna null silenciosamente em Server Actions → todos os INSERTs falham via RLS

### Variáveis CSS (Design Tokens)
Todas as cores e estilos usam variáveis CSS via `var(--color-*)` — nunca valores hardcoded exceto quando semanticamente necessário (ex: cores de status específicos).