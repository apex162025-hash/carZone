# Carzen Demo — Cursor Prompt 2 of 3: Car Wash System

> **How to use:** create an empty repo `carzen-demo/`, copy the three spec files into `/docs`, open it in Cursor (Agent mode) and paste this whole file as one message.
> **Run order:** Prompt 1 (Customer) → Prompt 2 (Car Wash) → Prompt 3 (Admin), all in the **same repo**. Each prompt is self-contained: Part A (shared foundation) is repeated in all three; the first prompt you run creates `/shared`, the next ones reuse it.
> **This prompt builds:** `/wash` — partner registration, employee mobile app, owner/manager web dashboard (Employee, Branch Manager and Owner stories).

## Your role

You are a senior product designer **and** senior front-end engineer. Build a production-quality, clickable **demo** of the **Car Wash operating system** (employee app + owner/manager dashboard + partner registration) for the Carzen platform using HTML, CSS and vanilla JS with mock data. Design it as if it will be shown to investors and car-wash owners next week: modern, distinctive, bilingual (Arabic RTL first), and working end to end — no dead buttons, no placeholder text.

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

# PART B — CAR WASH SYSTEM (`/wash`)

## B1. What you are building

The daily operating system of a car wash. Three connected surfaces sharing the same data:

| Surface | Path | Users | Form factor |
|---|---|---|---|
| **Partner registration** | `/wash/register` | A wash owner applying to join Carzen | Responsive web wizard |
| **Employee app** | `/wash/employee` | Employee (and manager on the floor) | Mobile, in a 390 × 844 phone frame |
| **Wash dashboard** | `/wash/dashboard` | Owner, Branch Manager | Desktop web, sidebar layout |

**Core principle — "No Service Without Order":** every car that enters the wash has a Service Order, whatever its source (app booking / walk-in / phone). The whole UI must reinforce this: the walk-in button is the most prominent control in the employee app, and the owner can see every car inside the branch remotely.

**Personas (switchable from the demo bar, each with a prefilled login):**

| Persona | Role | Scope | Lands on |
|---|---|---|---|
| Khaled Mansour | Owner | All branches of Carzen Wash | Dashboard — all branches |
| Mohamed Adel | Branch Manager | Nasr City only | Dashboard — Nasr City (branch switcher locked) |
| Ahmed Samir | Employee | Nasr City, shift 09:00–17:00, max discount 10% | Employee app |

**UX principles:** employee UI is action-first — big targets (≥ 48 px), one obvious primary button per card, minimal typing, usable with wet hands and in sunlight (high contrast, large type). Owner UI is detail-first — dense but calm tables, KPIs, charts. Financial controls are clear but never block normal work.

## B2. Screens

**Partner registration (`/wash/register`)** — 5-step wizard: Business & owner → Branch & location (Leaflet pin) → Services & prices → Working hours & capacity → Photos & documents → Review & submit → "Application under review" status page.

**Employee app (`/wash/employee`)** — bottom nav: اليوم Today · الطلبات Orders · **＋ (center FAB: New walk-in)** · الوردية Shift · حسابي Me.

| # | Screen | Route |
|---|---|---|
| E1 | Login (phone + password) | `#/login` |
| E2 | Start-shift gate | `#/shift/start` |
| E3 | Home / Today | `#/home` |
| E4 | Orders list (tabs: Upcoming · Waiting · In service · Completed · All) | `#/orders` |
| E5 | Order details | `#/order/:id` |
| E6 | New walk-in | `#/walk-in` |
| E7 | Customer / vehicle recognition | inside E6 and E11 |
| E8 | Service picker (primary + add-ons) | sheet |
| E9 | Check-in: QR scanner · code entry · number search | `#/check-in` |
| E10 | Collect payment | sheet |
| E11 | Manual phone booking | `#/phone-booking` |
| E12 | Add extra service (upsell) | sheet |
| E13 | Apply discount | sheet |
| E14 | Cancel / no-show | sheet |
| E15 | Shift: current summary + End shift & cash count | `#/shift` |
| E16 | Notifications | `#/notifications` |
| E17 | My profile & performance | `#/me` |

