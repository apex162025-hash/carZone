# carZone (Carzen) — Session Context

> Loaded automatically at the start of every Claude Code session in this repo.
> Read this first, then the `PROJECT_SUMMARY.md` of the app you're touching
> (`super-admin/` or `vendor-portal/`).
> The owner writes in Egyptian Arabic; reply in Arabic unless asked otherwise.

## 1. What this repo is

**Carzen** = marketplace + daily operating system for car washes in Cairo (currency EGP).
The repo holds two generations of front-end, organised as an **npm-workspaces monorepo**:

| Part | Path | Tech | Status |
|------|------|------|--------|
| Clickable demo (customer app, wash employee app, wash dashboard, registration, old platform admin) | `index.html`, `customer/`, `wash/`, `admin/`, `shared/` | Vanilla HTML/CSS/JS ES modules, mock DB in `localStorage`, served by `server.js` (port 3000) | Done earlier, **do not modify** unless asked |
| **Super Admin panel** (Carzen staff) | `super-admin/` | Next.js 16 + React 19 + TS, same stack/structure as `D:\Front-projects\aroma` | Built, port **3100** |
| **Vendor Portal — "Carzen Partners"** (wash owners & branch managers) | `vendor-portal/` | Same stack as the Super Admin | Built, port **3200** |
| Shared types | `packages/contracts` (`@carzen/contracts`) | TS types only (admin domains + `vendor/*`) | |
| Shared design system | `packages/ui` (`@carzen/ui`) | shadcn base-nova primitives, shared components, format/labels/csv libs, hooks, theme CSS | |
| Shared mock backend | `packages/platform-api` (`@carzen/platform-api`) | `server-only` mock REST API: `/admin/*` + `/vendor/*` namespaces, seed, file store | |

Product specs (source of truth for features): `docs/01_cursor_prompt_customer_app.md`,
`docs/02_cursor_prompt_car_wash_system.md` (Part B = vendor portal, screens D1–D19, stories OW/MG),
`docs/03_cursor_prompt_admin_dashboard.md` (admin: 25 screens, AD-01…AD-48). Decisions log: `docs/DECISIONS.md`.

## 2. How it was built (history)

1. **Super Admin.** The owner asked to understand carZone deeply, then build a professional Super
   Admin following the **structure and technology of `D:\Front-projects\aroma`** (Next.js 16 App
   Router, Tailwind 4, shadcn base-nova on `@base-ui/react`, TanStack Query, Zustand, axios,
   react-hook-form + zod, sonner, lucide, next-themes) with modern UI/UX. Data layer + mock API +
   shared components + Dashboard + Washes (reference module) were written first; the rest by 5
   parallel sub-agents, then reviewed and verified.
2. **Vendor Portal.** The owner asked for a vendor portal with the same tech, "perfect harmony and
   integration like large-scale projects", **in a separate folder** so nothing conflicts with the
   Super Admin. To integrate for real instead of duplicating, the shared parts were extracted into
   `packages/*` and both apps consume them; the mock backend became one shared service with a
   vendor namespace and a shared on-disk DB, so actions in one app show up in the other.
   Core (shell, auth, dashboard, live board, orders/bookings, order actions, new-order sheet) was
   written first as the reference; the other screens by 5 parallel sub-agents, then reviewed.

Key decisions (also in `docs/DECISIONS.md`):
1. Separate Next.js apps; the vanilla demos stay untouched.
2. No backend yet → a **mock REST API inside Next** (`/api/v1/*`, Laravel-style envelopes
   `{status, message, data, pagination?, meta?}`). Switching to Laravel = set `NEXT_PUBLIC_API_URL`.
3. Mock DB = TypeScript port of `shared/js/seed.js` (same deterministic records) + 30 days of
   vendor history, persisted in `.carzen/platform-db.json` and shared by both apps.
4. Super Admin: only `role = super` logs in. Vendor Portal: only owners and branch managers log in
   (employees use the mobile employee app); managers are locked to their branch server-side.
5. Arabic-only UI; data keeps `{ar, en}` for a later i18n pass.
6. Brand tokens from `shared/css/tokens.css` (blue `#1463FF`, aqua `#12C8B6`, ink `#0B1B33`).
7. Demo clock anchored at "today 15:30" that advances in real time (`X-Demo-Now` header).

