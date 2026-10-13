# Carzen Super Admin — Technical Reference

> Full context for any engineer or AI session. Read `../CLAUDE.md` (repo overview + history)
> and `AGENTS.md` (engineering playbook, copied from aroma) as well.
> Last updated: 2026-10-13 — all screens below are built and verified (tsc, eslint, next build,
> browser walk, API scenario tests). Not committed yet.

---

## 1. Summary

| Item | Detail |
|------|--------|
| Product | Back-office for **Carzen** (car-wash marketplace + operating system, Cairo, EGP) |
| Users | **Super Admin** only (`role: super`); other admin roles are rejected at login |
| Locale | Arabic, RTL (`<html lang="ar" dir="rtl">`), Western digits, money `180 ج.م`, 12-h times |
| Stack | Next.js 16.2 App Router · React 19.2 · TypeScript 5 · Tailwind 4 · shadcn/ui **base-nova** (`@base-ui/react`, RTL) · TanStack Query 5 · Zustand 5 · axios · react-hook-form + zod 4 · sonner · lucide-react · next-themes · cmdk (⌘K) · Recharts 3 (lazy) · `server-only` |
| Mirrors | `D:\Front-projects\aroma` — same versions, folder layout, data-flow rules, `components.json`, eslint/postcss/tsconfig |
| Domain source | `../docs/03_cursor_prompt_admin_dashboard.md` + `../shared/js/seed.js`, `../shared/js/services/admin.js` |
| Backend | Bundled mock REST API `/api/v1/*` (until Laravel exists) |
| Port | 3100 (`npm run dev`) |

## 2. Run

```bash
npm install
npm run dev            # http://localhost:3100
npm run build          # production build (must pass)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
```

- Login `sara@carzen.demo` / `demo1234` (prefilled; "دخول سريع" button).
- Env (`.env.example`): `NEXT_PUBLIC_API_URL` (empty = mock API), `MOCK_API_LATENCY` (ms, default 280, 0 = off).
- Reset data: user menu → "إعادة ضبط بيانات العرض" → `POST /admin/system/reset` (keeps open sessions).

## 3. Folder structure

```
app/
  layout.tsx                 # fonts (IBM Plex Sans Arabic + Plus Jakarta Sans), metadata, AppProviders
  globals.css                # design tokens (light + .dark), utilities (num, tone-*, bg-brand-gradient…)
  page.tsx                   # redirect → /dashboard
  not-found.tsx
  login/page.tsx             # public; LoginForm
  (panel)/layout.tsx         # AdminAuthGate → sidebar + topbar + main + CommandPalette
  (panel)/error.tsx          # route error boundary
  (panel)/<route>/page.tsx   # thin Server Components (metadata only)
  api/v1/[...path]/route.ts  # mock API entry (GET/POST/PUT/PATCH/DELETE)
components/
  ui/                        # shadcn base-nova primitives (generated, lightly customized — see §8)
  shared/                    # cross-module building blocks (§6)
  shared/layout/             # admin-sidebar, sidebar-nav, admin-topbar, notifications-menu,
                             # user-menu, theme-toggle, command-palette, admin-auth-gate, brand-logo
  providers/                 # app-providers, query-provider, auth-bootstrap
  modules/<Feature>/         # feature UI (§5)
hooks/                       # React Query hooks per domain + utilities
lib/
  axios.ts                   # apiClient (Bearer, envelope check, 401 → clearAuth)
  api/request.ts             # getData / getPaginated / send + cleanParams; MutationResult
  api/api-error-handler.ts   # copied from aroma (throwApiError, resolveUserFacingError…)
  config/api-base-url.ts     # NEXT_PUBLIC_API_URL or "/api/v1"
  config/pages.ts            # Arabic page metadata (getStaticPageMetadata)
  constants/labels.ts        # ALL status labels + tones, areas, categories, audit labels (§7)
  admin-nav.ts               # sidebar groups/items, isNavActive
  query-keys.ts              # centralized query keys (each domain has *Root)
  format.ts                  # formatMoney/Number/Percent/Date/Time/DateTime/Relative/Duration, daysBetween, initials
  export-csv.ts              # UTF-8 BOM CSV download
  cache/ttl.ts               # CACHE_TTL_LIVE 15s / DYNAMIC 30s / REFERENCE 5m
  store/auth-store.ts        # admin + token (persisted, skipHydration, hasHydrated flag)
  store/ui-store.ts          # sidebarCollapsed (persisted), mobileNavOpen, commandOpen
  services/*.service.ts      # one per domain
  mock-api/                  # server-only mock backend (§4)
types/                       # domain + API types, react-query.d.ts (mutation meta typing)
public/logo.svg
```