**Wash dashboard (`/wash/dashboard`)** — sidebar: Dashboard · Live operations · Bookings · Orders · Schedule · Services · Offers · Employees · Shifts & closing · Customers · Reviews · Reports · Financials · Branches · Audit log · Notifications · Settings. Top bar: branch switcher, date, global search (plate / phone / order number), notifications, user menu.

| # | Screen | Notes |
|---|---|---|
| D1 | Login | Email/phone + password |
| D2 | Dashboard | KPIs, live branches, alerts, charts |
| D3 | Live operations | Bay board / active cars (kanban) |
| D4 | Bookings | Tabs: Today · Upcoming · Completed · Cancelled · No show |
| D5 | Orders | Tabs: Active cars · Waiting · In service · Completed; filters |
| D6 | Order details | Drawer with full timeline + audit |
| D7 | Schedule | Day view: capacity lanes × time, block/unblock slots |
| D8 | Services | CRUD, price, duration, active, add-ons |
| D9 | Offers | Wash-level offers CRUD |
| D10 | Employees | List + profile: role, branch, permissions, discount limit |
| D11 | Shifts & closing | Shift schedule, shift closings, end-of-day reconciliation |
| D12 | Customers (CRM) | List + profile |
| D13 | Reviews | List, rating summary, reply |
| D14 | Reports | Orders, revenue, services, source, employees |
| D15 | Financials | Revenue by method, pending payments, refunds, platform commission |
| D16 | Branches | List + branch editor |
| D17 | Audit log | Filterable, with old → new values |
| D18 | Notifications | List + preferences |
| D19 | Settings | Business profile, booking rules, roles matrix |

## B3. User stories — Employee

Format: **ID [priority]** — story → acceptance criteria. `[M]` must, `[S]` should.

### Epic E1 — Access & shift

- **EM-01 [M]** — As an employee, I want to log in to my own account so my work is recorded under my name. → AC: phone + password; inactive account is rejected with a message; after login the header always shows name, role, branch and shift ("Ahmed Samir · Nasr City · 09:00–17:00").
- **EM-02 [M]** — As an employee, I can only work in my branch. → AC: no branch switcher; all lists are scoped to my branch; direct URLs to other branches' orders are rejected by `permissions`.
- **EM-03 [M]** — As an employee, I want to start my shift so my activity and cash are tracked. → AC: until a shift is started, Home shows a full-screen "Start shift" gate (scheduled time shown, late/early indicator); starting records employee, branch and actual start time and writes an audit entry.
- **EM-04 [M]** — As an employee, I want to end my shift and count my cash. → AC: End shift shows orders completed, **expected cash** (sum of my cash payments this shift), cash/card breakdown, an "Actual cash" numeric input, and a live **Difference**; if ≠ 0 a reason is required (refund, discount, mistake, other + note); blocked with a clear list if I still have orders `in_service` or `completed` + unpaid; submit → shift closed, summary screen, owner/manager notified (mismatch raises a "Cash difference" alert).

### Epic E2 — Today & orders

- **EM-05 [M]** — As an employee, I want to see today's work the moment I open the app. → AC: header + 4 counters (**Waiting 3 · In service 4 · Completed 18 · Payment pending 1** at seed) that act as filters; next upcoming booking with countdown; "Today's orders" list sorted by urgency (in service → waiting → upcoming).
- **EM-06 [M]** — As an employee, I want each order card to tell me exactly what to do next. → AC: card = order number, source icon (app / walk-in / phone), customer (or "Walk-in"), vehicle + plate badge, service, price, status badge, elapsed/remaining time, and **one primary action button** driven by state: Confirm → Check in → Start service → Complete → Collect payment.
- **EM-07 [M]** — As an employee, I want new app bookings to appear instantly. → AC: a booking created in the Customer app (other tab) appears within ~1 s with a toast + sound-style animation + notification "New app booking".
- **EM-08 [M]** — As an employee with permission, I want to confirm a pending booking. → AC: Confirm visible only if `permissions.can('confirm_booking')`; status → `confirmed`; customer notified; if `autoConfirm` is on, bookings arrive already confirmed.
- **EM-09 [M]** — As an employee, I want full order details. → AC: number, source, customer (tap-to-call), vehicle, services + add-ons, price breakdown, discount, total, scheduled time, start/completion times, assigned employee, payment method/status, notes, timeline; action bar at the bottom.

### Epic E3 — Walk-in (critical flow)

