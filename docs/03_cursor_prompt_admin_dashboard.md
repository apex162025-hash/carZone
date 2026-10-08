# Carzen Demo — Cursor Prompt 3 of 3: Platform Admin Dashboard

> **How to use:** create an empty repo `carzen-demo/`, copy the three spec files into `/docs`, open it in Cursor (Agent mode) and paste this whole file as one message.
> **Run order:** Prompt 1 (Customer) → Prompt 2 (Car Wash) → Prompt 3 (Admin), all in the **same repo**. Each prompt is self-contained: Part A (shared foundation) is repeated in all three; the first prompt you run creates `/shared`, the next ones reuse it.
> **This prompt builds:** `/admin` — the platform admin web dashboard (25 screens, 48 user stories, 4 admin roles).

## Your role

You are a senior product designer **and** senior front-end engineer. Build a production-quality, clickable **demo** of the **Platform Admin dashboard** for the Carzen platform using HTML, CSS and vanilla JS with mock data. Design it as if it will be shown to investors and car-wash owners next week: modern, distinctive, bilingual (Arabic RTL first), and working end to end — no dead buttons, no placeholder text.

---

# PART A — SHARED FOUNDATION

> This part is **identical** in all three Carzen demo prompts (1 Customer / 2 Car Wash / 3 Admin). The three demos live in **one repo** and share **one design system** and **one mock database**.
> - **If `/shared` already exists** (created by a previous Carzen prompt): reuse it, extend it only where needed, never fork or rewrite it.
> - **If it does not exist:** create it exactly as described here *before* building any screen.

## A1. Context

- **Carzen** = marketplace + daily operating system for car washes. Market: Egypt (Cairo). Currency: EGP.
- Three surfaces: **Customer app** (mobile), **Car Wash system** (employee mobile app + owner/manager web dashboard), **Platform Admin** (web dashboard).
- **This deliverable is a clickable, high-fidelity front-end demo with mock data.** No backend. Production will later be Flutter + Laravel; this demo is for stakeholder presentation and UX validation, so visual quality and a flawless demo flow matter more than code architecture.
- Product specs are in `/docs/01_customer_mvp.md`, `/docs/02_car_wash_mvp.md`, `/docs/03_admin_mvp.md`. **Read all three before writing code.** Where this prompt and a spec differ, **this prompt wins** (it resolves gaps and contradictions in the specs).

## A2. Tech constraints (hard rules)

1. **Static site, zero build step.** No npm install needed to run. Must work from any static server (VS Code Live Server, `npx serve`, or a plain Nginx/Apache folder).
2. **HTML5 + modern CSS + vanilla JS (ES modules).** CSS custom properties, grid/flex, container queries, **logical properties only** (`margin-inline-start`, `inset-inline-end`, `padding-block`…) so RTL/LTR flip for free.
3. **Allowed CDN libraries (latest stable, pinned in one place):** Alpine.js (state/reactivity), Lucide (icons), Chart.js (charts), Leaflet + OpenStreetMap tiles (map — stand-in for Google Maps), one small QR-code generator, Google Fonts.
4. **Not allowed:** Tailwind, Bootstrap, Material/any UI kit, React/Vue, jQuery, stock-photo hotlinks, lorem ipsum.
5. **No real integrations:** no API calls, no real auth, no real payments, no real SMS. OTP is always `123456`.
6. Each app is a small **hash-routed SPA** (`#/home`, `#/booking/CZ-10001` …) so browser back/forward and deep links work.

## A3. Repo structure

```text
carzen-demo/
├── index.html                  # Demo launcher: entry cards for every surface + "Reset demo data"
├── docs/                       # the 3 spec files + DECISIONS.md (you create it)
├── shared/
│   ├── css/
│   │   ├── tokens.css          # design tokens (A4) — the ONLY place colors/fonts/radii live
│   │   ├── base.css            # reset, typography, RTL helpers, utilities
│   │   └── components.css      # buttons, inputs, cards, chips, badges, tabs, sheets, modals,
│   │                           # tables, toasts, skeletons, empty states, steppers, avatars
│   ├── js/
│   │   ├── db.js               # mock DB: seed + localStorage + cross-tab sync (A6)
│   │   ├── services/           # fake backend: pricing, availability, orders, payments,
│   │   │                       # permissions, audit, notifications (A8)
│   │   ├── i18n.js             # AR/EN dictionaries, t(), dir switching (A5)
│   │   ├── format.js           # money, date/time, relative time, distance, plate normalization
│   │   ├── router.js           # tiny hash router with params + guards
│   │   ├── ui.js               # toast, modal, bottom sheet, confirm dialog, skeleton helpers
│   │   └── demo-bar.js         # floating demo control (A9)
│   └── assets/                 # logo.svg, illustrations, generated covers, car SVG
├── customer/                   # Prompt 1 — customer mobile app
├── wash/
│   ├── register/               # Prompt 2 — owner application wizard (public)
│   ├── employee/               # Prompt 2 — employee mobile app
│   └── dashboard/              # Prompt 2 — owner/manager web dashboard
└── admin/                      # Prompt 3 — platform admin web dashboard
```

## A4. Design system

**Direction: "clean water, precise operations".** Light, airy, generous white space, large radii, one confident blue + an aqua accent, strong typographic hierarchy, big readable numbers. It must look like a funded 2026 mobility/fintech product — **not** a generic admin template.