## 4. Mock API (`lib/mock-api/`)

- `index.ts` route table + dispatcher: matches `method + /path/:param`, simulates latency, checks
  Bearer token (`db.sessions[token] → adminId`), converts `MockApiError` to `{status:false}`.
- `db.ts`: in-memory DB on `globalThis` (survives HMR), `now()` = **today 15:30** (demo clock, same
  as the vanilla demos), `logAudit()` (stores `actorName` snapshot), `pushAdminNotification()`, `nid()`.
- `seed.ts`: TS port of `shared/js/seed.js` (mulberry32 seed `20261008`) + extra admin data
  (applications, payouts, notifications, audit samples, settings, roles matrix `DEFAULT_ROLES_MATRIX`).
- `http.ts`: `ok`, `fail`, `MockApiError`, `requireText` (reason validation), `paginate`, `sortBy`, `matchesSearch`, `countBy`.
- `lookups.ts`: name lookups, `toOrderListItem`, status groups.
- `schema.ts`: `MockDatabase` shape (+ `StoredAdmin` with password, `Shift`, `PlatformBaseline`).

**Canonical demo data:** customer Ahmed Hassan (`cu_ahmed`, `+20 100 123 4567`, plates ABC123/KLM482);
business Carzen Wash (`biz_carzen`, owner Khaled Mansour, branches `br_nasr` Nasr City + `br_helio`);
10 businesses (8 active, `biz_dune` suspended, `biz_gate` rejected); 14 branches; 40 customers;
220 orders; ~120 reviews; 9 complaints (Pyramid Polish `biz_pyramid` has 4 open + 2 upcoming bookings
→ suspension demo); 1 transaction flagged `discrepancy` (collected 50 vs 100); a −150 EGP shift;
4 applications (`app_1..3` pending, `app_4` needs_changes); admins Sara (super), Omar (operations),
Nour (finance), Mona (support), Yasser (inactive). Headline KPIs come from `db.baseline`
(customers 12,540 · active washes 87 · branches 132 · bookings today 420 · completed 352 ·
GMV 48,500 · revenue 3,100) + live deltas (e.g. approving a wash → 88).

**Endpoints** (all under `/api/v1`, Bearer required except login):

| Domain | Endpoints |
|--------|-----------|
| Auth | `POST /admin/auth/login` · `GET /admin/auth/me` · `POST /admin/auth/logout` |
| Dashboard | `GET /admin/dashboard?period=today\|7d\|30d` |
| Washes | `GET /admin/washes` · `GET /admin/washes/:id` · `GET /admin/washes/:id/impact` · `POST …/suspend {reason,note,cancelUpcoming}` · `POST …/reactivate {note}` · `PATCH /admin/washes/:id {patch,reason}` |
| Branches | `GET /admin/branches` · `POST /admin/branches/:id/toggle {active,reason}` |
| Staff | `GET /admin/staff?role=` · `POST /admin/staff/:id/status {suspended,reason}` |
| Applications | `GET /admin/applications` · `GET /admin/applications/:id` · `POST …/approve {activateImmediately,note,checklist[6]}` · `POST …/reject {reason}` · `POST …/request-changes {note}` |
| Orders | `GET /admin/orders?status&source&payment&washId&customerId&dateFrom&dateTo` · `GET /admin/orders/:id` · `POST …/cancel {reason}` · `POST …/flag {reason}` |
| Customers | `GET /admin/customers?filter=` · `GET /admin/customers/:id` · `POST …/status {suspended,reason}` |
| Complaints | `GET /admin/complaints?status&category&assignee` · `GET /admin/complaints/:id` · `PATCH /admin/complaints/:id {status?,assignedAdminId?,note?,resolution?}` |
| Reviews | `GET /admin/reviews?filter=all\|low\|reported\|hidden` · `POST /admin/reviews/:id/visibility {hidden,reason,note?}` |
| Offers | `GET /admin/offers` · `POST /admin/offers` · `PATCH /admin/offers/:id` · `POST /admin/offers/:id/status {enabled,reason?}` |
| Finance | `GET /admin/finance/overview?period` · `GET /admin/finance/transactions?filter&washId` · `GET …/transactions/:id` · `POST …/transactions/:id/resolve {note}` · `GET/PUT /admin/finance/commission` · `GET /admin/finance/payouts` · `POST …/payouts/:id/pay {amountPaid,reference,date}` (amountPaid = running total) |
| Admins/Roles | `GET/POST /admin/admins` · `PATCH /admin/admins/:id` · `POST …/status {status,reason}` · `GET/PUT /admin/roles {matrix,reason}` |
| Platform | `GET /admin/settings` · `PUT /admin/settings/:section {value,reason}` · `GET /admin/audit` · `GET /admin/notifications?filter` · `POST …/:id/read` · `POST …/read-all` · `GET /admin/search?q` · `POST /admin/system/reset` |

