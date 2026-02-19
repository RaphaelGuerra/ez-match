 EZ-Match MVP — Plano de Implementação                                                                           │
│                                                                                                                 │
│ Contexto                                                                                                        │
│                                                                                                                 │
│ Sistema interno de conciliação semanal para o Resort Itatiaia. Automatiza o processo manual (30–120 min/semana) │
│  de bater entradas do PMS com extratos bancários. Principal dor: descontos informais não lançados no sistema    │
│ geram divergências. MVP aceita CSV para tudo. Sem integrações via API.                                          │
│                                                                                                                 │
│ Stack: Next.js (App Router) + Cloudflare Pages + Workers + D1 (SQLite) + shadcn/ui + Tailwind. Matching 100%    │
│ determinístico (sem IA por ora).                                                                                │
│                                                                                                                 │
│ ---                                                                                                             │
│ Arquitetura                                                                                                     │
│                                                                                                                 │
│ ez-match/                                                                                                       │
│ ├── app/                                                                                                        │
│ │   ├── (admin)/                                                                                                │
│ │   │   ├── layout.tsx              # Auth guard admin                                                          │
│ │   │   ├── page.tsx                # Dashboard: lista de semanas                                               │
│ │   │   ├── weeks/                                                                                              │
│ │   │   │   ├── new/page.tsx        # Criar nova semana                                                         │
│ │   │   │   └── [weekId]/                                                                                       │
│ │   │   │       ├── page.tsx        # Overview da semana                                                        │
│ │   │   │       ├── import/page.tsx # Upload de CSVs                                                            │
│ │   │   │       ├── exceptions/page.tsx  # Registrar exceções                                                   │
│ │   │   │       ├── reconcile/page.tsx   # Rodar + revisar conciliação                                          │
│ │   │   │       └── report/page.tsx      # Relatório final                                                      │
│ │   ├── (director)/                                                                                             │
│ │   │   └── report/[weekId]/page.tsx  # View read-only do relatório                                             │
│ │   └── api/                                                                                                    │
│ │       ├── weeks/route.ts                                                                                      │
│ │       ├── import/entries/route.ts   # Upload CSV entradas                                                     │
│ │       ├── import/bank/route.ts      # Upload CSV extrato(s)                                                   │
│ │       ├── exceptions/route.ts       # CRUD exceções                                                           │
│ │       ├── exceptions/parse/route.ts # Parse texto WhatsApp                                                    │
│ │       ├── reconcile/route.ts        # Executar reconciliação                                                  │
│ │       └── export/route.ts           # Exportar CSV/PDF                                                        │
│ ├── lib/                                                                                                        │
│ │   ├── parsers/                                                                                                │
│ │   │   ├── csv.ts                  # Core CSV parser (papaparse, tolerante)                                    │
│ │   │   ├── pms.ts                  # Parser entradas PMS (mapeamento de colunas)                               │
│ │   │   └── bank/                                                                                               │
│ │   │       ├── bradesco.ts                                                                                     │
│ │   │       ├── caixa.ts                                                                                        │
│ │   │       ├── cielo.ts                                                                                        │
│ │   │       ├── pix.ts                                                                                          │
│ │   │       └── generic.ts          # Fallback por mapeamento manual                                            │
│ │   ├── reconciliation/                                                                                         │
│ │   │   ├── matcher.ts              # Motor principal de matching                                               │
│ │   │   ├── rules.ts                # Regras por tipo de match                                                  │
│ │   │   └── confidence.ts          # Cálculo de cor/confiança                                                   │
│ │   ├── exceptions/                                                                                             │
│ │   │   └── whatsapp-parser.ts     # Regex parser de texto do WhatsApp                                          │
│ │   ├── report/                                                                                                 │
│ │   │   ├── generator.ts           # Monta estrutura do relatório                                               │
│ │   │   └── export.ts              # CSV export, HTML para print/PDF                                            │
│ │   └── db/                                                                                                     │
│ │       ├── schema.sql              # Migrations D1                                                             │
│ │       └── queries.ts             # Query helpers tipados                                                      │
│ ├── components/                                                                                                 │
│ │   ├── ui/                        # shadcn/ui components                                                       │
│ │   ├── week-status-badge.tsx      # 🟢🟡🟠🔴🔵 badges                                                          │
│ │   ├── match-table.tsx            # Tabela de conciliação com cores                                            │
│ │   ├── exception-form.tsx         # Form de exceção                                                            │
│ │   ├── csv-upload.tsx             # Upload zone com preview                                                    │
│ │   └── report-summary.tsx        # Bloco resumo executivo                                                      │
│ └── wrangler.toml                  # Cloudflare config (D1, R2)                                                 │
│                                                                                                                 │
│ ---                                                                                                             │
│ Modelo de Dados (D1 / SQLite)                                                                                   │
│                                                                                                                 │
│ -- Semanas de fechamento                                                                                        │
│ CREATE TABLE weeks (                                                                                            │
│   id TEXT PRIMARY KEY,         -- uuid                                                                          │
│   name TEXT NOT NULL,          -- ex: "Semana 12 · 17–23/Mar"                                                   │
│   start_date TEXT NOT NULL,    -- ISO date                                                                      │
│   end_date TEXT NOT NULL,                                                                                       │
│   status TEXT NOT NULL DEFAULT 'open',  -- open | reconciled | closed                                           │
│   created_at TEXT NOT NULL,                                                                                     │
│   closed_at TEXT                                                                                                │
│ );                                                                                                              │
│                                                                                                                 │
│ -- Entradas do sistema (PMS)                                                                                    │
│ CREATE TABLE entries (                                                                                          │
│   id TEXT PRIMARY KEY,                                                                                          │
│   week_id TEXT NOT NULL REFERENCES weeks(id),                                                                   │
│   reservation_id TEXT,         -- número da reserva, se houver                                                  │
│   guest_name TEXT,                                                                                              │
│   description TEXT,                                                                                             │
│   amount REAL NOT NULL,        -- valor esperado                                                                │
│   date TEXT NOT NULL,          -- ISO date                                                                      │
│   raw_row TEXT                 -- JSON da linha original do CSV                                                 │
│ );                                                                                                              │
│                                                                                                                 │
│ -- Lançamentos bancários                                                                                        │
│ CREATE TABLE bank_records (                                                                                     │
│   id TEXT PRIMARY KEY,                                                                                          │
│   week_id TEXT NOT NULL REFERENCES weeks(id),                                                                   │
│   bank_source TEXT NOT NULL,   -- bradesco | caixa | cielo | pix | generic                                      │
│   date TEXT NOT NULL,                                                                                           │
│   amount REAL NOT NULL,                                                                                         │
│   description TEXT,                                                                                             │
│   raw_row TEXT                                                                                                  │
│ );                                                                                                              │
│                                                                                                                 │
│ -- Exceções (descontos, cash, cancelamentos, etc.)                                                              │
│ CREATE TABLE exceptions (                                                                                       │
│   id TEXT PRIMARY KEY,                                                                                          │
│   week_id TEXT NOT NULL REFERENCES weeks(id),                                                                   │
│   type TEXT NOT NULL,          -- discount | cash | cancellation | noshow | acquirer_fee                        │
│   reservation_id TEXT,                                                                                          │
│   guest_name TEXT,                                                                                              │
│   original_amount REAL,                                                                                         │
│   final_amount REAL,                                                                                            │
│   discount_amount REAL,        -- calculado: original - final                                                   │
│   discount_pct REAL,           -- calculado: (discount/original)*100                                            │
│   reason TEXT,                                                                                                  │
│   source TEXT NOT NULL,        -- whatsapp | csv | manual                                                       │
│   source_raw TEXT,             -- texto original do WhatsApp, se aplicável                                      │
│   created_at TEXT NOT NULL                                                                                      │
│ );                                                                                                              │
│                                                                                                                 │
│ -- Resultado da conciliação                                                                                     │
│ CREATE TABLE matches (                                                                                          │
│   id TEXT PRIMARY KEY,                                                                                          │
│   week_id TEXT NOT NULL REFERENCES weeks(id),                                                                   │
│   entry_id TEXT REFERENCES entries(id),                                                                         │
│   bank_record_id TEXT REFERENCES bank_records(id),                                                              │
│   exception_id TEXT REFERENCES exceptions(id),                                                                  │
│   status TEXT NOT NULL,        -- green | yellow | orange | red | blue                                          │
│   match_type TEXT NOT NULL,    -- direct | discount | inferred | unmatched | unidentified                       │
│   confidence REAL,             -- 0.0–1.0                                                                       │
│   date_diff_days INTEGER,      -- diferença de dias usada no match                                              │
│   amount_diff REAL,            -- diferença de valor                                                            │
│   notes TEXT,                  -- explicação automática ou manual                                               │
│   admin_note TEXT,             -- nota manual do admin (para 🔴 e 🟠)                                           │
│   created_at TEXT NOT NULL                                                                                      │
│ );                                                                                                              │
│                                                                                                                 │
│ ---                                                                                                             │
│ Motor de Conciliação (determinístico)                                                                           │
│                                                                                                                 │
│ Ordem de aplicação das regras:                                                                                  │
│                                                                                                                 │
│ Fase 1 — Matching direto (🟢)                                                                                   │
│ - entry.amount == bank_record.amount (tolerância ±R$0,01)                                                       │
│ - |entry.date - bank_record.date| == 0 dias                                                                     │
│ - → Status: green, confidence: 1.0                                                                              │
│                                                                                                                 │
│ Fase 2 — Matching com taxa de adquirente (🟢)                                                                   │
│ - bank_record.bank_source == 'cielo'                                                                            │
│ - entry.amount * (1 - cielo_fee) ≈ bank_record.amount (tolerância ±R$0,10)                                      │
│ - → Status: green, confidence: 0.95, notes: "Taxa adquirente Cielo R$X"                                         │
│                                                                                                                 │
│ Fase 3 — Matching com desconto registrado (🟡)                                                                  │
│ - Existe exception do tipo discount para a entrada                                                              │
│ - exception.final_amount ≈ bank_record.amount (tolerância ±R$0,01)                                              │
│ - → Status: yellow, confidence: 0.95                                                                            │
│                                                                                                                 │
│ Fase 4 — Cash/Cancelamento/No-show (🟢 sem banco)                                                               │
│ - Existe exception do tipo cash | cancellation | noshow para a entrada                                          │
│ - Entrada não precisa de bank_record correspondente                                                             │
│ - → Status: green, confidence: 1.0, notes: tipo de exceção                                                      │
│                                                                                                                 │
│ Fase 5 — Matching por tolerância de data (🟠)                                                                   │
│ - entry.amount ≈ bank_record.amount (tolerância ±R$0,01)                                                        │
│ - |entry.date - bank_record.date| ≤ 2 dias                                                                      │
│ - → Status: orange, confidence: 0.7, requer revisão humana                                                      │
│                                                                                                                 │
│ Fase 6 — Matching por valor aproximado + data (🟠)                                                              │
│ - Sem exception, sem match direto                                                                               │
│ - Valor dentro de ±5% E data dentro de ±2 dias                                                                  │
│ - → Status: orange, confidence: 0.5                                                                             │
│                                                                                                                 │
│ Fase 7 — Não conciliado (🔴)                                                                                    │
│ - Entradas do sistema sem qualquer bank_record match                                                            │
│ - → Status: red                                                                                                 │
│                                                                                                                 │
│ Fase 8 — Pagamento sem origem (🔵)                                                                              │
│ - Bank_records sem qualquer entry match                                                                         │
│ - → Status: blue                                                                                                │
│                                                                                                                 │
│ Prevenção de double-matching:                                                                                   │
│                                                                                                                 │
│ - Cada entry e bank_record só pode ser usado em 1 match                                                         │
│ - Algoritmo guloso: processa pelo maior valor primeiro (greedy by amount DESC)                                  │
│                                                                                                                 │
│ ---                                                                                                             │
│ Parsers CSV                                                                                                     │
│                                                                                                                 │
│ PMS (entradas)                                                                                                  │
│                                                                                                                 │
│ - Colunas configuráveis por mapeamento (nome da coluna → campo interno)                                         │
│ - Campos mínimos: date, amount, guest_name (reservation_id opcional)                                            │
│ - Normalização monetária: R$ 1.234,56 → 1234.56 (regex robusto)                                                 │
│                                                                                                                 │
│ Bancos                                                                                                          │
│                                                                                                                 │
│ - Bradesco: colunas padrão do extrato OFX/CSV exportado                                                         │
│ - Caixa: colunas padrão extrato CEF                                                                             │
│ - Cielo: relatório de vendas CSV (inclui taxa)                                                                  │
│ - Pix: extrato de recebimentos Pix (geralmente com descrição genérica)                                          │
│ - Generic: o admin mapeia colunas manualmente na primeira importação                                            │
│                                                                                                                 │
│ Tolerâncias de parsing:                                                                                         │
│                                                                                                                 │
│ - Encoding: UTF-8 e ISO-8859-1 com detecção automática                                                          │
│ - BOM: stripped automaticamente                                                                                 │
│ - Separadores: vírgula e ponto-e-vírgula detectados automaticamente                                             │
│ - Datas: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY                                                                     │
│                                                                                                                 │
│ ---                                                                                                             │
│ Parser de WhatsApp (regex)                                                                                      │
│                                                                                                                 │
│ Extrai de texto livre:                                                                                          │
│ - Valor original: R\$\s*([\d.,]+) ou de R\$, era R\$, original R\$                                              │
│ - Valor final: para R\$, pagou R\$, recebeu R\$, ficou R\$                                                      │
│ - Nome do hóspede: primeira linha ou após "cliente", "hóspede"                                                  │
│ - Motivo: tudo após "motivo:", "porque", "por conta de", ou campo livre                                         │
│                                                                                                                 │
│ Output: objeto parcial de exceção para confirmação do admin antes de salvar.                                    │
│                                                                                                                 │
│ ---                                                                                                             │
│ UI — Fluxo Principal (Admin)                                                                                    │
│                                                                                                                 │
│ 1. Dashboard (/)                                                                                                │
│                                                                                                                 │
│ - Lista de semanas com status badge                                                                             │
│ - Botão "Nova semana"                                                                                           │
│ - Métricas rápidas: semana atual, % conciliado, total de itens pendentes                                        │
│                                                                                                                 │
│ 2. Importação (/weeks/[id]/import)                                                                              │
│                                                                                                                 │
│ - Upload zone para CSV de entradas (drag & drop)                                                                │
│ - Upload zone para CSV(s) bancários (múltiplos, seleção de banco)                                               │
│ - Preview: 5 primeiras linhas + contagem + total R$                                                             │
│ - Mapeamento de colunas se necessário (generic parser)                                                          │
│                                                                                                                 │
│ 3. Exceções (/weeks/[id]/exceptions)                                                                            │
│                                                                                                                 │
│ - Textarea para colar texto do WhatsApp → parse automático → form pré-preenchido                                │
│ - Upload de CSV de exceções (batch)                                                                             │
│ - Form manual para exceção individual                                                                           │
│ - Lista de exceções da semana                                                                                   │
│                                                                                                                 │
│ 4. Conciliação (/weeks/[id]/reconcile)                                                                          │
│                                                                                                                 │
│ - Botão "Rodar conciliação"                                                                                     │
│ - Tabela resultado com linha colorida por status (🟢🟡🟠🔴🔵)                                                   │
│ - Filtros por cor                                                                                               │
│ - Para 🟠: botão "Confirmar" ou "Reclassificar"                                                                 │
│ - Para 🔴: textarea de nota obrigatória antes de fechar                                                         │
│ - Botão "Fechar semana" (só habilitado se todos 🔴 têm nota)                                                    │
│                                                                                                                 │
│ 5. Relatório (/weeks/[id]/report)                                                                               │
│                                                                                                                 │
│ - Bloco resumo executivo (expected vs received, diferença, contagem por cor)                                    │
│ - Seção de descontos (tabela + total + top motivos)                                                             │
│ - Lista de ações necessárias (🔴 e 🔵)                                                                          │
│ - Botão: Exportar CSV, Exportar PDF (print-friendly page)                                                       │
│ - Link compartilhável para diretor (read-only, com token)                                                       │
│                                                                                                                 │
│ ---                                                                                                             │
│ Auth (MVP simples)                                                                                              │
│                                                                                                                 │
│ - Admin: senha em env var (ADMIN_PASSWORD), cookie de sessão simples                                            │
│ - Diretor: link com token único por semana (/report/[weekId]?token=xxx)                                         │
│ - Token gerado ao fechar semana, armazenado em D1                                                               │
│ - Sem usuários, sem signup, sem reset de senha                                                                  │
│                                                                                                                 │
│ ---                                                                                                             │
│ Setup Cloudflare                                                                                                │
│                                                                                                                 │
│ # wrangler.toml                                                                                                 │
│ name = "ez-match"                                                                                               │
│ compatibility_date = "2024-09-23"                                                                               │
│                                                                                                                 │
│ [[d1_databases]]                                                                                                │
│ binding = "DB"                                                                                                  │
│ database_name = "ez-match-db"                                                                                   │
│ database_id = "<criar via wrangler>"                                                                            │
│                                                                                                                 │
│ [[r2_buckets]]           # Opcional: para arquivos CSV originais                                                │
│ binding = "FILES"                                                                                               │
│ bucket_name = "ez-match-files"                                                                                  │
│                                                                                                                 │
│ ---                                                                                                             │
│ Ordem de Implementação                                                                                          │
│                                                                                                                 │
│ Sprint 1 — Fundação (rodar localmente)                                                                          │
│                                                                                                                 │
│ 1. create-next-app com Cloudflare adapter (@cloudflare/next-on-pages)                                           │
│ 2. Schema D1 + wrangler.toml                                                                                    │
│ 3. Parsers CSV: PMS genérico + 1 banco (Bradesco primeiro)                                                      │
│ 4. Motor de matching (Fases 1, 3, 7, 8 — as essenciais)                                                         │
│ 5. UI básica: importar CSV → ver tabela de matches                                                              │
│                                                                                                                 │
│ Sprint 2 — Exceções e cores                                                                                     │
│                                                                                                                 │
│ 6. CRUD de exceções (form + WhatsApp parser)                                                                    │
│ 7. Fases 2 (Cielo taxa) + 5 e 6 (tolerância de data) do matcher                                                 │
│ 8. Tabela colorida com filtros                                                                                  │
│ 9. Nota obrigatória para 🔴                                                                                     │
│                                                                                                                 │
│ Sprint 3 — Relatório e entrega                                                                                  │
│                                                                                                                 │
│ 10. Relatório final com todas as seções                                                                         │
│ 11. Exportação CSV                                                                                              │
│ 12. Página read-only do diretor com token                                                                       │
│ 13. Deploy Cloudflare Pages                                                                                     │
│                                                                                                                 │
│ Sprint 4 — Polimento                                                                                            │
│                                                                                                                 │
│ 14. Parsers para Caixa, Cielo, Pix                                                                              │
│ 15. Dashboard com histórico de semanas                                                                          │
│ 16. Print CSS para PDF (sem biblioteca extra)                                                                   │
│                                                                                                                 │
│ ---                                                                                                             │
│ Dependências principais                                                                                         │
│                                                                                                                 │
│ {                                                                                                               │
│   "next": "latest",                                                                                             │
│   "@cloudflare/next-on-pages": "latest",                                                                        │
│   "papaparse": "^5.x",      // CSV parsing                                                                      │
│   "shadcn/ui": "latest",    // UI components                                                                    │
│   "tailwindcss": "^3.x",                                                                                        │
│   "date-fns": "^3.x",       // Date manipulation                                                                │
│   "zod": "^3.x",            // Validation                                                                       │
│   "uuid": "^9.x"            // IDs                                                                              │
│ }                                                                                                               │
│                                                                                                                 │
│ ---                                                                                                             │
│ Verificação (como testar ao final do Sprint 1)                                                                  │
│                                                                                                                 │
│ 1. Subir servidor local: npm run dev (com wrangler D1 local)                                                    │
│ 2. Criar semana nova via UI                                                                                     │
│ 3. Fazer upload de CSV de entradas (mock: 10 linhas com nomes, valores, datas)                                  │
│ 4. Fazer upload de CSV bancário (mock: mesmos valores ±variações)                                               │
│ 5. Rodar reconciliação → ver tabela com 🟢 para matches diretos e 🔴 para não matches                           │
│ 6. Registrar 1 exceção de desconto → re-rodar → item vira 🟡                                                    │
│ 7. Verificar que totais batem matematicamente no resumo