**Tokens (`tokens.css`) — placeholders until the official brand is supplied; rebranding must be a one-file change:**

| Group | Tokens |
|---|---|
| Primary | `--c-primary-50 #EEF4FF` · `-100 #DCE8FF` · `-600 #1463FF` · `-700 #0E4FD6` |
| Accent (aqua) | `--c-accent-100 #D5F7F3` · `--c-accent-500 #12C8B6` |
| Ink / text | `--c-ink-900 #0B1B33` · `-700 #2B3A55` · `-500 #64748B` · `-300 #CBD5E1` |
| Surfaces | `--c-bg #F5F8FC` · `--c-surface #FFFFFF` · `--c-line #E6ECF4` |
| Semantic | success `#16A34A` · warning `#F59E0B` · danger `#E5484D` · info `#0EA5E9` |
| Order status | pending `#F59E0B` · confirmed `#1463FF` · waiting `#7C5CFC` · in_service `#12C8B6` · completed `#16A34A` · cancelled `#E5484D` · no_show `#64748B` |
| Payment status | pending `#F59E0B` · paid `#16A34A` · refunded `#64748B` |
| Radius | `--r-sm 10px` (inputs) · `--r-md 16px` (cards) · `--r-lg 24px` (sheets, hero) · `--r-pill 999px` |
| Spacing | 4-px grid: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 |
| Shadow | 3 levels, soft and slightly blue-tinted (`rgba(20,99,255,.08)` family), never hard black |
| Motion | 180–240 ms `cubic-bezier(.2,.8,.2,1)`; sheets slide up; pages slide inline; respect `prefers-reduced-motion` |

- **Type:** Arabic → `IBM Plex Sans Arabic`; Latin → `Plus Jakarta Sans`; tabular numerals for prices, times, KPIs. Scale: 12 / 14 / 16 / 18 / 22 / 28 / 36.
- **Status badges** always = tinted background (status color at ~12% opacity) + colored dot + label. The same status has the **same color in all three apps**.
- **Imagery:** generate local SVG covers (gradient + abstract water/foam shapes + wash initials) and one car SVG illustration tinted by the vehicle's color. Keep them in `/shared/assets/` so real photos can replace them later.
- **Dark mode:** define `[data-theme="dark"]` token overrides; toggle lives in the demo bar. Build it last.
- **Touch targets** ≥ 44 px (≥ 48 px in the employee app). Visible focus rings. Text contrast ≥ WCAG AA.

## A5. Language & RTL

- **Arabic is the default (`<html lang="ar" dir="rtl">`)**, English available via toggle; choice persists in localStorage.
- Every UI string goes through `t('key')` in `i18n.js` — no hardcoded text in views. Mock data that is user-visible (wash names, service names, reviews, areas) carries `{ar, en}`.
- Use Western digits (0–9) in both languages. Money: `180 ج.م` / `180 EGP`. Time: 12-hour (`5:00 م` / `5:00 PM`). Distance: `1.2 كم` / `1.2 km`.
- Icons that imply direction (chevrons, arrows, back) must mirror in RTL. Never use `left/right` in CSS.

## A6. Mock database (single source of truth)

- All data lives in `localStorage['carzen_demo_db_v1']` and is accessed **only** through `shared/js/db.js` + `shared/js/services/*`. No view hardcodes data.
- **Cross-tab live sync:** listen to the `storage` event and re-render. A booking created in the Customer tab must appear within ~1 s in the Wash and Admin tabs (with a toast), and status changes made by staff must update the Customer tab live.
- **Simulated network:** every service call returns a Promise with 300–700 ms latency (so skeletons are visible). `?fast=1` disables latency. `?flaky=1` makes ~1 in 5 calls fail so error states can be demonstrated.
- **Demo clock:** `db.now()` returns **today's date at 15:30 local time** (fixed) unless `?live=1`. Everything time-related (today, availability, reminders, "14 days ago", shift times) uses `db.now()`. The demo bar can advance the clock by +30 min.
- **Reset:** `db.reset()` re-seeds everything (button on the launcher and in the demo bar).

**Entities (minimum fields):**