- **EM-10 [M]** — As an employee, I want to register a walk-in car in seconds. → AC: opened from the center FAB or the Home CTA "＋ New walk-in"; **only plate and service are required**; phone and name optional; large plate input with auto-uppercase/normalization; service tiles with price + duration; the footer shows the computed price and duration; "Create order" → order `CZ-20045` (first demo walk-in) in `waiting` with a success sheet offering **Start service now** / **Back to today**. Target: ≤ 3 taps after typing the plate, under 15 seconds.
- **EM-11 [M]** — As an employee, I want the system to recognize returning customers so I don't create duplicates. → AC: typing a plate or phone that matches shows a recognition card — "Ahmed Hassan · Toyota Corolla · ABC123 · Previous visits: 7 · Last visit: 14 days ago · Usual: Interior + Exterior" with "Use this customer"; one tap fills the form and preselects the usual service.
- **EM-12 [M]** — As an employee, I cannot change a service price. → AC: no editable price field anywhere in the employee app; totals always come from `pricing`.
- **EM-13 [M]** — As an employee, I'm warned when the branch is full. → AC: when all bays are busy the walk-in is still created in `waiting` with an estimated wait ("~20 min") — never blocked.

### Epic E4 — Check-in of app bookings

- **EM-14 [M]** — As an employee, I want to check in a customer by scanning their QR. → AC: scanner screen with a simulated camera viewfinder and a "Simulate scan" control listing today's confirmed bookings (real camera is optional); result card shows booking number, customer, vehicle, service, price, time → **Confirm arrival** → status `waiting`, customer notified.
- **EM-15 [M]** — As an employee, I want to check in by typing the booking code or number when the QR can't be scanned. → AC: code tab (5 large character boxes, e.g. `5K8P2`) and search tab (number, plate or phone); wrong code → clear error; already checked-in / cancelled / other-branch bookings → specific messages.
- **EM-16 [M]** — As an employee, I want to handle early or late arrivals. → AC: early arrival allowed with an "Early by 1h 30m" note; a booking past the grace period shows "Late" and offers Check in or Mark no-show.

### Epic E5 — Service execution

- **EM-17 [M]** — As an employee, I want to start a service. → AC: allowed from `waiting` when a bay is free; assigns me by default (reassignable if permitted); records start time; status `in_service`; card shows a live timer against the expected duration.
- **EM-18 [M]** — As an employee, I want to complete a service. → AC: confirmation; records completion time and actual duration; status `completed`; the payment sheet opens immediately.
- **EM-19 [M]** — As an employee, I want to add an approved extra service the customer agreed to. → AC: only while `waiting`/`in_service`; only active configured add-ons selectable; total recalculated (100 + 30 = 130 EGP); audit entry; customer app updates.
- **EM-20 [M]** — As an employee, I want to apply a discount within my limit. → AC: percent or fixed amount; reason required; over-limit attempts are rejected with "Your limit is 10% — ask a manager" and a "Request manager approval" option (manager PIN `1234` in the demo); records amount, user, time, reason.
- **EM-21 [M]** — As an employee, I want to add notes to an order. → AC: quick note chips ("scratch on left door", "customer waiting", "keys at desk") + free text; timestamped with my name.
- **EM-22 [M]** — As an employee, I want to mark a no-show. → AC: only for `confirmed` bookings after `noShowGraceMin`; confirmation; customer notified; slot released.
- **EM-23 [S]** — As an employee with permission, I want to cancel an order with a reason. → AC: reason required; only `pending`/`confirmed` (waiting requires manager); audited.

### Epic E6 — Payment

- **EM-24 [M]** — As an employee, I want to collect payment in one step. → AC: sheet shows total; method tiles **Cash / Card (POS)**; for cash, an "amount received" field with quick amounts and automatic change calculation; "Mark as paid" creates a payment record (amount, method, collected by, collected at) and sets `paymentStatus = paid`; simple receipt view with order number.
- **EM-25 [M]** — As an employee, I can't edit a paid order. → AC: paid orders are read-only; a locked banner explains that only a manager/owner can change them.
- **EM-26 [M]** — As an employee, I want to see unpaid completed orders so nothing leaves without paying. → AC: "Payment pending" counter and a persistent warning card on Home while count > 0.

### Epic E7 — Phone bookings, notifications, profile

