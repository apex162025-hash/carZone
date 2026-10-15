/**
 * Builds the self-contained runbook another Claude session (connected to Supabase through
 * its MCP tools) follows to set up a Carzen Supabase project end to end:
 *   - supabase/SETUP_WITH_CLAUDE.md  (every migration embedded verbatim)
 *   - supabase/seed-parts/seed-NN.sql (seed.sql split at statement boundaries, ≤ ~150 KB each)
 *
 *   npm run db:guide          (re-run after changing a migration or the seed)
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const supa = join(here, "..");
const PROJECT_REF = process.env.CARZEN_PROJECT_REF || "tbcmgdwzarfdgzzmmele";
const PART_LIMIT = 150 * 1024;

// ── Seed → parts (never split inside a DO $$ … $$ block) ────────────────────
const seed = readFileSync(join(supa, "seed.sql"), "utf8");
const statements = [];
let buf = [];
let inDo = false;
for (const line of seed.split("\n")) {
  buf.push(line);
  if (/^do \$\$/i.test(line.trim())) inDo = true;
  const ends = inDo ? /^\$\$;\s*$/.test(line.trim()) : /;\s*$/.test(line) && !line.trim().startsWith("--");
  if (ends) {
    statements.push(buf.join("\n"));
    buf = [];
    inDo = false;
  }
}
if (buf.join("").trim()) statements.push(buf.join("\n"));

const parts = [];
let cur = "";
for (const s of statements) {
  if (cur && Buffer.byteLength(cur + s) > PART_LIMIT) {
    parts.push(cur);
    cur = "";
  }
  cur += s + "\n";
}
if (cur.trim()) parts.push(cur);

const partsDir = join(supa, "seed-parts");
rmSync(partsDir, { recursive: true, force: true });
mkdirSync(partsDir);
const partNames = parts.map((p, i) => {
  const name = `seed-${String(i + 1).padStart(2, "0")}.sql`;
  writeFileSync(join(partsDir, name), `-- Carzen demo seed · part ${i + 1} of ${parts.length} · apply in order\n${p}`, "utf8");
  return { name, kb: Math.ceil(Buffer.byteLength(p) / 1024) };
});

// ── Migrations (embedded verbatim) ───────────────────────────────────────────
const migDir = join(supa, "migrations");
const migrations = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort().map((f) => ({
  file: f,
  name: f.replace(/^\d+_/, "").replace(/\.sql$/, ""),
  sql: readFileSync(join(migDir, f), "utf8").trim(),
}));

const fence = "```";
const migrationBlocks = migrations.map((m, i) => `### M${i + 1} · \`${m.file}\`

Apply with \`apply_migration\` → \`name: "${m.name}"\`, \`project_id: "${PROJECT_REF}"\`, and \`query\` = the full block below, unchanged.

${fence}sql
${m.sql}
${fence}`).join("\n\n");

const md = `# Carzen · Supabase setup runbook (for Claude)

> **للمستخدم:** ابعت الملف ده لـ Claude على الحساب المربوط بـ Supabase واكتبله:
> «اتبع الملف ده بالظبط وجهّز مشروع Supabase». ولو عايز بيانات العرض، ارفع معاه ملفات
> \`supabase/seed-parts/\` (${partNames.length} ملف). هيسألك قبل أي حاجة ممكن تأثر على بيانات موجودة.

---

## 0. Who you are and what you must do

You are setting up the **Carzen** database on a Supabase project, using your Supabase MCP tools
(\`list_projects\`, \`get_project\`, \`list_tables\`, \`list_migrations\`, \`apply_migration\`,
\`execute_sql\`, \`get_advisors\`, \`generate_typescript_types\`).

Carzen is a car-wash marketplace + operating system in Cairo (EGP). One database serves four apps:
Super Admin (Carzen staff), Vendor Portal (wash owners and branch managers), the customer mobile app
and the employee mobile app. This runbook contains the **complete, final schema**: 8 migrations
creating 40 tables, 25 enums, 9 functions and 23 triggers, plus RLS and storage. It was generated
from the source repository and validated on PostgreSQL 17 (migrations + full demo seed + role
access checks).

**Target project:** \`${PROJECT_REF}\` (confirm with the user before writing anything).

**Talk to the user in Egyptian Arabic.** Keep technical identifiers (table names, SQL) as they are.

## 1. Hard rules

1. **Never destroy data without explicit approval.** Do not \`DROP\`, \`TRUNCATE\`, \`DELETE\` or rename
   anything that exists in the project before this runbook, unless the user approves that exact
   statement in chat after you showed it to them.
2. **Apply the SQL exactly as written** in section 4, in order M1 → M8. Do not "improve", reorder,
   merge or skip statements. If one fails, stop and report the exact error. Don't improvise a fix
   that changes the design.
3. **Do not weaken security.** Do not disable RLS, add policies, or grant table access to
   \`anon\`/\`authenticated\`. The empty-policy RLS is intentional (section 6).
4. **No secrets in chat or files.** Never print or ask for the service role key or the database password.
5. **One project only:** \`${PROJECT_REF}\`. If your tools can't see it, stop and tell the user
   (they may be signed in to the wrong Supabase account).

## 2. Pre-flight (read-only)

Run these and **show the user a short summary** before changing anything:

1. \`get_project\` with id \`${PROJECT_REF}\`: it must exist and be \`ACTIVE_HEALTHY\`. Note the region and Postgres version (need ≥ 15).
2. \`list_migrations\`: what was already applied.
3. \`list_tables\` with \`schemas: ["public"]\`, \`verbose: false\`: the existing tables and their row counts.
4. Collision check with \`execute_sql\`:

${fence}sql
-- Existing public objects that would collide with the Carzen schema
with ours(name) as (values
  ('areas'),('service_categories'),('amenities'),('platform_settings'),('admin_users'),('admin_role_permissions'),
  ('businesses'),('business_settings'),('branches'),('branch_working_hours'),('branch_amenities'),('branch_blocked_slots'),
  ('branch_photos'),('services'),('staff'),('staff_shift_patterns'),('staff_shifts'),('customers'),('vehicles'),
  ('customer_favorites'),('orders'),('order_items'),('order_events'),('order_notes'),('payments'),('transactions'),
  ('payouts'),('day_closings'),('reviews'),('offers'),('offer_branches'),('offer_categories'),('complaints'),
  ('complaint_notes'),('wash_applications'),('admin_notifications'),('vendor_notifications'),('customer_notifications'),
  ('push_devices'),('audit_logs'))
select 'table' as kind, c.relname as name,
       (select reltuples::bigint from pg_class where oid = c.oid) as approx_rows
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r','v','m') and c.relname in (select name from ours)
union all
select 'type', t.typname, null
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
 where n.nspname = 'public' and t.typname in (
   'business_status','staff_role','account_status','service_type','order_status','order_payment_status',
   'order_source','payment_method','actor_type','payment_status','transaction_status','payout_status',
   'shift_review_status','review_status','offer_status','offer_scope','discount_type','complaint_status',
   'complaint_category','application_status','admin_role','admin_status','permission_level',
   'admin_notification_type','vendor_notification_type')
union all
select 'function', p.proname, null
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in (
   'gen_id','set_updated_at','normalize_plate','is_localized','next_order_number','gen_check_in_code',
   'refresh_review_ratings','next_complaint_ticket','audit_logs_immutable')
union all
select 'bucket', id, null from storage.buckets where id in ('application-documents','branch-photos')
order by 1, 2;
${fence}

## 3. Decide the path

- **Path A: no collisions** (the query returns no rows, or only the two buckets). Go to section 4 directly.
- **Path B: collisions exist.** Do **not** apply anything yet. For every colliding object, report
  to the user its name, its row count, and how it relates to the Carzen table (section 7 has the
  common mappings). Then propose one of these, per object, and wait for an explicit choice:
  - **B1: empty or test-only:** drop it (show the exact \`DROP … CASCADE\` first), then apply.
  - **B2: has data to keep:** rename it to \`legacy_<name>\` (types: \`legacy_<type>\`), apply the
    migrations, copy the data into the Carzen tables with \`INSERT … SELECT\` (show the SQL and get
    approval), compare counts, and only then offer to drop the legacy object.
  - Existing buckets with the same id are fine: M7 upserts their settings.

  Before any B1/B2 change, remind the user to take a backup (Dashboard → Database → Backups).

## 4. Apply the migrations (M1 → M8)

Apply each block below with \`apply_migration\`, one call per block, in order. After each call,
tell the user one line (e.g. "M3 ✓ customers & orders"). M8 starts with
\`create extension if not exists pgcrypto with schema extensions\`; that is expected on Supabase.

${migrationBlocks}

## 5. Demo data (optional; for a trial project, not for real users)

Ask the user: **"تحب أحمّل بيانات العرض؟"** (≈ 9,000 rows: 10 washes, 14 branches, 40 customers,
1,078 orders, identical to the dashboards' demo). Load it only on a fresh install (Path A or
after B1), never on top of real data.

The seed is split into **${partNames.length} files** in \`supabase/seed-parts/\` (the user attaches them).
Run each file's full content with \`execute_sql\`, **in order**, one call per file:

${partNames.map((p) => `- \`${p.name}\` (${p.kb} KB)`).join("\n")}

If a part fails, stop and report the error. The last part ends with a block that moves every date
to the day it is applied (so "today" in the demo is today). It must run last.

If the files are not available, skip this section and tell the user the seed was not loaded.

## 6. Verify

Run with \`execute_sql\` and show the results:

${fence}sql
select
  (select count(*) from pg_tables where schemaname = 'public')                         as tables,          -- 40
  (select count(*) from pg_tables where schemaname = 'public' and rowsecurity)         as rls_enabled,     -- 40
  (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typtype = 'e')                                   as enums,           -- 25
  (select count(*) from storage.buckets
     where id in ('application-documents', 'branch-photos'))                          as buckets,         -- 2
  (select count(*) from information_schema.role_table_grants
     where table_schema = 'public' and grantee in ('anon', 'authenticated'))          as public_grants;   -- 0
${fence}

If the seed was loaded, also:

${fence}sql
select (select count(*) from orders) as orders,                                   -- 1078
       (select count(*) from orders where payment_status = 'paid') as paid,       -- 928
       (select sum(total) from orders where payment_status = 'paid') as gmv,      -- 148921.00
       (select rating from branches where id = 'br_nasr') as nasr_rating,        -- 4.8
       (select count(*) from orders where scheduled_at::date = current_date) as today_orders;
${fence}

Then:
- \`get_advisors\` with \`type: "security"\` and again with \`"performance"\`. An **INFO** "RLS enabled, no
  policy" notice on the tables is **expected and intentional**: the apps reach data only through
  the server (service role) until phase 2 adds controlled access. Report anything else (WARN/ERROR) with its remediation link.
- \`generate_typescript_types\` and give the user the output (they will add it to the repo).

## 7. Reference

### Design in one paragraph
Ids are prefixed text (\`ord_…\`, \`br_…\`, default \`gen_id('prefix')\`). Bilingual text is jsonb
\`{"ar","en"}\`. Money is \`numeric(10,2)\` EGP, times are \`timestamptz\`, and phones are E.164 (\`+20…\`). Profile
tables (\`customers\`, \`staff\`, \`admin_users\`) link to \`auth.users\` through \`user_id\`. The database enforces
the following on its own:
- integrity: enums, foreign keys, checks such as total = subtotal − discount, a reason on a cancelled order, offers ≤ 50 %, one day-closing per branch;
- atomic numbering: \`next_order_number('app'|'walk_in'|'phone')\` returns CZ-10001/20045/30023 and \`next_complaint_ticket()\` returns TK-1040;
- rating sync from visible reviews;
- an append-only \`audit_logs\`.

Business rules (pricing, the order state machine, owner/manager permissions) live in the API layer.
RLS is on everywhere with no policies, and table/function privileges are revoked from \`anon\`/\`authenticated\`.

### Common mappings (Path B)
| Typical existing table | Carzen table(s) |
|---|---|
| \`profiles\` / \`users\` | \`customers\` · \`staff\` · \`admin_users\` (each with \`user_id → auth.users\`) |
| \`cars\` | \`vehicles\` |
| \`bookings\` / \`reservations\` | \`orders\` + \`order_items\` + \`order_events\` |
| \`washes\` / \`centers\` / \`shops\` | \`businesses\` + \`branches\` |
| \`services\` / \`packages\` | \`services\` (per branch, \`type\` primary/addon) |
| \`ratings\` | \`reviews\` |
| \`notifications\` | \`customer_notifications\` · \`vendor_notifications\` · \`admin_notifications\` |
| \`favorites\` | \`customer_favorites\` |
| \`device_tokens\` / \`fcm_tokens\` | \`push_devices\` |

UUID ids can be kept as text with a prefix (e.g. \`'cu_' || replace(id::text, '-', '')\`). Phones must be E.164 to pass the check.

## 8. What you cannot do from here: hand these to the user

Your MCP tools can't change Auth settings or create Auth users. Tell the user to:

1. **Authentication → Sign In / Providers:** Email: disable "Allow new users to sign up". Phone:
   enable, choose an SMS provider (Twilio Verify also supports WhatsApp), and set minimum password length to 8.
2. **Phone → Test phone numbers** (OTP \`123456\`): \`201001234567\` (customer Ahmed), \`201200000000\`
   (owner Khaled), \`201005550102\` (manager Mohamed Adel).
3. **URL Configuration:** set the Site URL and the Redirect URLs to the real app/dashboard domains.
4. **Demo accounts.** Either run from the repo root \`npm run db:users:demo\` (needs \`supabase/.env\` with
   \`SUPABASE_URL\` and \`SUPABASE_SERVICE_ROLE_KEY\`; creates all accounts with password \`demo1234\` and
   links them), or add a few users in Dashboard → Authentication, then run this linking SQL (you can run it):

${fence}sql
-- Link Auth users to their Carzen profiles (Auth stores phones without "+")
update public.staff s     set user_id = u.id from auth.users u where s.user_id is null and u.phone = ltrim(s.phone, '+');
update public.customers c set user_id = u.id from auth.users u where c.user_id is null and u.phone = ltrim(c.phone, '+');
update public.admin_users a set user_id = u.id from auth.users u where a.user_id is null and lower(u.email) = lower(a.email);
${fence}

## 9. Final report to the user (in Arabic)

Finish with a short summary:
- the path (A or B) and what was changed;
- M1–M8 status;
- whether the seed was loaded and the verification numbers;
- the advisor findings;
- the manual steps from section 8 still pending.

Do not claim anything you did not verify.

---
*Generated by \`supabase/scripts/build-setup-guide.mjs\` from the repository's migrations and seed. Regenerate with \`npm run db:guide\`.*
`;

writeFileSync(join(supa, "SETUP_WITH_CLAUDE.md"), md, "utf8");
console.log(`SETUP_WITH_CLAUDE.md written (${Math.ceil(Buffer.byteLength(md) / 1024)} KB) · ${migrations.length} migrations · ${partNames.length} seed parts`);