```text
customers      id, name, phone, avatar, status(active|suspended), createdAt, lastActiveAt
vehicles       id, customerId, make, model, year?, color, plate, plateNormalized, isDefault
businesses     id, name{ar,en}, ownerId, status(pending|approved|active|suspended|rejected),
               statusReason?, commissionRate?, rating, createdAt
branches       id, businessId, name{ar,en}, area, address{ar,en}, lat, lng, phone, photos[],
               amenities[], workingHours[7]{open,close,closed,break?}, capacity, active,
               settings{autoConfirm, slotIntervalMin, leadTimeMin, maxAdvanceDays,
                        freeCancelMin, noShowGraceMin, reminderMin}, blockedSlots[]
services       id, branchId, type(primary|addon), category, name{ar,en}, description{ar,en},
               price, durationMin, active
staff          id, businessId, branchId, name, phone, role(owner|manager|employee), status,
               maxDiscountPct, permissions{...}, scheduledShifts[]
shifts         id, staffId, branchId, scheduledStart, scheduledEnd, actualStart, actualEnd,
               ordersCompleted, expectedCash, actualCash, difference, reason?, reviewStatus
orders         id, number, code, source(app|walk_in|phone), customerId?, vehicleId?, plate,
               businessId, branchId, items[{serviceId,name,type,price,durationMin}],
               subtotal, discount{amount,pct,reason,byStaffId}?, offerId?, total, durationMin,
               scheduledAt, status, paymentStatus, paymentMethod?, assignedStaffId?,
               timeline[{status,at,byType,byId}], notes[], cancel{reason,byType,byId,at}?,
               closedInShiftId?, createdAt
payments       id, orderId, amount, method(cash|card|online), collectedBy, collectedAt, status
transactions   id, orderId, businessId, gross, commissionRate, commission, netToWash, date,
               status(pending|paid|refunded|settled)
payouts        id, businessId, periodStart, periodEnd, amountDue, amountPaid, status, reference?
reviews        id, orderId, customerId, businessId, branchId, serviceId, stars, comment, tags[],
               reply?, status(visible|hidden), hiddenReason?, createdAt
offers         id, scope(platform|wash), businessId?, branchIds[], serviceIds[], title{ar,en},
               description{ar,en}, discountType(percent|fixed), discountValue, startAt, endAt,
               status(draft|scheduled|active|expired|disabled), featured?
favorites      customerId, branchId
complaints     id, customerId, businessId, branchId, orderId, category, description,
               status(open|in_review|waiting|resolved|closed), assignedAdminId?, notes[],
               resolution?, createdAt
washApplications id, businessName, ownerName, phone, email, address, lat, lng, photos[],
               services[], workingHours[], capacity, documents[], status(pending|needs_changes|
               approved|rejected), reviewNote?, submittedAt
adminUsers     id, name, email, role(super|operations|finance|support), status
notifications  id, audience(customer|staff|owner|admin), userId, type, title{ar,en},
               body{ar,en}, link, read, createdAt
auditLogs      id, actorType, actorId, action, entity, entityId, branchId?, oldValue, newValue,
               reason?, at
catalogs       areas[], serviceCategories[], amenities[]
settings       defaultCommissionPct(7), bookingDefaults{...}, legal{terms,privacy}, support{...}
counters       nextAppBooking, nextWalkIn, bookingCodes[]
platformBaseline  customers, activeWashes, branches, bookingsToday, completedToday,
               gmvToday, platformRevenueToday
```

**Seed volume:** 10 businesses (8 active, 1 suspended, 1 rejected) with 14 branches across Nasr City, Heliopolis, New Cairo, Maadi, Zamalek, Mohandessin, Sheikh Zayed, 6th of October (realistic coordinates) · 3 pending wash applications · 40 customers · 55 vehicles · ~220 orders over the last 30 days (≈55% app, 35% walk-in, 10% phone; realistic status mix incl. cancelled and no-show) · ~120 reviews · 6 offers · 9 complaints in mixed statuses · ~60 audit-log entries · 4 admin users (one per role) · notifications for every audience. Wash names are fictional.

**Canonical demo records — must exist exactly like this:**

| Record | Value |
|---|---|
| Customer | **Ahmed Hassan**, `+20 100 123 4567` |
| His vehicles | Toyota Corolla 2021 · White · `ABC123` (default) — Kia Sportage 2023 · Black · `KLM482` |
| Business / owner | **Carzen Wash** — owner **Khaled Mansour** |
| Demo branch | **Carzen Wash – Nasr City** · capacity **6** bays · open daily 09:00–00:00 · rating 4.8 · `autoConfirm = false` · `slotIntervalMin 30` · `leadTimeMin 15` · `maxAdvanceDays 7` · `freeCancelMin 60` · `noShowGraceMin 15` · `reminderMin 45` |
| Second branch | Carzen Wash – Heliopolis |
| Services (demo branch) | Exterior Wash 100 EGP / 20 min · Interior Wash 100 / 25 · Interior + Exterior 180 / 40 · Deep Cleaning (Steam) 300 / 60 |
| Add-ons (demo branch) | Tire Cleaning +30 / 5 min · Air Freshener +20 / 2 min · Wax Polish +60 / 15 min |
| Staff (demo branch) | **Ahmed Samir** — Employee, shift 09:00–17:00, max discount 10% · **Mohamed Adel** — Branch Manager, max discount 20% · 3 more employees |
| Demo-branch counters at seed | Waiting 3 · In Service 4 · Completed today 18 · Payment pending 1 |
| Admin users | **Sara Nabil** — Super Admin · **Omar Fathy** — Operations · **Nour Salem** — Finance · **Mona Adel** — Support |
| Demo logins | Customer: any phone + OTP `123456` · Staff: phone + password `demo1234` · Admin: email + password `demo1234` (all prefilled, one tap) |
| Ahmed Hassan's history | 7 completed orders at the demo branch, last one **14 days ago**, usual service Interior + Exterior, total spent 1,260 EGP |
| Seeded edge cases | one active wash (not Carzen Wash) with 4 complaints and 2 upcoming bookings · one transaction flagged `discrepancy` (order total ≠ payment collected) · one 1-star review reported by its wash · one shift closing with a −150 EGP cash difference |
| Counters | next app booking = **`CZ-10001`** with code **`5K8P2`** · next walk-in = **`CZ-20045`** (seeded history uses lower numbers) |
| Guaranteed slot | **Today 5:00 PM** at the demo branch has ≥ 1 free bay |
| Admin baseline KPIs | Customers 12,540 · Active washes 87 · Branches 132 · Bookings today 420 · Completed 352 · GMV 48,500 EGP · Platform revenue 3,100 EGP |

