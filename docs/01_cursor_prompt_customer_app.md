# Carzen Demo — Cursor Prompt 1 of 3: Customer App

> **How to use:** create an empty repo `carzen-demo/`, copy the three spec files into `/docs`, open it in Cursor (Agent mode) and paste this whole file as one message.
> **Run order:** Prompt 1 (Customer) → Prompt 2 (Car Wash) → Prompt 3 (Admin), all in the **same repo**. Each prompt is self-contained: Part A (shared foundation) is repeated in all three; the first prompt you run creates `/shared`, the next ones reuse it.
> **This prompt builds:** `/customer` — the customer mobile app (33 screens, 54 user stories).

## Your role

You are a senior product designer **and** senior front-end engineer. Build a production-quality, clickable **demo** of the **Customer mobile app** for the Carzen platform using HTML, CSS and vanilla JS with mock data. Design it as if it will be shown to investors and car-wash owners next week: modern, distinctive, bilingual (Arabic RTL first), and working end to end — no dead buttons, no placeholder text.

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

# PART B — CUSTOMER APP (`/customer`)

## B1. What you are building

A mobile-first customer app (role: **car owner / صاحب السيارة**) that lets a user discover car washes, compare them, book a service in the fewest possible steps, follow the booking live, manage vehicles, and rate the experience.

- **Shell:** on desktop, render the app inside a centered 390 × 844 phone frame (rounded device, status bar, soft page background with the Carzen logo and a one-line caption). Below 480 px the frame disappears and the app is full-bleed.
- **Bottom navigation (4 tabs):** الرئيسية Home · الخريطة Map · حجوزاتي Bookings · حسابي Profile. Hidden inside the booking flow and on auth screens.
- **Guest-first:** browsing never requires login. Login is requested only when creating a booking, adding a vehicle, favoriting, reviewing or reporting a problem — and after login the user **returns to exactly where they were**, with their selections intact.
- **Feel:** native-app quality. Sticky headers, bottom sheets instead of full pages for filters/pickers, a sticky bottom CTA showing the running total inside the booking flow, pull-to-refresh on lists, page transitions that respect RTL.

## B2. Screens & routes

| # | Screen | Route | Notes |
|---|---|---|---|
| 1 | Splash | `#/` | Logo animation ≤ 1.2 s → onboarding (first launch) or home |
| 2 | Onboarding (3 slides) | `#/onboarding` | Skip / Next / Get started; custom SVG illustration per slide |
| 3 | Login (phone) | `#/login` | `+20` country code, terms & privacy links |
| 4 | OTP | `#/otp` | 6 boxes, auto-advance, paste support, resend countdown |
| 5 | Complete profile | `#/profile/setup` | Name only — shown once for a new phone number |
| 6 | Home | `#/home` | Header, search, Wash Now, nearby, services, offers, map preview |
| 7 | Search | `#/search` | Recent searches + live results (wash / service / area) |
| 8 | Results list | `#/results?...` | Shared by search, category, Wash Now, "see all" |
| 9 | Filters & sort | bottom sheet | Distance, rating, price, open now, available today + sort |
| 10 | Map | `#/map` | Leaflet, markers, mini preview card, "list" toggle |
| 11 | Wash details | `#/wash/:branchId` | Cover, info, gallery, amenities, services, reviews, sticky CTA |
| 12 | Gallery viewer | overlay | Full screen, swipe, counter |
| 13 | All reviews | `#/wash/:branchId/reviews` | Distribution + list + star filter |
| 14 | Offers | `#/offers` | All active offers |
| 15 | Booking 1 — Service | `#/book/:branchId/service` | One primary + optional add-ons |
| 16 | Booking 2 — Car | `#/book/:branchId/car` | Saved cars, inline "Add car" |
| 17 | Booking 3 — Date & time | `#/book/:branchId/slot` | Date strip + slot grid (one screen) |
| 18 | Booking 4 — Summary | `#/book/:branchId/summary` | Full recap, policy, Confirm |
| 19 | Booking success | `#/book/success/:orderId` | Success animation, number, next actions |
| 20 | My bookings | `#/bookings` | Tabs: Upcoming / History |
| 21 | Booking details | `#/booking/:orderId` | Status timeline, QR + code, actions |
| 22 | Cancel booking | bottom sheet | Policy text + reason |
| 23 | Reschedule | `#/booking/:orderId/reschedule` | Reuses the slot picker |
| 24 | Rate & review | `#/booking/:orderId/review` | Stars, tags, comment |
| 25 | Report a problem | `#/booking/:orderId/report` | Category + description → complaint |
| 26 | My cars | `#/cars` | List, default badge, swipe/kebab actions |
| 27 | Add / edit car | `#/cars/new`, `#/cars/:id` | Make → model dependent pickers, color swatches |
| 28 | Favorites | `#/favorites` | Saved washes |
| 29 | Notifications | `#/notifications` | Grouped by day, unread dot, deep links |
| 30 | Profile | `#/profile` | Menu of sections |
| 31 | Edit profile | `#/profile/edit` | Name, avatar (initials fallback) |
| 32 | Settings | `#/settings` | Language, notification toggles, theme |
| 33 | Terms / Privacy | `#/legal/:doc` | Static content from `settings.legal` |