List responses: `data: T[]`, `pagination` (Laravel-style snake_case), `meta` (status counts, totals…).
Business rules enforced server-side: only pending/confirmed orders can be cancelled; resolving a
complaint needs a resolution; complaint transitions map (`open→in_review/waiting/resolved`,
`in_review→waiting/resolved/open`, `waiting→in_review/resolved`, `resolved→closed/in_review`);
can't deactivate yourself or the last super admin; super column of the roles matrix is fixed;
commission 0–30%; offer percent ≤ 50%; hiding a review recomputes ratings.

## 5. Modules (`components/modules/`) and routes

| Route | Module files | Notes |
|-------|--------------|-------|
| `/login` | `Auth/LoginForm` | zod, prefilled demo, `?next=` redirect |
| `/dashboard` | `Dashboard/DashboardPageContent`, `kpi-config`, `RevenueChart` (dynamic), `BookingFunnel`, `AlertsPanel` | period switch; GMV/commission toggle (single series); dismissible alerts (localStorage) |
| `/washes`, `/washes/[id]` | `Washes/WashesPageContent`, `WashDetailsPageContent`, `SuspendWashDialog`, `EditWashDialog` | **reference module** — copy its patterns |
| `/applications`, `/applications/[id]` | `Applications/*` (`OnboardingPipeline`, `ReviewDecisionPanel`, `review-utils`) | default tab = pending; approve requires 6-item checklist → redirects to new wash |
| `/branches` | `Branches/*` (`AreaCoverage`, `ToggleBranchDialog`, `branch-status`) | coverage summary uses a separate `per_page:100` query |
| `/orders`, `/orders/[id]` | `Orders/*` (`DateRangeFilter`) | URL filters incl. `washId`, `customerId`; timeline; cancel / flag |
| `/customers`, `/customers/[id]` | `Customers/*` (`VehicleBits`: PlateChip, ColorSwatch) | suspend/reactivate |
| `/staff` | `Staff/StaffPageContent` | owners/managers/employees |
| `/complaints`, `/complaints/[id]` | `Complaints/*` (`ComplaintWorkflowCard`, `ComplaintNotes`) | workflow mirrors server transitions |
| `/reviews` | `Reviews/*` (`ReviewCard`) | card list, hide (preset + note) / restore |
| `/offers` | `Offers/*` (`OfferCard`, `OfferEditorSheet`, `BranchPicker`) | platform offers editable; wash offers read-only |
| `/finance` | `Finance/FinanceOverviewPageContent`, `FinanceChart` (dynamic, bars), `FinanceMetricCard`, `MetricInfo` | metric definition tooltips |
| `/finance/transactions` | `Finance/TransactionsPageContent`, `DiscrepancySheet` | flagged rows open the investigation sheet |
| `/finance/commission` | `Finance/CommissionPageContent` | draft edits + sticky save bar + reason |
| `/finance/payouts` | `Finance/PayoutsPageContent`, `MarkPayoutPaidDialog` | |
| `/admins` | `Admins/*` (`InviteAdminDialog`, `ChangeRoleDialog`, `RoleRadioCards`) | |
| `/roles` | `Roles/*` (`PermissionSegmented`) | none/view/manage matrix, audit can't be "manage" |
| `/settings` | `Settings/*` (5 tabs, `SettingsSaveBar`, `use-save-section`, `FormField`) | tab in `?tab=`; each tab saves its own section with a reason |
| `/audit` | `Audit/AuditPageContent` | read-only, filters, CSV |
| `/notifications` | `Notifications/NotificationsPageContent` | grouped by day |