Admin headline KPIs = `platformBaseline` + deltas from records created after seeding (so a new demo booking visibly increments them). Lists show the seeded records.

## A7. Unified status model (resolves the spec inconsistency)

Two **separate** fields on every order:

- `status`: `pending → confirmed → waiting → in_service → completed` · terminal: `cancelled`, `no_show`
- `paymentStatus`: `pending → paid → refunded`
- "Closed" is **not** a status: an order is closed when it is `completed` + `paid` + included in a closed shift (`closedInShiftId`).
- "Payment Pending" counter = `completed` AND `paymentStatus = pending`.

| Status | Customer label (AR / EN) | Staff label (AR / EN) |
|---|---|---|
| pending | قيد المراجعة / Pending review | بانتظار التأكيد / Pending |
| confirmed | تم التأكيد / Confirmed | مؤكد / Confirmed |
| waiting | تم الوصول / Arrived | في الانتظار / Waiting |
| in_service | جارٍ تنفيذ الخدمة / In service | جارٍ التنفيذ / In service |
| completed | اكتملت الخدمة / Completed | مكتمل / Completed |
| cancelled | تم الإلغاء / Cancelled | ملغي / Cancelled |
| no_show | لم يحضر العميل / No show | لم يحضر / No show |

| Transition | Trigger | Who |
|---|---|---|
| new **app** booking → `pending` (or `confirmed` if `branch.settings.autoConfirm`) | customer confirms booking | Customer |
| new **phone** booking → `confirmed` | manual booking form | Staff |
| new **walk-in** → `waiting` | walk-in form | Staff |
| `pending → confirmed` | Confirm | Manager / Owner / Employee if permitted |
| `confirmed → waiting` | Check-in (QR, code or number) → "Confirm arrival" — allowed any time on the booking day (early arrival is fine) | Staff |
| `waiting → in_service` | Start service — needs a free bay and an assigned employee | Staff |
| `in_service → completed` | Complete service | Staff |
| `pending/confirmed → cancelled` | customer (inside policy) · staff with permission · admin (reason required) | — |
| `waiting → cancelled` | reason required | Manager / Owner |
| `confirmed → no_show` | allowed after `noShowGraceMin` past the slot | Staff |
| payment `pending → paid` | Collect payment (order must be `completed`) | Staff |
| payment `paid → refunded` | reason required | Manager / Owner |

The booking **number** exists from creation; the **QR + short code** are revealed when the booking becomes `confirmed`.

## A8. Fake-backend rules (enforced in `shared/js/services`, never in views)

1. **Price** is always computed by `pricing` from configured services, add-ons, offers and discounts. No UI can type a price.
2. **Availability** = slots every `slotIntervalMin` inside working hours where, for the whole `[start, start + duration)`, overlapping active orders `< capacity`; start ≥ `now + leadTimeMin`; not in `blockedSlots`; branch active and business `active`.
3. **Permissions**: `permissions.can(actor, action, scope)` implements the wash matrix (spec 02 §4) and the admin roles (spec 03 §27). The UI hides what the actor can't do **and** the service rejects it.
4. **Audit**: every mutation (create order, status change, price/config change, discount, cancel, payment, refund, shift close, every admin intervention) appends to `auditLogs` with who / what / when / old / new / reason.
5. **Notifications**: mutations create notification records for the right audiences (customer, staff, owner, admin).
6. **Plate normalization**: uppercase, strip spaces and dashes; used to detect existing vehicles.

## A9. Demo bar (all apps)

A small floating pill (bottom, inline-start, collapsible, hidden with `?present=1`): switch surface (Customer / Employee / Wash dashboard / Admin) · switch persona inside the current app · language AR/EN · light/dark · advance demo clock +30 min · toggle flaky network / offline · reset demo data · **simulators** for when another surface isn't built yet or isn't open: "Simulate app booking" (creates the next `CZ-1xxxx` booking for Ahmed Hassan at the demo branch) and "Advance order" (moves a chosen order to its next status as Ahmed Samir).

## A10. Quality bar

- **Every screen implements 4 states:** loading (skeleton), empty (illustration + explanation + useful CTA), error (human message + Retry), offline (banner + cached data where possible).
- **No dead UI.** Every button, tab, filter and link works against the mock DB. If something is truly out of demo scope, hide it — don't fake it.
- Forms validate inline with clear messages in the current language; destructive actions ask for confirmation.
- Web dashboards: fluid from 1024 px up, usable at 768 px. Mobile apps: rendered inside a 390 × 844 phone frame on desktop, full-bleed below 480 px.
- No console errors. No layout shift when data loads. RTL and LTR both pixel-clean.

## A11. How to work (instructions to the agent)

1. Read the three specs and this whole prompt first. Then write a short build plan.
2. **Do not stop to ask questions.** When something is undefined, choose the most sensible option, and log it in `/docs/DECISIONS.md` (one line each: decision + reason).
3. Build in the order given in "Build order". Finish and self-test each phase before the next.
4. When done, walk the **Demo script** end to end in both languages, then go through the **Definition of Done** checklist and report the result as a pass/fail table with notes.

---

# PART B — PLATFORM ADMIN DASHBOARD (`/admin`)

## B1. What you are building

The Carzen platform back-office. The admin **manages the marketplace** — approving washes, overseeing users, monitoring bookings and orders, moderating reviews, resolving complaints, running platform offers, and tracking GMV and commission. The admin **does not operate individual washes**: business-owned values (prices, hours, staff) are view-only by default, and any intervention requires a reason and leaves an audit record.

