# Carzen Partners (Vendor Portal) — Technical Reference

> Full context for any engineer or AI session. Read `../CLAUDE.md` (monorepo overview + history),
> `AGENTS.md` (engineering playbook from aroma) and `../super-admin/PROJECT_SUMMARY.md` §6–§8
> (shared conventions & gotchas) as well.
> Last updated: 2026-10-14. Not committed yet.

---

## 1. Summary

| Item | Detail |
|------|--------|
| Product | Daily operating dashboard for **car-wash partners** on Carzen (spec `../docs/02_cursor_prompt_car_wash_system.md` Part B, screens D1–D19, stories OW-xx / MG-xx) |
| Users | **Owner** (all branches of his business) and **Branch manager** (locked to one branch). Employees use the mobile employee app (vanilla `wash/employee`) and are rejected here |
| Locale | Arabic, RTL, Western digits, money `180 ج.م`, 12-h times — identical to the Super Admin |
| Stack | Same as `super-admin` (Next.js 16 App Router, React 19, TS, Tailwind 4, shadcn base-nova on `@base-ui/react`, TanStack Query 5, Zustand 5, axios, react-hook-form + zod 4, sonner, lucide, next-themes, cmdk, Recharts lazy) |
| Shared code | `@carzen/contracts` (types), `@carzen/ui` (design system), `@carzen/platform-api` (mock backend) — see `../CLAUDE.md` §3 |
| Backend | `/api/v1/vendor/*` namespace of the shared mock API (same DB as the Super Admin) |
| Port | 3200 (`npm run dev -w vendor-portal` or `npm run dev:platform` for both apps) |
| Brand | `SITE_NAME` "Carzen Partners", sidebar subtitle "بوابة الشركاء", login gradient aqua → blue |

## 2. Run & demo accounts

```bash
npm install                      # at the monorepo root
npm run dev:platform             # super-admin :3100 + vendor-portal :3200
npm run typecheck -w vendor-portal
npm run lint -w vendor-portal
npm run build -w vendor-portal
```

| Persona | Phone | Password | Scope |
|---------|-------|----------|-------|
| خالد منصور — Owner, Carzen Wash | `01200000000` (`+20 120 000 0000`) | `demo1234` | All branches (`br_nasr`, `br_helio`), branch switcher incl. "كل الفروع" |
| محمد عادل — Manager | `01005550102` | `demo1234` | Locked to Nasr City (`br_nasr`); services read-only unless the owner enables it |
| تامر فؤاد — Manager | `01005550201` | `demo1234` | Locked to Heliopolis (`br_helio`) |

Both personas are one-tap buttons on the login screen. Owners of washes approved from the Super Admin
can log in immediately with `demo1234` (the approval provisions the owner account).

Reset demo data: from the Super Admin user menu, or `POST /api/v1/admin/system/reset` with an admin token.

## 3. Folder structure

```
app/
  layout.tsx, globals.css (imports @carzen/ui/styles/theme.css), page.tsx (→ /dashboard), not-found.tsx
  login/page.tsx                    # public
  (portal)/layout.tsx               # PortalAuthGate → PortalSidebar + PortalTopbar + SuspensionBanner
                                    # + main + CommandPalette + NewOrderSheet (global)
  (portal)/error.tsx
  (portal)/<route>/page.tsx         # thin Server Components (metadata only)
  api/v1/[...path]/route.ts         # → handleMockRequest from @carzen/platform-api
components/
  providers/                        # app-providers, query-provider, auth-bootstrap
  shared/layout/                    # portal-auth-gate, portal-sidebar (BusinessCard), sidebar-nav,
                                    # branch-switcher, portal-topbar, notifications-menu, user-menu,
                                    # command-palette, suspension-banner
  modules/<Feature>/                # feature UI (§5)
hooks/                              # use-auth, use-branch-scope, use-vendor-mutation, use-operations,
                                    # use-catalog, use-team, use-insights, use-nav-badges
lib/
  axios.ts                          # Bearer, envelope check, 401 → clearAuth, X-Demo-Now → setServerNow
  api/request.ts, api/api-error-handler.ts, config/api-base-url.ts, cache/ttl.ts   # same as super-admin
  config/pages.ts                   # Arabic page metadata
  vendor-nav.ts                     # sidebar groups (spec B2 order), badges, ownerOnly, navFor(role)
  query-keys.ts                     # every key carries branchId → switching branch never shows stale data
  services/{auth,operations,catalog,team,insights}.service.ts
  store/auth-store.ts               # `carzen-vendor-auth-v1` (account + token, skipHydration)
  store/ui-store.ts                 # sidebarCollapsed, selectedBranchId, mobileNavOpen, commandOpen, newOrderOpen
```

## 4. Branch scope & permissions (the core concept)

- `useBranchScope()` → `{ account, branchId, singleBranchId, isAll, isLocked, branches }`.
  Owner: `branchId` = selected branch or `"all"`. Manager: always his `homeBranchId` (`isLocked`).
  Screens that need ONE branch (schedule, live board, day closing) use `singleBranchId` and offer a
  local picker to owners.
- The server re-checks everything: `scopeBranches` / `assertBranch` / `singleBranch` (managers can
  never read or write another branch), `assertOwner` (owner-only routes), `assertNotSuspended`
  (a suspended business gets **423** on new orders; the portal shows `SuspensionBanner`).
- `account.permissions` (`StaffPermissions`: confirmBooking, cancelOrder, closeShift, editServices,
  refund, collectPayment, runService, manageStaff) + `maxDiscountPct` drive which actions render.
  `allowedActions` comes from the server per order; the client mirrors it (`deriveAllowed`) for lists.