- **EM-27 [M]** — As an employee, I want to create a booking for a customer who calls. → AC: phone (with recognition, EM-11), name, vehicle, service, date, **available** time slot (same engine as the customer app), notes; created as `confirmed` with source `phone`; appears in Upcoming.
- **EM-28 [M]** — As an employee, I want notifications about my branch. → AC: new app booking, booking cancelled, upcoming booking (15 min before), customer checked in, payment pending; deep links.
- **EM-29 [S]** — As an employee, I want to see my own numbers. → AC: today / this week: orders completed, service value handled, average rating; no branch financials.

## B4. User stories — Branch Manager

A manager can do everything an employee can, plus the following — **always scoped to their branch**.

- **MG-01 [M]** — As a manager, I want a branch dashboard. → AC: same layout as the owner dashboard but for Nasr City only; branch switcher is locked.
- **MG-02 [M]** — As a manager, I want a live view of the floor. → AC: Live operations board with columns Upcoming · Waiting · In service · Payment pending · Done today; bay utilization "4 / 6 bays busy"; cards show plate, service, employee, timer; drag-and-drop or button to move a card to the next state (same rules as the employee app); overdue services highlighted.
- **MG-03 [M]** — As a manager, I want to manage today's and upcoming bookings. → AC: table with filters (status, source, employee, date); bulk confirm; open details drawer; create manual booking; cancel with reason.
- **MG-04 [M]** — As a manager, I want to assign or reassign an employee to an order. → AC: dropdown limited to on-shift staff of the branch; audited.
- **MG-05 [M]** — As a manager, I want to see and control capacity for the day. → AC: Schedule screen — time axis × capacity lanes showing occupied vs free bays per slot; block a time range with a reason (blocked slots disappear from the customer app immediately); unblock.
- **MG-06 [M]** — As a manager, I want to handle exceptions employees can't. → AC: approve over-limit discounts (up to my own 20%), cancel a `waiting` order, reopen/correct a paid order (reason required), refund a payment (reason required → `paymentStatus = refunded`); every action audited.
- **MG-07 [M]** — As a manager, I want to review shift closings. → AC: list of submitted shifts with expected vs actual and difference; mark Reviewed/Flagged with a note.
- **MG-08 [M]** — As a manager, I want to run the end-of-day reconciliation. → AC: completed orders, expected revenue, breakdown Cash / Card / Online, actual totals, difference; mismatch requires a reason; closing locks the day's orders (`closedInShiftId`); a printable-style closing report.
- **MG-09 [M]** — As a manager, I want to manage my branch's staff and shifts if the owner allows it. → AC: weekly shift grid (employee × day); add/edit shifts; activate/deactivate employees of my branch; cannot change roles, discount limits or other branches.
- **MG-10 [M]** — As a manager, I want branch reports. → AC: the Reports module scoped to my branch.
- **MG-11 [S]** — As a manager, I want to edit services/prices only if the owner enabled it. → AC: Services is read-only unless the owner turned on `manager.canEditServices`.

## B5. User stories — Owner

An owner can do everything a manager can, across **all branches**, plus:

### Epic O1 — Joining Carzen

- **OW-01 [M]** — As a wash owner, I want to apply to join Carzen. → AC: wizard collects business name, owner name, phone, email; branch name, address and map pin; services with price and duration (starter templates provided); working hours per day and capacity; photos and optional documents (file inputs with preview, nothing uploaded); review step; submit creates a `washApplication` with status `pending` — visible in the Admin app.
- **OW-02 [M]** — As an applicant, I want to know my application status. → AC: status page — Under review / Changes requested (shows the admin note, lets me edit and resubmit) / Approved (CTA "Open dashboard") / Rejected (shows reason). Updates live when the admin decides.
- **OW-03 [M]** — As a newly approved owner, I want a guided setup. → AC: checklist on first dashboard visit — confirm branch info, review services, set working hours, add first employee, go live; progress bar; branch is visible to customers only when the checklist is complete and the branch is active.

### Epic O2 — Remote visibility