- **Layout:** desktop web. Collapsible sidebar (grouped navigation) + top bar (global search with `Ctrl/⌘ K`, notifications, language, user menu). Content max-width fluid; tables are the workhorse — make them excellent: sticky header, column sort, filters row, saved quick-filter chips, pagination, row hover actions, bulk selection where useful, CSV export.
- **Detail pattern:** list → right-side drawer for quick view → full detail page with tabs for deep work.
- **Tone:** calmer and denser than the wash dashboard; same tokens and components. Charts via Chart.js using the token palette.

**Personas (switchable from the demo bar; each with a prefilled login):**

| Persona | Role | Can access |
|---|---|---|
| Sara Nabil | Super Admin | Everything |
| Omar Fathy | Operations Admin | Dashboard, Car washes, Applications, Branches, Bookings/Orders, Complaints, Reports (ops) |
| Nour Salem | Finance Admin | Dashboard, Financials, Transactions, Commission, Payouts, Reports (revenue), Bookings (read-only) |
| Mona Adel | Support Admin | Dashboard, Customers, Complaints, Reviews, Bookings (read-only) |

Sidebar items the role can't access are hidden; direct URLs show a "No access" page; `permissions` rejects the action anyway.

## B2. Navigation & screens

```text
Dashboard
Users            → Customers · Owners · Employees
Car Washes       → All · Pending applications · Active · Suspended · Rejected
Branches
Bookings / Orders
Reviews
Complaints
Offers           → Platform offers · Featured listings
Financials       → Overview (GMV) · Transactions · Commission · Payouts
Reports          → Users · Washes · Bookings · Revenue · Services · Marketplace health
Notifications
Admin Users · Roles & Permissions
Settings
Audit Log
```

| # | Screen | Route |
|---|---|---|
| A1 | Login | `#/login` |
| A2 | Dashboard | `#/dashboard` |
| A3 | Customers list / details | `#/customers`, `#/customers/:id` |
| A4 | Owners list | `#/owners` |
| A5 | Employees list | `#/employees` |
| A6 | Car washes list (status tabs) | `#/washes?status=` |
| A7 | Wash details (tabs) | `#/washes/:id` |
| A8 | Application review | `#/applications/:id` |
| A9 | Branches list / details | `#/branches`, `#/branches/:id` |
| A10 | Bookings & orders list / details | `#/orders`, `#/orders/:id` |
| A11 | Reviews list / details | `#/reviews`, `#/reviews/:id` |
| A12 | Complaints list / details | `#/complaints`, `#/complaints/:id` |
| A13 | Platform offers list / editor | `#/offers`, `#/offers/:id` |
| A14 | Featured listings | `#/featured` |
| A15 | Financial overview | `#/finance` |
| A16 | Transactions list / details | `#/finance/transactions` |
| A17 | Commission settings | `#/finance/commission` |
| A18 | Payouts | `#/finance/payouts` |
| A19 | Reports (6 tabs) | `#/reports/:tab` |
| A20 | Notifications | `#/notifications` |
| A21 | Admin users | `#/admins` |
| A22 | Roles & permissions | `#/roles` |
| A23 | Settings | `#/settings` |
| A24 | Audit log | `#/audit` |
| A25 | Global search results | overlay / `#/search?q=` |

## B3. User stories

Format: **ID [priority] (roles)** — story → acceptance criteria. Roles: **SA** Super, **OP** Operations, **FI** Finance, **SU** Support. `[M]` must, `[S]` should.

### Epic 1 — Access & security

- **AD-01 [M] (all)** — As an admin, I want to log in with email and password. → AC: validation, wrong-credentials error, suspended admin rejected; "2FA — coming later" shown disabled.
- **AD-02 [M] (all)** — As an admin, I see only what my role allows. → AC: sidebar, buttons and routes filtered by `permissions`; verified for all 4 personas.
- **AD-03 [S] (all)** — As an admin, my session expires after inactivity. → AC: simulated timeout modal after 15 min idle ("Stay signed in" / "Log out"); triggerable from the demo bar.

### Epic 2 — Platform dashboard

- **AD-04 [M] (all)** — As an admin, I want platform KPIs at a glance. → AC: cards — Total customers, Active customers, Total car washes, Active car washes, **Pending applications**, Total branches, Bookings today, Completed today, Cancelled today, GMV, Platform revenue. Seed values: Customers **12,540** · Active washes **87** · Branches **132** · Bookings today **420** · Completed **352** · GMV **48,500 EGP** · Platform revenue **3,100 EGP** · Pending applications **3**. Each card has a delta vs yesterday and a sparkline, and links to its list.
- **AD-05 [M] (all)** — As an admin, I want KPIs to reflect live activity. → AC: a booking created in the Customer app (other tab) increments "Bookings today" within ~1 s; completing and paying it in the Wash app increments Completed, GMV (+180) and Platform revenue (+12.60 at 7%).
- **AD-06 [M] (all)** — As an admin, I want to see the booking funnel. → AC: funnel chart Created → Confirmed → Arrived → In service → Completed, with Cancelled and No-show shown as drop-offs; period switcher Today / 7 d / 30 d.
- **AD-07 [M] (SA, FI)** — As an admin, I want revenue trends. → AC: GMV and commission line chart (today by hour, week, month) + totals.
- **AD-08 [M] (all)** — As an admin, I want alerts for what needs action. → AC: alert panel — new wash applications, washes with high complaint count, suspension requests, payment discrepancies, unusual cancellation rate; each alert deep-links to the entity; dismiss / snooze.
- **AD-09 [M] (SA, OP)** — As an admin, I want a platform health summary. → AC: active users, active washes, active branches, today's bookings, plus a "Top washes today" and "Needs attention" mini-table.