- Owner-only: branch editing & booking rules, settings, staff role/permission edits, offers editing.
  Managers edit services only when `settings.managerCanEditServices` is on (`canEdit` flag).

## 5. Modules and routes

| Route | Module | Spec | Notes |
|-------|--------|------|-------|
| `/login` | `Auth/LoginForm` | B1 | phone + password, persona buttons, `?next=` |
| `/dashboard` | `Dashboard/*` (`kpi-config`, `DashboardCharts`) | D1 | period today/7d/30d; today compares with "same time yesterday"; live branch cards, cars inside, alerts, setup checklist, charts |
| `/live` | `Live/LivePageContent` | D2 | 5-column kanban (upcoming/waiting/in service/payment pending/done), bays meter, overdue, primary action per card, auto-refresh |
| `/bookings` | `Orders/OrdersListPageContent view="bookings"` | D3 | tabs today/upcoming/completed/cancelled/no-show, bulk confirm |
| `/orders`, `/orders/[id]` | `Orders/*` (`OrderDetailsPageContent`, `actions/*`) | D4–D5 | tabs active/waiting/in service/payment pending/paid/all; CSV; details with timeline, notes, audit, locked/cancel banners |
| (global sheet) | `Orders/NewOrderSheet` | D6 | walk-in/phone, plate/phone recognition, service tiles, slot picker, server price preview |
| `/schedule` | `Schedule/*` | D7 | day capacity grid, block / unblock periods |
| `/services` | `Services/*` | D8 | primary + add-ons per branch, editor sheet |
| `/offers` | `Offers/*` | D9 | wash offers editable, Carzen offers read-only |
| `/staff` | `Staff/*` | D10 | leaderboard, profile, add/edit, permissions, weekly shifts |
| `/shifts` | `Shifts/*` | D11 | shift closings review + end-of-day reconciliation |
| `/customers`, `/customers/[id]` | `Customers/*` | D12 | segments new/returning/lost |
| `/reviews` | `Reviews/*` | D13 | one reply per review, report to Carzen |
| `/reports` | `Reports/*` | D14 | 5 report types, date range, chart + table + CSV |
| `/finance` | `Finance/*` | D15 | revenue, commission, net, pending payments, payouts |
| `/branches` | `Branches/*` | D16 | branch editor + booking rules (owner) |
| `/audit` | `Audit/*` | D17 | read-only log |
| `/notifications` | `Notifications/*` | D18 | grouped by day, preferences link |
| `/settings` | `Settings/*` | D19 | business data, permissions, notification prefs (owner) |

## 6. Order engine (server, `packages/platform-api/src/vendor/engine.ts`)

- Lifecycle: `pending → confirmed → waiting (check_in) → in_service (start: needs staff + free bay)
  → completed → paid (collect_payment)`. Plus `cancel` (reason), `no_show` (only after the grace
  window), `assign`, `add_service` (before payment), `note`, `discount` (≤ `maxDiscountPct`, stacks
  on top of the best offer), `refund` (manager/owner, reason). Cash collection requires received ≥ total.
- Prices are **always** computed server-side (`priceServices`: exactly one primary service, add-ons,
  best active offer, manual discount). The UI never sends prices.
- Numbering: app `CZ-1xxxx`, walk-in `CZ-2xxxx`, phone `CZ-3xxxx` (next: `CZ-10001`, `CZ-20045`,
  `CZ-30023`); seeded history uses `CZ-08xxx / 18xxx / 07xxx`.
- Availability: slots from branch hours + `slotInterval`, capacity = bays, blocked slots removed,
  lead time + max-advance days respected.
- Day closing locks the day's paid orders (`closedInDayId`); it's blocked while orders are
  in service or unpaid. Shift closings: `open → submitted → reviewed | flagged`.
- Every vendor mutation writes an audit entry (`actorType: "staff"`), visible in both the portal's
  audit log and the Super Admin's.

## 7. Cross-app integration (one shared DB)

| Super Admin action | Vendor portal effect |
|--------------------|----------------------|
| Approve application | Business + branch + owner account (password `demo1234`) + settings + welcome notification |
| Suspend / reactivate wash | Notification + banner; new orders rejected (423) while suspended |
| Cancel order | Order cancelled with "ألغته إدارة كارزن" + notification |
| Hide review | Notification; rating recomputed |
| Mark payout paid / change commission | Notification; finance screen updated |

| Vendor action | Super Admin effect |
|---------------|--------------------|
| Create / progress orders, collect payments | Orders list, dashboard KPIs, finance, audit log |
| Report a review | Appears in the "reported" reviews queue + admin notification |

## 8. Demo clock

The DB stores `clockAnchor {demoMs, realMs}` (seeded at today 15:30). `now()` on the server advances
in real time from that anchor; every response carries `X-Demo-Now`; the axios interceptor calls
`setServerNow()` and UI code uses `serverNow()` / `minutesSince()` / `formatRelative()` from
`@carzen/ui/lib/format` — **never `new Date()`** for "now". The seed regenerates when the calendar day
changes or `SCHEMA_VERSION` (currently 5) is bumped.

## 9. Conventions specific to this app

1. All data hooks take `branchId` from `useBranchScope()` and put it in the query key.
2. Mutations use `useVendorMutation` (toast with the server message; invalidates its domain +
   dashboard + orders + audit + notifications). No extra success toasts.
3. Order actions are rendered only through `Orders/actions/OrderActions` (primary button + menu +
   dialogs) — reuse it anywhere an order appears.
4. "New order" is a global sheet: `useUIStore((s) => s.setNewOrderOpen)(true)`.
5. Everything else (pages, states, charts, RTL, labels, ReasonDialog) follows `super-admin` §6–§8.