## B3. User stories

Format: **ID [priority]** — story → acceptance criteria (AC). `[M]` must be in the demo, `[S]` should, build after all `[M]`.

### Epic 1 — First launch & authentication

- **CU-01 [M]** — As a new user, I want a short onboarding so I understand what Carzen does. → AC: 3 slides with the spec's titles/descriptions; Skip, Next, "Get started"; shown only on first launch (flag in localStorage); ends on Home as guest.
- **CU-02 [M]** — As a guest, I want to browse washes, services, prices and availability without an account so I can decide before committing. → AC: Home, search, map, details and slot picker all work logged out; header shows "أهلاً بك 👋".
- **CU-03 [M]** — As a guest who taps a protected action, I want to log in with my phone number and come back to where I was. → AC: login sheet opens on Book-confirm / Add car / Favorite / Review / Report; phone validated as Egyptian mobile (`01[0125]XXXXXXXX`); after OTP the original action completes with selections preserved.
- **CU-04 [M]** — As a user, I want to verify with a 6-digit OTP. → AC: `123456` succeeds; any other code → "Invalid OTP"; `000000` → "Expired OTP"; 5 wrong attempts → "Too many attempts" with a 60 s lock; resend enabled after a 30 s countdown; "Change number" returns to login; states Idle / Sending / Verifying / Success are all visible.
- **CU-05 [M]** — As a first-time user, I want to enter my name once so the wash knows who I am. → AC: shown only if the phone is not in `customers`; `+20 100 123 4567` logs in as the existing customer Ahmed Hassan with his 2 cars.
- **CU-06 [M]** — As a user, I want to log out. → AC: confirmation dialog; returns to Home as guest; local booking draft cleared.

### Epic 2 — Home & discovery