- **OW-04 [M]** — As an owner, I want today's numbers at a glance. → AC: KPI cards — total orders, confirmed bookings, walk-ins, completed, cancelled, no-shows, **revenue**, pending payments — each with a delta vs yesterday and a sparkline; period switcher Today / 7 days / 30 days.
- **OW-05 [M]** — As an owner who is away, I want to see what's happening in each branch right now. → AC: "Live branches" cards — Open/Closed, active orders, bays busy, employees on shift (avatars), today's revenue; click opens that branch's Live operations.
- **OW-06 [M]** — As an owner, I want to see every car currently inside. → AC: "Cars currently inside" list (plate, order number, status, employee, time in); updates live as employees act in the other tab.
- **OW-07 [M]** — As an owner, I want alerts for things that need my attention. → AC: alert feed — cash difference, high cancellation rate, no-shows, payment pending > 30 min, branch with no active shift during working hours, over-limit discount requests; each links to its source; dismissible.
- **OW-08 [M]** — As an owner, I want charts that explain the day. → AC: revenue by hour, orders by source (app / walk-in / phone) donut, top services bar, orders by status; all computed from the mock DB.

### Epic O3 — Configuration

- **OW-09 [M]** — As an owner, I want to manage branches. → AC: list + editor — name, address, map pin, phone, photos, amenities, working hours (open / close / closed day / optional break per weekday), capacity, active toggle; deactivating a branch hides it from customers and blocks new bookings (existing ones listed with a warning).
- **OW-10 [M]** — As an owner, I want to manage services and prices. → AC: table — name (AR/EN), category, type (primary/add-on), price, duration, status; create/edit in a drawer; deactivate instead of delete when used by orders; price changes affect new orders only and are audited (old → new); changes appear in the customer app immediately.
- **OW-11 [M]** — As an owner, I want to manage employees and what they can do. → AC: list + profile — name, phone, role, branch, status, **max discount %**, permission toggles (confirm bookings, close shift, cancel orders, edit services for managers); a read-only view of the permission matrix (spec 02 §4); deactivated staff cannot log in.
- **OW-12 [M]** — As an owner, I want to define booking rules. → AC: per branch — auto-confirm on/off, slot interval, lead time, max advance days, free-cancellation window, no-show grace, reminder timing; saved to `branch.settings` and reflected in the customer app.
- **OW-13 [M]** — As an owner, I want to publish offers for my wash. → AC: title, description, discount type/value, date range, applicable branches/services; statuses Draft / Scheduled / Active / Expired / Disabled; active offers appear in the customer app and are applied by `pricing`.

### Epic O4 — Control & money

- **OW-14 [M]** — As an owner, I want full financial visibility. → AC: revenue by day / method / branch; pending payments list; refunds; discounts given (by employee); platform commission (7%) and **net to wash**; export button produces a CSV download from mock data.
- **OW-15 [M]** — As an owner, I want to review every shift closing and daily reconciliation. → AC: all branches; filter by difference ≠ 0; drill down to the shift's orders and payments.
- **OW-16 [M]** — As an owner, I want an audit log I can trust. → AC: who / what / when / branch / order / old value / new value / reason; filters by actor, action type, date, branch; covers create order, status change, price/config change, discount, cancel, payment, refund, shift close; read-only for everyone.
- **OW-17 [M]** — As an owner, I want to see how each employee performs. → AC: per employee — orders completed, service value, average service duration vs expected, average customer rating, discounts given; sortable leaderboard; period filter.
- **OW-18 [M]** — As an owner, I want reports. → AC: Orders (today/week/month), Revenue (daily/weekly/monthly), Services (most booked, highest revenue), Source (app / walk-in / phone), Employees; date range + branch filters; chart + table for each; CSV export.

### Epic O5 — Customers & reputation

- **OW-19 [M]** — As an owner, I want to know my customers. → AC: list — name, phone, vehicles, visits, last visit, total spent; search by name/phone/plate; profile with vehicles, order history, favorite services; segments chips: New, Returning, Lost (no visit in 60 days).
- **OW-20 [M]** — As an owner, I want to read and answer reviews. → AC: rating summary + distribution, filter by stars/branch; reply once per review (shown in the customer app); "Report to Carzen" flags a review for admin moderation.
- **OW-21 [M]** — As an owner, I want notifications and a daily summary. → AC: new booking, high cancellation, cash mismatch, branch issue, daily summary card (orders, revenue, top service, issues).

## B6. Additions beyond the spec (deliberate — keep them)