## 6. Shared building blocks (use these, don't re-implement)

- **Layout:** `PageHeader` (title, eyebrow, meta, description, actions, back), `SectionCard`, `ListToolbar` (tabs row + search/filters/actions row).
- **Lists:** `DataTable<T>` (columns with `sortKey`, `align`, `hideBelow`; `rowHref`/`onRowClick`; skeleton/empty/error built in; `isFetching` dims rows; `rowClassName`; `footer`), `TablePagination`, `FilterTabs` (chips with counts + tones), `SearchInput` (debounced), `SelectFilter` (base-ui Select with `allLabel`), `ExportCsvButton`.
- **Display:** `StatusBadge` (meta or label+tone, `live`), `KpiCard` (delta, invertDelta, sparkline, href), `StatTile`, `Sparkline` (SVG, RTL), `InfoList`, `RatingStars`, `UserAvatar` (stable hue), `OrderTimeline`, `AuditTrail`.
- **States:** `EmptyState`, `ErrorState` (retry), `DetailSkeleton` in `states.tsx`.
- **Actions:** `ReasonDialog` (presets radio grid + required text, `minLength`, `variant="destructive"`, children slot for previews; state resets each open).
- **Hooks:** `useUrlState(defaults)` (list filters in URL; resets page on change; needs `<Suspense>`), `useAdminMutation(fn, {invalidate, onSuccess, silent})` (toast server message + invalidates domain + dashboard + audit + notifications), `useDebouncedValue`, `useNavBadges` (pending applications / open complaints), `useAuthReady`, `useLogin`, `useLogout`, `useMe`.

## 7. Design system

- Tokens in `app/globals.css` mirror `../shared/css/tokens.css`: primary `#1463FF`, aqua `#12C8B6`,
  ink `#0B1B33`, bg `#F5F8FC`, card `#FFF`, border `#E6ECF4`, blue-tinted shadows
  (`shadow-soft/raised/floating`), radius `0.75rem`; full `.dark` palette (next-themes, class strategy).
- Order status colors `--st-*` are identical across all Carzen apps.
- Chart palette `--chart-1..5` validated for color-vision deficiency (light + dark variants differ on purpose).
- Utilities: `num` (Latin font + tabular figures — use for every number/ID/money), `tone-soft/tone-dot/tone-ring` (set `--tone`), `bg-brand-gradient`, `bg-grid-faint`, `animate-pulse-ring`, `scrollbar-none`.
- `lib/constants/labels.ts` is the single source for: `ORDER_STATUS`, `PAYMENT_STATUS`, `PAYMENT_METHOD`, `ORDER_SOURCE`, `BUSINESS_STATUS`, `APPLICATION_STATUS`, `CUSTOMER_STATUS`, `COMPLAINT_STATUS/CATEGORY`, `TRANSACTION_STATUS`, `PAYOUT_STATUS`, `OFFER_STATUS`, `ADMIN_ROLE`, `STAFF_ROLE`, `SUSPEND_REASON`, `HIDE_REVIEW_REASON`, `NOTIFICATION_TYPE`, `AREAS`, `SERVICE_CATEGORY`, `AMENITY`, `VEHICLE_COLOR`, `WEEK_DAYS`, `PERMISSION_MODULES/LEVEL`, `AUDIT_ACTION/ENTITY`, `auditEntityHref`.
- UX rules: every screen has loading/empty/error/content; sensitive actions require a reason and are
  audited; destructive buttons use `bg-destructive text-white`; logical properties only (ms/me/ps/pe/start/end);
  responsive at 1440/1024/768 (sidebar collapses to icons, mobile sheet below `lg`).

## 8. Conventions & gotchas (learned while building)