- **CU-07 [M]** — As a user, I want a home screen that gets me to a wash fast. → AC: sections in this order — greeting header (name, notification bell with unread count, avatar) · search bar "ابحث عن مغسلة أو خدمة" · **Wash Now** hero CTA · active-booking card (only if I have one today) · popular services (4 categories with icons and "from X EGP") · nearby washes (horizontal cards) · offers carousel · map preview card.
- **CU-08 [M]** — As a user, I want to tap **غسيل الآن (Wash Now)** to see who can take my car soonest. → AC: results limited to open branches with a slot in the next 90 min; default sort "Earliest available"; card shows name, ⭐ rating, distance, Open, "Next slot: 15 min", "From 100 EGP"; switchable to Nearest / Highest rated.
- **CU-09 [M]** — As a user, I want to see nearby washes ordered by distance. → AC: card = cover, name, rating + count, distance, starting price, Open/Closed pill, next available time, favorite heart; distance computed from the current location to branch lat/lng.
- **CU-10 [M]** — As a user who hasn't shared location, I want to pick my area manually. → AC: a "Use my location" CTA triggers a simulated permission prompt (Allow → location = Nasr City center; Deny → area picker sheet with the 8 seeded areas); chosen area shown in the header and editable.
- **CU-11 [M]** — As a user, I want to browse by service category. → AC: tapping a category opens results filtered to branches offering it, showing that service's price on each card.
- **CU-12 [M]** — As a user, I want to see current offers. → AC: card = title, short description, discount badge, wash name, "ends in N days", CTA; tap opens the wash page with the offer banner pinned and eligible services tagged.
- **CU-13 [M]** — As a user, I want to search by wash name, service or area. → AC: debounced live results grouped into Washes / Services / Areas; matches Arabic and English; recent searches kept (max 5, clearable); result card includes Open/Closed and next available slot.
- **CU-14 [M]** — As a user, I want to filter and sort results. → AC: filters — distance (1 / 3 / 5 / 10 km), min rating (4+, 4.5+), price range (dual slider), open now, available today; sort — nearest, highest rated, lowest price, earliest available; active-filter count badge on the filter button; "Reset".
- **CU-15 [M]** — As a user with no matches, I want a helpful empty state. → AC: "لا توجد مغاسل تطابق اختياراتك" + "Clear filters" + "Change area".
- **CU-16 [M]** — As a user, I want a map of nearby washes. → AC: Leaflet map centered on my location with a pulsing dot; custom branded markers (grey when closed); tap marker → mini preview card (name, rating, distance, next slot, starting price) → opens details; "recenter" button; a draggable bottom list of the same results (the map complements the list, it doesn't replace it).
- **CU-17 [S]** — As a user, I want featured/sponsored washes to be clearly labeled. → AC: a subtle "مُروَّج / Sponsored" tag on featured cards.

### Epic 3 — Car wash details

- **CU-18 [M]** — As a user, I want all the information I need to choose this wash. → AC: collapsing cover header with logo, name, rating + review count, favorite, share; info block with address, distance, Open/Closed + today's hours (expandable to the full week), "Call" and "Navigate" buttons (toast: "Opens phone / maps app in the real product").
- **CU-19 [M]** — As a user, I want to see photos. → AC: horizontal gallery; tap → full-screen viewer with swipe and "3 / 8" counter.
- **CU-20 [M]** — As a user, I want to see amenities. → AC: icon chips from `branch.amenities` (waiting area, AC, Wi-Fi, card payment, coffee, covered area).
- **CU-21 [M]** — As a user, I want to compare services by price and duration. → AC: service rows = name, 1-line description, price, duration chip; add-ons listed in a separate "Extras" group; tapping a service starts the booking flow with it preselected.
- **CU-22 [M]** — As a user, I want to know when I could get in before starting a booking. → AC: "Next available" strip with the next 3 slots today (or "Fully booked today — next: tomorrow 9:00 AM"); tapping one preselects it.
- **CU-23 [M]** — As a user, I want to read reviews. → AC: average, total count, 5-bar distribution, 3 most recent reviews (name, stars, date, service, comment, wash reply if any); "See all" opens the full list with a star filter.
- **CU-24 [M]** — As a user, I want one clear action. → AC: sticky bottom bar "احجز الآن / Book Now" with "From 100 EGP"; when the branch is closed the CTA becomes "Book for later"; if the business is suspended/inactive the page shows "غير متاح حالياً" and no CTA.

### Epic 4 — My cars

- **CU-25 [M]** — As a user, I want to save my cars so I don't retype them. → AC: list card = car illustration tinted with the car color, make + model, year, plate in a plate-style badge, "Default" badge.
- **CU-26 [M]** — As a user, I want to add a car quickly. → AC: required make, model (dependent on make), color (swatches), plate; optional year; plate normalized; a duplicate normalized plate on my account is rejected with a clear message; first car becomes default automatically.
- **CU-27 [M]** — As a user, I want to edit, delete or set a default car. → AC: delete asks for confirmation and is blocked (with explanation) if the car has an upcoming booking; deleting the default promotes the next car.

### Epic 5 — Booking flow

- **CU-28 [M]** — As a user, I want to pick one main service and optional add-ons. → AC: radio cards for primary services, checkbox rows for add-ons; sticky footer shows running **total and duration** computed by `pricing`; progress indicator "1 / 4"; applicable offer shown as a green line "Offer −15%".
- **CU-29 [M]** — As a user, I want to pick which car. → AC: default car preselected; "+ Add car" opens an inline sheet and returns with the new car selected; guests are asked to log in at this step.
- **CU-30 [M]** — As a user, I want to pick a date and an available time on one screen. → AC: horizontal date strip — Today, Tomorrow, then up to `maxAdvanceDays`; closed days disabled; slot grid grouped Morning / Afternoon / Evening; **only bookable slots are shown** (from `availability`); a "few left" hint when 1 bay remains; empty state "No times left today" + "See tomorrow".
- **CU-31 [M]** — As a user, I want to review everything before confirming. → AC: wash + branch + address, car, service, add-ons, date, time, duration, price breakdown (subtotal, offer, **total**), payment line "الدفع في المغسلة — Pay at the wash (cash or card)", cancellation policy sentence built from `freeCancelMin`, optional note to the wash; each block has an "Edit" link back to its step.
- **CU-32 [M]** — As a user, I want confirmation that my booking exists. → AC: "Confirm booking" shows a loading state, re-checks availability, creates the order; success screen with animation, booking number (first demo booking = **CZ-10001**), status "قيد المراجعة", buttons "View booking" and "Back to home"; an in-app notification "Booking created" is added.
- **CU-33 [M]** — As a user whose slot was just taken, I want to recover without starting over. → AC: if the slot is no longer available at confirm time, show "This time was just booked" and return to the slot step with other selections kept (testable via `?flaky=1` or by filling the slot from the wash dashboard in another tab).
- **CU-34 [M]** — As a user, I want my progress kept if I leave mid-flow. → AC: the draft survives back navigation, login and page refresh; leaving the flow asks "Discard booking?".

### Epic 6 — Bookings & live tracking

- **CU-35 [M]** — As a user, I want all my bookings in one place. → AC: **Upcoming** = pending, confirmed, waiting, in_service (sorted soonest first); **History** = completed, cancelled, no_show (newest first); card = wash, service, date/time, price, status badge, booking number; empty states with "Book a wash" CTA.
- **CU-36 [M]** — As a user, I want full details of a booking. → AC: number, status badge, **vertical status timeline** with timestamps, wash + branch + address, Navigate, Contact wash, car, services + add-ons, date, time, duration, price breakdown, payment status.
- **CU-37 [M]** — As a user, I want a QR and a short code to check in quickly. → AC: while `pending`, the QR area is a placeholder "Your QR appears once the wash confirms"; from `confirmed`, a large QR, the code **5K8P2** in big spaced letters, and "Show this at the wash"; tap QR → full-screen, max brightness style.
- **CU-38 [M]** — As a user, I want the booking to update live as the wash works on my car. → AC: status changes made in the wash app (other tab) update the open details screen, the bookings list and the home active-booking card within ~1 s, with a toast and a notification ("تم تأكيد حجزك", "بدأ تنفيذ الخدمة", "اكتملت الخدمة"); while `in_service` show an estimated finish time (start + duration) with a progress ring.
- **CU-39 [M]** — As a user, I want to cancel a booking according to the policy. → AC: Cancel available for `pending`/`confirmed`; sheet shows the policy; free until `freeCancelMin` before the slot; inside the window show a warning "Late cancellation" and still allow it (recorded as late); reason picker (changed plans, found another time, booked by mistake, other); status → `cancelled`; slot is released.
- **CU-40 [S]** — As a user, I want to reschedule instead of cancelling. → AC: available for `pending`/`confirmed` outside the free-cancel window; reuses the date/time picker; same number and code; timeline records "Rescheduled"; wash is notified.
- **CU-41 [M]** — As a user, I want to book the same thing again. → AC: "Book again" on history items opens the summary step prefilled with the same branch, service, add-ons and car; only date/time is requested.
- **CU-42 [M]** — As a user who missed the appointment, I want to understand what happened. → AC: `no_show` bookings show an explanatory banner and a "Book again" CTA.

### Epic 7 — Reviews, favorites, notifications, support

- **CU-43 [M]** — As a user, I want to rate a completed wash. → AC: prompt card on Home + button in details + "Review reminder" notification; 1–5 stars (required), quick tags (نظافة ممتازة / Great cleaning, سرعة / Fast, تعامل راقٍ / Friendly staff, قيمة مقابل السعر / Good value), optional comment (≤ 500 chars); one review per completed booking; after submit the button becomes "View your review"; the wash's rating and review count update.
- **CU-44 [M]** — As a user, I cannot review a booking that wasn't completed. → AC: no review entry point for other statuses; the route guards against it.
- **CU-45 [M]** — As a user, I want to save favorite washes. → AC: heart toggle on cards and details with a micro-animation; Favorites list with empty state.
- **CU-46 [M]** — As a user, I want notifications about my bookings. → AC: types — created, confirmed, reminder (`reminderMin` before slot — fires when the demo clock is advanced), cancelled, arrived, service started, completed, review reminder; unread badge on the bell; tap deep-links to the booking; "Mark all as read".
- **CU-47 [M]** — As a user, I want to report a problem with a booking. → AC: available on completed, cancelled and no_show bookings; category (service quality, pricing, booking issue, staff behavior, refund/payment, other) + description (required, ≥ 20 chars); creates a `complaint` with status `open` visible in the Admin app; confirmation with a ticket number; status of my report shown on the booking.

### Epic 8 — Profile & settings

- **CU-48 [M]** — As a user, I want a profile hub. → AC: avatar + name + phone, then rows: My cars, My bookings, Favorites, Notifications, Language, Terms & Privacy, Help, Logout. Guest sees a "Log in / Sign up" card instead.
- **CU-49 [M]** — As a user, I want to edit my name and photo. → AC: name validation; avatar shows initials on a tinted background when no image.
- **CU-50 [M]** — As a user, I want to switch language. → AC: AR ⇄ EN instantly flips direction, fonts and all strings without losing state.
- **CU-51 [S]** — As a user, I want to control which notifications I get. → AC: toggles for reminders and offers (persisted).

### Epic 9 — States & resilience

- **CU-52 [M]** — As a user on a slow connection, I want skeletons instead of blank screens. → AC: every list and detail has a shaped skeleton.
- **CU-53 [M]** — As a user who hits an error, I want a clear message and a retry. → AC: verified with `?flaky=1`.
- **CU-54 [M]** — As a user who goes offline, I want to still see my bookings. → AC: offline banner; cached bookings and QR remain viewable; actions that need the network are disabled with an explanation.

## B4. Additions beyond the spec (deliberate — keep them)

| Addition | Why |
|---|---|
| Complete-profile step (name) after first OTP | The wash needs a name; the spec only collects a phone |
| Active-booking card on Home | Fastest way back to the QR on arrival |
| Date + time merged into one screen | Fewer steps, same information |
| "Next available" strip on wash details | Delivers the "see availability before going" promise earlier |
| Slot-taken recovery (CU-33) | Real concurrency case; a classic demo killer if missing |
| QR/code revealed only when confirmed | Matches "every *confirmed* booking gets a QR" in the spec |
| Cancellation reason + late-cancel flag | Feeds the wash and admin cancellation reports |
| Reschedule, Book again | Retention; cheap once the slot picker exists |
| Review quick tags | Higher review completion, richer wash analytics |
| Report a problem → complaint | The admin spec has a complaints module but the customer spec has no way to create one |
| Offers auto-applied in pricing | The spec shows discounts on offer cards but never says where they apply |
| Manual area picker + simulated location permission | Spec mentions the guest-location state without defining it |

## B5. Out of scope — do not build

Wallet, loyalty points, referral, subscriptions/memberships, corporate/fleet accounts, chat, coupon codes, live GPS tracking of the car, online payment (show "Pay at the wash" only).

## B6. Build order

1. Shared foundation (Part A) — skip if `/shared` exists. Launcher `index.html`.
2. App shell: phone frame, router, bottom nav, i18n, demo bar.
3. Auth: splash, onboarding, login, OTP, profile setup, guards with return-to-origin.
4. Discovery: home, search, results, filters, map, offers.
5. Wash details, gallery, reviews.
6. My cars.
7. Booking flow (service → car → slot → summary → success) on top of `pricing` and `availability`.
8. My bookings, booking details, QR, live sync, cancel, reschedule, book again.
9. Reviews, favorites, notifications, report a problem.
10. Profile, settings, legal.
11. Polish pass: skeletons, empty/error/offline states, motion, RTL/LTR audit, dark mode.

## B7. Demo script (must work perfectly, in Arabic and in English)

1. Launcher → Customer. Splash → onboarding → "Get started" → Home as guest, area Nasr City.
2. Scroll nearby washes → open **Carzen Wash – Nasr City** (⭐ 4.8).
3. View services, amenities, reviews; the "Next available" strip includes **5:00 PM**.
4. Book Now → select **Interior + Exterior** (180 EGP · 40 min).
5. Login prompt → `+20 100 123 4567` → OTP `123456` → back in the flow as Ahmed Hassan.
6. **Toyota Corolla · White · ABC123** is preselected → continue.
7. Today → **5:00 PM** → summary shows total **180 EGP** → Confirm.
8. Success: **Booking #CZ-10001**, status "قيد المراجعة".
9. *(Other tab — Wash app)* confirm → the customer screen flips to "تم التأكيد" live and reveals the QR with code **5K8P2**.
10. *(Wash app)* check-in → start service → complete → mark paid. The customer timeline follows each step live.
11. Customer opens the completed booking → rates **5 stars** with a tag and a comment → review appears on the wash page.

## B8. Definition of Done

- [ ] All 33 screens reachable; no dead buttons or links.
- [ ] All `[M]` stories pass their acceptance criteria; `[S]` stories done or listed as not done.
- [ ] Demo script passes end to end in AR and EN without a page refresh.
- [ ] Guest → login → return-to-origin works from every protected action.
- [ ] Prices, totals and slots come only from `shared/js/services` (grep shows no hardcoded prices in views).
- [ ] Cross-tab sync verified with the wash app (or, if it isn't built yet, with the demo bar's "Advance order" simulator).
- [ ] 4 states (loading / empty / error / offline) present on every data screen.
- [ ] RTL and LTR visually verified on every screen; no `left/right` in CSS.
- [ ] No console errors; `db.reset()` restores the canonical demo data.
- [ ] `/docs/DECISIONS.md` lists every assumption made.
