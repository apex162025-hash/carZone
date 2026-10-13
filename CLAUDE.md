# carZone (Carzen) — Session Context

> Loaded automatically at the start of every Claude Code session in `D:\carZone`.
> Read this first, then `super-admin/PROJECT_SUMMARY.md` before touching the Super Admin.
> The owner writes in Egyptian Arabic; reply in Arabic unless asked otherwise.

## 1. What this repo is

**Carzen** = marketplace + daily operating system for car washes in Cairo (currency EGP).
The repo holds two generations of front-end:

| Part | Path | Tech | Status |
|------|------|------|--------|
| Clickable demo (customer app, wash employee app, wash dashboard, registration, old platform admin) | `index.html`, `customer/`, `wash/`, `admin/`, `shared/` | Vanilla HTML/CSS/JS ES modules, mock DB in `localStorage` (`shared/js/db.js`, `shared/js/seed.js`, `shared/js/services/*`), served by `server.js` (port 3000) | Done earlier, **do not modify** unless asked |
| **Super Admin panel** | `super-admin/` | Next.js 16 + React 19 + TS, same stack/structure as `D:\Front-projects\aroma` | **Built in this effort — the active project** |

Product specs (source of truth for features): `docs/01_cursor_prompt_customer_app.md`,
`docs/02_cursor_prompt_car_wash_system.md`, `docs/03_cursor_prompt_admin_dashboard.md`
(admin spec: 25 screens, user stories AD-01…AD-48). Decisions log: `docs/DECISIONS.md`.

## 2. Super Admin — how it was built (history)

The owner asked: understand carZone deeply, then build a professional **Super Admin** panel that
follows the **structure and technology of `D:\Front-projects\aroma`** (Next.js 16 App Router,
Tailwind 4, shadcn base-nova on `@base-ui/react`, TanStack Query, Zustand, axios, react-hook-form +
zod, sonner, lucide, next-themes) with modern UI/UX.

Key decisions (also in `docs/DECISIONS.md`):
1. Separate Next.js app in `super-admin/`; the vanilla `admin/` demo stays untouched.
2. No backend exists yet → a **mock REST API inside Next** (`/api/v1/*`) with Laravel-style
   envelopes `{status, message, data, pagination?, meta?}`. Switching to the real Laravel API =
   set `NEXT_PUBLIC_API_URL`; nothing else changes.
3. Mock DB = TypeScript port of `shared/js/seed.js` (same deterministic records), so numbers match
   the vanilla demos.
4. Only `role = super` accounts can log in. Other roles (operations/finance/support) are managed
   from the panel (Admins + Roles matrix) — so the sidebar is not permission-filtered.
5. Arabic-only UI (aroma's approach); data keeps `{ar, en}` for a later i18n pass.
6. Brand tokens from `shared/css/tokens.css` (blue `#1463FF`, aqua `#12C8B6`, ink `#0B1B33`).

Work order: data layer + mock API + shared components + Dashboard + Washes (reference module) were
written first; the remaining modules were built in parallel by 5 sub-agents following the Washes
reference, then reviewed, fixed and verified (tsc, eslint, `next build`, browser walk of all
routes, demo scenarios via API). Everything currently passes. **Nothing has been committed yet.**

## 3. Run & verify

```bash
npm --prefix super-admin install
npm --prefix super-admin run dev          # http://localhost:3100
```

- Login: `sara@carzen.demo` / `demo1234` (prefilled, "دخول سريع"). Other seeded admins
  (`omar@`, `nour@`, `mona@carzen.demo`, same password) are rejected by design.
- Reset demo data: user menu → "إعادة ضبط بيانات العرض" (or `POST /api/v1/admin/system/reset`).
- Preview config for the desktop app: `.claude/launch.json` (name `super-admin`, port 3100).
- Verification commands (run inside `super-admin/`): `npx tsc --noEmit`, `npx eslint .`, `npx next build`.
- Mock data lives in memory (`globalThis`): restarting the dev server re-seeds it. Seed changes
  only apply after a reset/restart.

## 4. Status

**Built (all routes):** login, dashboard, washes (+detail), applications (+review), branches,
orders (+detail), customers (+detail), staff, complaints (+detail), reviews, offers, finance
overview / transactions (+discrepancy sheet) / commission / payouts, admins, roles matrix,
settings (5 tabs), audit log, notifications, ⌘K global search, dark mode, 404 + error pages.

**Not built yet (next candidates):**
- Reports (6 tabs) + Marketplace health — spec A19 / AD-41, AD-42 (types/hooks/API don't exist yet).
- Featured listings — spec A14 / AD-35.
- Branch map view (Leaflet) — currently a "coverage by area" summary.
- English UI / i18n.
- Small backlog: complaints `washId` filter (AD-30); `useNotifications` paging; a `definition`
  prop on shared `KpiCard`; `tfoot` totals row in `DataTable`; shared `STAFF_STATUS` /
  `BRANCH_STATUS` / `ADMIN_STATUS` label maps (modules define local copies); keep per-field
  `errors` from the API in `throwApiError`; document URLs on applications.

## 5. Rules for working here

- Follow `super-admin/AGENTS.md` (aroma's engineering playbook) and the conventions in
  `super-admin/PROJECT_SUMMARY.md` §6–§8 (data flow, shared components, gotchas).
- New features: Types → mock handler (if no real API) → service → hook → module UI → thin page.
- Never call axios/services from components. Never hand-roll status colors — use `lib/constants/labels.ts`.
- Sensitive mutations need a reason (`ReasonDialog`) and must write an audit entry in the handler.
- Keep every screen's 4 states (loading / empty / error / content) and RTL-safe logical CSS.
- Log non-obvious decisions as one line in `docs/DECISIONS.md`.
- Don't commit or push unless the owner asks.