| Addition | Why |
|---|---|
| Partner registration wizard + status page + setup checklist | Admin spec reviews "applications" but no spec defines how an owner submits one or goes live |
| Start-shift gate | Enforces "every order has an employee on a shift" |
| Live operations board with bay utilization | Turns the "cars currently inside" list into the owner's remote-control view |
| Schedule with slot blocking | The availability formula mentions "configured availability" with no UI |
| Manager PIN approval for over-limit discounts | Spec defines limits but not what happens beyond them |
| Refund flow, reopen paid order (manager/owner, reason, audit) | `Refunded` status exists in the spec with no flow |
| No-show grace period + late/early arrival handling | Spec has the status but no trigger rule |
| Estimated wait for walk-ins when bays are full | Walk-ins must never be refused by the system |
| Booking rules settings (auto-confirm, lead time, cancel window…) | Customer spec references a "configured policy" nothing defines |
| Wash-level offers, review replies, "report review" | Spec lists Offers/Reviews in navigation without definitions |
| CSV export on reports/financials | Standard owner expectation |

## B7. Out of scope — do not build

Queue/bay hardware integration, customer self check-in kiosk, online payment processing, loyalty/memberships, inventory and material consumption, payroll and incentives, fleet accounts, advanced multi-branch analytics.

## B8. Build order

1. Shared foundation (Part A) — skip if `/shared` exists.
2. Employee app shell, login, persona switch, start-shift gate.
3. Employee Home, orders list, order details, state-driven primary actions.
4. Walk-in + recognition + service picker.
5. Check-in (scan / code / search), service execution, add-ons, discounts, notes.
6. Payment, shift end & cash count.
7. Phone booking, notifications, profile.
8. Dashboard shell, login, role scoping (owner vs manager).
9. Dashboard home, Live operations, Bookings, Orders, Schedule.
10. Services, Offers, Employees, Shifts & closing, Branches, Settings.
11. Customers, Reviews, Reports, Financials, Audit log.
12. Registration wizard + status page + setup checklist.
13. Polish: states, motion, RTL/LTR audit, dark mode.

## B9. Demo scripts (must work perfectly, in Arabic and in English)

**Demo 1 — App booking.** Customer creates `CZ-10001` (Customer app, or the demo bar's "Simulate app booking" if that app isn't built yet) → toast in the employee app → Ahmed Samir confirms → Check-in → Simulate scan → Confirm arrival → Start service → Complete → Cash 200 received, change 20 → Paid → owner dashboard revenue +180, completed +1.

**Demo 2 — Walk-in.** FAB → plate `XYZ845` → Exterior Wash → 100 EGP / 20 min → Create → **Order #CZ-20045** → Start service → add Tire Cleaning (+30 → 130) → Complete → Card → Paid → appears in daily revenue and in the Source report as walk-in.

**Demo 3 — Returning customer.** New walk-in → type `ABC123` → recognition card "Ahmed Hassan · 7 visits · last visit 14 days ago" → Use this customer.

**Demo 4 — Owner not present.** Switch persona to Khaled Mansour → dashboard shows cars inside, active orders, employees on shift, revenue, pending payments — updating live while the employee tab works → back to Ahmed Samir → End shift → expected cash shown → enter an amount 50 EGP lower → reason "Mistake" → submit → owner sees a "Cash difference −50 EGP" alert, the closing report and the audit entries.

**Demo 5 — Permissions.** As Ahmed Samir try a 15% discount → rejected (limit 10%) → manager PIN → approved and audited. As Mohamed Adel, confirm the branch switcher is locked and Services is read-only.

## B10. Definition of Done

- [ ] All screens (E1–E17, D1–D19, registration) reachable; no dead controls.
- [ ] All `[M]` stories pass; `[S]` done or listed as not done.
- [ ] All 5 demo scripts pass in AR and EN.
- [ ] Permission matrix enforced in `permissions` and reflected in the UI for the 3 personas.
- [ ] No price is typed anywhere; all totals come from `pricing`.
- [ ] Every mutation produces an audit entry visible in the Audit log.
- [ ] Shift expected cash and end-of-day totals reconcile exactly with the payments in the mock DB.
- [ ] Live cross-tab sync between employee app, dashboard and customer app.
- [ ] 4 states on every data screen; RTL/LTR verified; no console errors.
- [ ] `/docs/DECISIONS.md` updated.