### Epic 3 — Users

- **AD-10 [M] (SA, SU)** — As an admin, I want to browse and find customers. → AC: columns — name, phone, status, vehicles, bookings, completed bookings, last active, created; quick filters Active / Suspended / New (last 7 days) / High activity; search by name, phone, plate.
- **AD-11 [M] (SA, SU)** — As an admin, I want a customer's full picture. → AC: tabs — Profile (name, phone, status, created) · Vehicles (make, model, color, plate) · Bookings (number, wash, branch, service, date, status, amount) · Reviews · Complaints · Activity timeline.
- **AD-12 [M] (SA, SU)** — As an admin, I want to suspend or reactivate a customer. → AC: reason required; status badge changes; a suspended customer can't log in or book in the Customer app (shows a "account suspended" message); audited.
- **AD-13 [M] (SA, OP)** — As an admin, I want to see owners and wash employees. → AC: Owners list (name, phone, business, branches, status); Employees list (name, role, business, branch, status); read-only except suspend/reactivate with reason.

### Epic 4 — Wash onboarding

- **AD-14 [M] (SA, OP)** — As an admin, I want a queue of pending applications. → AC: Pending tab with count badge (3 at seed), sorted oldest first with "waiting 2 days" age; live-updates when an owner submits from the registration wizard.
- **AD-15 [M] (SA, OP)** — As an admin, I want to review an application thoroughly. → AC: review page with sections — Business & owner, Branch & map (Leaflet pin), Photos (gallery), Services (prices/durations), Working hours, Capacity, Documents; a checklist of review items the admin ticks; an internal notes field.
- **AD-16 [M] (SA, OP)** — As an admin, I want to approve an application. → AC: Approve → creates business (status `approved` → `active` once the owner completes setup; in the demo, a toggle "Activate immediately" defaults on), branch, services and owner account; owner is notified; the wash becomes visible in the Customer app; audit entry; Pending count decrements.
- **AD-17 [M] (SA, OP)** — As an admin, I want to reject or request changes. → AC: Reject requires a reason (shown to the owner); "Request changes" sends a note and sets `needs_changes`; both audited.
- **AD-18 [M] (SA, OP)** — As an admin, I want to see the onboarding pipeline. → AC: a mini-kanban or stepper summary: Submitted → Pending review → Approved → Onboarding → Active, with counts.

### Epic 5 — Car washes & branches

- **AD-19 [M] (SA, OP)** — As an admin, I want to browse washes. → AC: status tabs All / Pending / Active / Suspended / Rejected; columns — business, owner, branches, status, rating, bookings, created, last activity; filters — area, rating, activity, branch count.
- **AD-20 [M] (SA, OP)** — As an admin, I want a complete wash profile. → AC: tabs — Business (name, owner, contact, status + history) · Branches (location, hours, capacity, status) · Services (price, duration, active) · Employees (role, branch, status) · Bookings (total, completed, cancelled, no-show + list) · Reviews (average, recent) · Revenue (gross service value, commission, payout status) · Complaints · Audit.
- **AD-21 [M] (SA, OP)** — As an admin, I want to suspend a wash. → AC: reason picker (repeated complaints, incorrect information, operational issue, policy violation, owner request) + note; effect is immediate — hidden from customer discovery, **cannot receive new bookings**; existing upcoming bookings are listed with the option to leave or cancel them; owner notified; audited.
- **AD-22 [M] (SA, OP)** — As an admin, I want to reactivate a suspended wash. → AC: note required; visibility and bookings restored.
- **AD-23 [M] (SA, OP)** — As an admin, I want to oversee branches. → AC: list with map/list toggle (all branches on a Leaflet map, colored by status); columns — branch, business, area, capacity, status, today's orders, rating; branch details page; activate/deactivate with reason.
- **AD-24 [M] (SA)** — As an admin, I can correct business-owned data only with a documented reason. → AC: wash/branch/service fields are read-only by default; "Edit as admin" unlocks them behind a reason modal; old → new values recorded in the audit log and shown in the wash's Audit tab.

### Epic 6 — Bookings & orders monitoring

- **AD-25 [M] (all)** — As an admin, I want to see every booking and order on the platform. → AC: columns — number, source, customer, wash, branch, service, scheduled, status, payment, amount; filters — date range, status, wash, branch, customer, **source** (App / Walk-in / Phone), payment status; live-updates.
- **AD-26 [M] (all)** — As an admin, I want to inspect the full story of one order. → AC: booking number, customer, vehicle, wash, branch, services, amount, discount, payment status/method, booking status, employee; **operational timeline** with created / confirmed / arrived / started / completed / paid times and durations between steps; related review, complaint and audit entries linked.
- **AD-27 [M] (SA, OP)** — As an admin, I want to intervene when necessary. → AC: Cancel booking (pending/confirmed only, reason required, customer and wash notified); "Correct data" for non-financial fields (reason required); completed financial transactions **cannot be edited** — the UI explains this and offers "Flag for finance review" instead; all audited.

### Epic 7 — Reviews moderation