## 3. Monorepo layout & shared packages

```
package.json                 # workspaces: packages/*, super-admin, vendor-portal (+ scripts below)
packages/contracts/src/      # @carzen/contracts/<file>   e.g. @carzen/contracts/orders, …/vendor/operations
packages/ui/src/             # @carzen/ui/components/ui/*, @carzen/ui/components/shared/*,
                             # @carzen/ui/lib/{format,utils,export-csv,constants/labels}, @carzen/ui/hooks/*,
                             # @carzen/ui/styles/theme.css (tokens, dark mode, utilities)
packages/platform-api/src/   # handleMockRequest; handlers/* (admin), vendor/* (vendor), seed.ts, db.ts (file store + clock)
super-admin/                 # app → see super-admin/PROJECT_SUMMARY.md
vendor-portal/               # app → see vendor-portal/PROJECT_SUMMARY.md
.carzen/platform-db.json     # shared mock DB (git-ignored, auto-created; delete or reset to re-seed)
```

- Packages ship TypeScript source; apps compile them via `transpilePackages` and
  `turbopack.root` = monorepo root (see each app's `next.config.ts`). Tailwind scans the ui package
  via `@source "../../packages/ui/src"` in each app's `globals.css`.
- A change in `packages/*` affects **both** apps — typecheck both after touching them.
- The DB file regenerates when `SCHEMA_VERSION` (`packages/platform-api/src/seed.ts`, now 5) changes
  or the calendar day changes. Bump it when you change the seed or schema.

## 4. Run & verify

```bash
npm install                  # once, at the root
npm run dev:platform         # super-admin :3100 + vendor-portal :3200 (concurrently)
npm run dev:admin            # only super-admin
npm run dev:vendor           # only vendor-portal
npm run typecheck            # every workspace
npm run lint
npm run build                # both apps
```

- Super Admin login: `sara@carzen.demo` / `demo1234` (other seeded admins are rejected by design).
- Vendor login: owner Khaled `01200000000`, manager Mohamed Adel `01005550102` (Nasr City),
  manager Tamer `01005550201` (Heliopolis) — password `demo1234`; persona buttons on the login page.
- Reset demo data (both apps): Super Admin user menu → "إعادة ضبط بيانات العرض"
  (`POST /api/v1/admin/system/reset`).
- Desktop-app preview configs: `.claude/launch.json` (`super-admin` :3100, `vendor-portal` :3200).

## 5. Status

**Super Admin — built:** login, dashboard, washes (+detail), applications (+review), branches,
orders (+detail), customers (+detail), staff, complaints (+detail), reviews, offers, finance
overview / transactions / commission / payouts, admins, roles matrix, settings, audit log,
notifications, ⌘K search, dark mode, 404 + error pages.

**Vendor Portal — built:** login, dashboard, live board, bookings, orders (+detail), new-order
sheet, schedule & capacity, services, offers, staff, shifts & day closing, customers (+detail),
reviews, reports, finance, branches, audit log, notifications, settings, ⌘K search, dark mode.

**Not built yet (next candidates):**
- Super Admin: Reports + Marketplace health (A19 / AD-41/42), Featured listings (A14 / AD-35),
  branch map view, small backlog in `super-admin/PROJECT_SUMMARY.md` §10.
- Vendor Portal: see `vendor-portal/PROJECT_SUMMARY.md` §10.
- English UI / i18n; moving the vanilla customer & employee apps onto the shared API.

## 6. Rules for working here

- Follow each app's `AGENTS.md` (aroma's engineering playbook) and `PROJECT_SUMMARY.md` conventions.
- New features: contract types → mock handler (if no real API) → service → hook → module UI → thin page.
- Never call axios/services from components. Never hand-roll status colors — use `@carzen/ui/lib/constants/labels`.
- Sensitive mutations need a reason (`ReasonDialog`) and must write an audit entry in the handler.
- Keep every screen's 4 states (loading / empty / error / content) and RTL-safe logical CSS.
- Use `serverNow()` (never `new Date()`) for "now" in UI code; `now()` in handlers.
- Log non-obvious decisions as one line in `docs/DECISIONS.md`.
- Don't commit or push unless the owner asks.