1. **Data flow:** endpoint → `types/` → mock handler → `lib/services/*.service.ts` (via `getData/getPaginated/send`) → `hooks/use-*.ts` → module → thin page. Add new keys to `lib/query-keys.ts`.
2. **Pages:** `export const metadata = getStaticPageMetadata("<key>")` (add keys to `lib/config/pages.ts`); dynamic routes `await params` (Next 16: `params` is a Promise); wrap components that use `useUrlState`/`useSearchParams` in `<Suspense>`.
3. **Auth:** client-side gate (`AdminAuthGate`) like aroma's `DashboardAuthGate`; persisted stores use `skipHydration` and are rehydrated in `AuthBootstrap`. Panel content therefore renders client-side only — reading `localStorage` in a lazy `useState` initializer is safe there.
4. **base-ui (not Radix):** use `render={<Link href="…" />}` instead of `asChild`. Our `Button` sets `nativeButton={false}` automatically when `render` is passed (otherwise Base UI logs an error). `TooltipTrigger render={<div/>}` around links.
5. **Button** has a `loading` prop (spinner + disabled). Base sizes are compact (`h-8`); page-level actions use `size="lg"`.
6. **shadcn CLI quirk:** `npx shadcn add` wrote `from "cn"` and installed a bogus `cn` package — fix imports to `@/lib/utils` and uninstall `cn` after adding components.
7. **React 19 lint rules** (eslint-config-next 16): no synchronous `setState` in effects (reset dialog state by keeping it in a child that unmounts on close — see `ReasonDialog`, `CommandPalette`; or "adjust state during render" — see `SearchInput`); hook dependency arrays must be simple expressions (see `useUrlState`'s `defaultsKey`).
8. **Charts:** Recharts only via `next/dynamic` + `ssr:false`; one series per chart (never dual axis); x-axis `reversed` (RTL time flow); custom RTL tooltip.
9. **Mutations:** never add extra success toasts (handled by `useAdminMutation`); errors are toasted globally (`MutationCache`); use `meta: { skipErrorToast: true }` when showing errors inline.
10. **Mock DB** resets on dev-server restart; seed edits need a reset. Writing Arabic through curl in Git Bash sends a wrong codepage (shows `????`) — test Arabic input through the browser.
11. Screenshots in the desktop app's browser pane fail while the window is minimized — verify with `get_page_text` / console logs instead.

## 9. How to add a new module (recipe)

1. Types in `types/<domain>.ts`.
2. Mock handler `lib/mock-api/handlers/<domain>.ts` (validate with `requireText`, `logAudit` on mutations) and register it in `lib/mock-api/index.ts`.
3. Service `lib/services/<domain>.service.ts`; keys in `lib/query-keys.ts`; hook `hooks/use-<domain>.ts` (mutations via `useAdminMutation`).
4. Labels/tones in `lib/constants/labels.ts`; metadata key in `lib/config/pages.ts`; nav item in `lib/admin-nav.ts`.
5. UI in `components/modules/<Feature>/` copying `Washes/*` patterns; page in `app/(panel)/<route>/page.tsx`.
6. Verify: `npx tsc --noEmit`, `npx eslint .`, `npx next build`, open the route, check console.

## 10. Backlog / next steps

- **Reports** (Users · Washes · Bookings · Revenue · Services · Marketplace health — spec A19, AD-41/42): needs types, handler (`/admin/reports/:tab`), service, hook, module, nav item. `shared/js/services/admin.js#getMarketplaceHealth` has the original metrics.
- **Featured listings** (spec A14, AD-35).
- Branch **map view** (Leaflet, lazy-loaded).
- English locale / i18n.
- Shared polish: `definition` prop on `KpiCard`; `totalsRow` in `DataTable`; `STAFF_STATUS`, `BRANCH_STATUS`, `ADMIN_STATUS` in labels (modules currently keep local maps); keep API `errors` per field in `throwApiError`; `washId` filter on complaints; paging in `useNotifications`; document URLs + previews on applications.
- When the Laravel API arrives: point `NEXT_PUBLIC_API_URL` at it, align field names (backend may use snake_case — adapt in services, not components), then delete `lib/mock-api` and `app/api/v1`.