- **AD-28 [M] (SA, SU)** — As an admin, I want to monitor reviews. → AC: columns — stars, comment, customer, wash, branch, service, date, status; filters — low ratings (≤ 2), reported by wash, hidden, date; each review links to its completed booking.
- **AD-29 [M] (SA, SU)** — As an admin, I want to hide abusive reviews and restore them if hidden by mistake. → AC: Hide requires a reason (abusive language, spam, off-topic, personal data); hidden reviews disappear from the Customer app and the wash's rating is recalculated; Restore reverses both; audited.

### Epic 8 — Complaints & support

- **AD-30 [M] (SA, OP, SU)** — As an admin, I want a complaints inbox. → AC: columns — ticket, customer, wash, branch, booking, category, status, assigned admin, age; status tabs Open / In review / Waiting / Resolved / Closed with counts; filters — category, assignee, wash; complaints created in the Customer app appear live.
- **AD-31 [M] (SA, OP, SU)** — As an admin, I want everything I need to resolve a complaint on one page. → AC: description and category; customer card; **linked booking with its timeline**; wash card with its complaint history and rating; internal notes thread; status control; assignee selector.
- **AD-32 [M] (SA, OP, SU)** — As an admin, I want to work a complaint through its lifecycle. → AC: assign to me/another admin; move Open → In review → Waiting → Resolved → Closed; a **resolution note is required** to resolve; the customer is notified and sees the status on their booking; every change audited.
- **AD-33 [S] (SA, OP)** — As an admin, I want to spot problem washes. → AC: complaint-rate indicator per wash; washes above a threshold are raised in dashboard alerts with a "Review wash" shortcut.

### Epic 9 — Offers & featured listings

- **AD-34 [M] (SA, OP)** — As an admin, I want to run platform promotions. → AC: fields — title (AR/EN), description, discount type (percent/fixed) and value, start/end date, applicable washes / branches / services; statuses Draft / Scheduled / Active / Expired / Disabled computed from dates + manual disable; active offers appear in the Customer app and are applied by `pricing`.
- **AD-35 [M] (SA, OP)** — As an admin, I want to feature a wash. → AC: pick wash/branch, placement (Home — nearby top / Search top), start/end date; featured items show a clear **"مُروَّج / Sponsored"** label in the Customer app; list of current and scheduled placements.

### Epic 10 — Financials

- **AD-36 [M] (SA, FI)** — As an admin, I want a financial overview. → AC: GMV (completed + paid orders), platform revenue (commission), wash earnings (net), refunds; period switcher; charts by day; top washes by GMV; a definitions tooltip on each metric.
- **AD-37 [M] (SA, FI)** — As an admin, I want a transaction ledger. → AC: columns — date, order, wash, gross, commission rate, **commission**, **net to wash**, method, status (Pending / Paid / Refunded / Settled); filters; row opens the related order and audit trail; totals row; CSV export.
- **AD-38 [M] (SA, FI)** — As an admin, I want to configure commission. → AC: default commission **7%**; optional per-wash override; change requires confirmation + reason, applies to future transactions only, audited; a "Plans (Free 10% / Pro 5%) — future" teaser shown disabled.
- **AD-39 [M] (SA, FI)** — As an admin, I want to track payouts manually. → AC: per wash — amount due, amount paid, pending, last payout, reference; "Mark as paid" modal (amount, date, reference) settles the related transactions; payout history.
- **AD-40 [M] (SA, FI)** — As an admin, I want to investigate discrepancies. → AC: seed one transaction flagged "discrepancy" (order total ≠ payment collected); a "Discrepancies" quick filter; from it open the order, its payment and its audit trail side by side; mark as reviewed with a note.

### Epic 11 — Reports & marketplace health

- **AD-41 [M] (role-scoped)** — As an admin, I want standard reports. → AC: **Users** (new, active) · **Washes** (new, active, suspended, top performers) · **Bookings** (total, completed, cancelled, no-show, completion rate) · **Revenue** (GMV, commission) · **Services** (most booked, revenue by service); date range + area + wash filters; chart + table; CSV export.
- **AD-42 [M] (SA, OP)** — As an admin, I want marketplace health metrics. → AC: **Supply** (active washes, active branches, available slots today) · **Demand** (active customers, searches, wash views, booking starts, completed) · **Conversion** funnel Wash view → Booking started → Completed with percentages · **Retention** (repeat customer rate, repeat booking rate) · **Quality** (average rating, complaint rate, cancellation rate, no-show rate); each with a trend arrow and a one-line plain-language interpretation.

### Epic 12 — Admin users, settings, audit, search, notifications

