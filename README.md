# EZ-Match MVP

Last updated: 2026-02-21

## Table of Contents

<!-- TOC start -->
- [Stack](#stack)
- [Funcionalidades implementadas](#funcionalidades-implementadas)
- [Configuração local](#configurao-local)
- [D1 / Cloudflare](#d1--cloudflare)
<!-- TOC end -->

Sistema interno de conciliação semanal PMS x bancos para o Resort Itatiaia.

## Stack

- Next.js (App Router)
- Cloudflare Workers (`@opennextjs/cloudflare`)
- D1 (schema em `lib/db/schema.sql`)
- Tailwind + componentes estilo shadcn
- Matching determinístico (sem IA)

## Funcionalidades implementadas

- Fluxo admin completo:
  - Dashboard com histórico de semanas e métricas
  - Criação de semana
  - Importação CSV (PMS + bancos Bradesco/Caixa/Cielo/Pix/Generic)
  - CRUD de exceções + parser de WhatsApp + upload CSV de exceções
  - Reconciliação com 8 fases, filtros por cor e revisão manual
  - Nota obrigatória para itens vermelhos ao fechar semana
  - Relatório final com resumo executivo, descontos, ações necessárias
  - Exportação CSV e HTML print-friendly (PDF)
- Fluxo diretor:
  - Página read-only com token por semana: `/report/[weekId]?token=...`
- Auth MVP:
  - Login admin por `ADMIN_PASSWORD` + cookie de sessão assinado (`ADMIN_SESSION_SECRET`)

## Configuração local

1. Instale dependências:

```bash
npm install
```

2. Configure variáveis de ambiente:

```bash
cp .env.example .env.local
```

3. Rode o app:

```bash
npm run dev
```

4. Acesse:

- Admin login: `http://localhost:3000/login`
- Senha admin: valor definido em `ADMIN_PASSWORD` no seu `.env.local`

## D1 / Cloudflare

- Schema SQL: `lib/db/schema.sql`
- Em desenvolvimento, o projeto usa `initOpenNextCloudflareForDev` para disponibilizar bindings Cloudflare no `next dev`.
- Aplicar localmente:

```bash
npm run db:apply:local
```

- Build para Pages:

```bash
npm run build
npm run cf:build
npm run cf:preview
```