- **AD-43 [M] (SA)** — As a super admin, I want to manage admin accounts. → AC: list (name, email, role, status, last login); invite/create, change role, deactivate; cannot deactivate myself or remove the last super admin.
- **AD-44 [M] (SA)** — As a super admin, I want to see and adjust what each role can do. → AC: roles × modules matrix (view / manage) for Super, Operations, Finance, Support; toggles persist and take effect immediately in the sidebar of the affected persona.
- **AD-45 [M] (SA)** — As a super admin, I want platform settings. → AC: tabs — General (name, support phone/email, currency) · Catalogs (areas, service categories, amenities — add/rename/disable; reflected in the Customer app filters) · Booking defaults (lead time, cancel window, no-show grace, reminder) · Legal (terms, privacy — editable text shown in the Customer app) · Notification templates (read-only preview AR/EN).
- **AD-46 [M] (all)** — As an admin, every sensitive action I take is recorded. → AC: Audit log columns — admin, action, entity, entity ID, old state, new state, reason, timestamp; filters by admin, action, entity type, date; row links to the entity; **no edit or delete controls exist**; includes seeded examples ("Sara Nabil — Suspended Wash #88 — Reason: Multiple complaints", "Mona Adel — Removed Review #182 — Reason: Abusive content").
- **AD-47 [M] (all)** — As an admin, I want to find anything from one search box. → AC: `Ctrl/⌘ K` palette searching customers (name, phone), plates, wash names, branches, booking/order numbers; grouped results with keyboard navigation; results limited to modules my role can open.
- **AD-48 [M] (all)** — As an admin, I want notifications relevant to my role. → AC: new wash application, new complaint, critical review (1–2 stars), payment issue, unusual activity, system alert; bell with unread count; list page with filters; deep links.

## B4. Additions beyond the spec (deliberate — keep them)

| Addition | Why |
|---|---|
| "Request changes" on applications (`needs_changes`) | Real reviews are rarely a binary approve/reject |
| Review checklist + internal notes on applications | Makes approval decisions consistent and auditable |
| Suspension impact preview (upcoming bookings) | Spec says a suspended wash can't take new bookings but ignores existing ones |
| "Edit as admin" unlock with mandatory reason | Implements "avoid editing business-owned values without a documented reason" |
| "Flag for finance review" instead of editing completed transactions | Implements "no silent edits of financial transactions" |
| Seeded discrepancy + side-by-side investigation view | Needed by demo scenario 4 in the spec |
| Per-wash commission override | Small step toward the Free/Pro model without building plans |
| Catalog management (areas, categories, amenities) | Customer filters and wash forms need a source of truth |
| Branches map view | Fastest way to judge supply coverage by area |
| Roles × modules matrix editor | Spec defines roles but no screen to manage them |
| Plain-language interpretation on health metrics | Makes the dashboard presentable to non-technical stakeholders |

## B5. Out of scope — do not build

Real 2FA, real payout processing or bank integration, subscription-plan billing, automated fraud detection, CMS beyond the legal texts, real email/SMS/push delivery.

## B6. Build order

1. Shared foundation (Part A) — skip if `/shared` exists.
2. Admin shell: sidebar, top bar, router, role guard, persona switch, table + drawer + filter components.
3. Login, Dashboard (KPIs, funnel, revenue, alerts).
4. Car washes list + details, Applications queue + review + approve/reject/request changes.
5. Branches (list, map, details).
6. Bookings/Orders list + details + interventions.
7. Customers, Owners, Employees.
8. Complaints, Reviews.
9. Offers, Featured listings.
10. Financials: overview, transactions, commission, payouts, discrepancies.
11. Reports + Marketplace health.
12. Admin users, Roles & permissions, Settings, Audit log, Global search, Notifications.
13. Polish: states, RTL/LTR audit, dark mode.

## B7. Demo scripts (must work perfectly, in Arabic and in English)

**Scenario 1 — Approve a new wash.** Login as Sara Nabil → Dashboard shows Pending applications **3** → open the oldest application → review business, branch map, services, hours → tick checklist → Approve (activate immediately) → Pending becomes 2, Active washes 88 → open the Customer app tab: the new wash is discoverable.

**Scenario 2 — Monitor a booking live.** Customer creates `CZ-10001` in another tab → it appears at the top of Bookings as Pending, "Bookings today" → 421 → wash confirms, checks in, starts, completes, marks paid → the order's timeline fills in live → Completed 353, GMV 48,680, Platform revenue 3,112.60.

**Scenario 3 — Resolve a complaint.** Switch to Mona Adel (Support) → Complaints → open an Open ticket → read description → open linked booking timeline → check the wash's complaint history → assign to me → In review → add an internal note → write a resolution → Resolved → customer notified → the Audit log shows each step.

**Scenario 4 — Financial monitoring.** Switch to Nour Salem (Finance) → Financials: GMV and commission → Transactions → "Discrepancies" filter shows 1 → open it → order, payment and audit trail side by side → mark reviewed with a note.

**Scenario 5 — Suspend a wash.** As Omar Fathy (Operations) → open a wash with several complaints → Suspend → reason "Repeated complaints" → impact preview lists 2 upcoming bookings → confirm → the wash disappears from the Customer app and its details page shows "غير متاح حالياً" → audit entry created.

**Scenario 6 — Roles.** Switch through the 4 personas and show how the sidebar changes; open a Finance URL as Support → "No access".

## B8. Definition of Done

- [ ] All screens A1–A25 reachable; no dead controls.
- [ ] All `[M]` stories pass; `[S]` done or listed as not done.
- [ ] All 6 demo scenarios pass in AR and EN.
- [ ] Role scoping verified for the 4 personas (sidebar, routes, actions).
- [ ] Every admin mutation requires a reason where specified and writes an audit entry; the audit log has no edit/delete.
- [ ] KPI math is consistent: baseline + live deltas; commission = gross × rate; net = gross − commission; table totals match the cards.
- [ ] Suspending a wash / hiding a review / approving an application is reflected in the Customer app immediately.
- [ ] Tables: sort, filter, paginate, export on every list.
- [ ] 4 states on every data screen; RTL/LTR verified; no console errors.
- [ ] `/docs/DECISIONS.md` updated.
