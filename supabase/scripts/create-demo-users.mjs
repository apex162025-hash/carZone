/**
 * Creates Supabase Auth accounts for the seeded demo people and links them to
 * their profiles (admin_users / staff / customers .user_id). Idempotent: safe to
 * re-run; existing accounts are found and re-linked.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run db:users:demo
 *   (or put both in supabase/.env and run: node --env-file=supabase/.env supabase/scripts/create-demo-users.mjs)
 *
 * Accounts (password demo1234 everywhere):
 *   - every admin_users row        → email + password   (Super Admin)
 *   - every owner / manager / employee in staff → phone + password (Vendor Portal, employee app)
 *   - every customer               → phone only (customer app signs in with OTP)
 *
 * The service role key bypasses RLS: run this from your own machine only and never
 * commit the key or expose it to a browser.
 */

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.DEMO_PASSWORD || "demo1234";

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function call(path, init = {}) {
  const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${body?.msg ?? body?.message ?? text}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

const digits = (p) => (p ?? "").replace(/\D/g, "");

// Load every existing auth user once (admin API is paginated).
async function loadAuthUsers() {
  const all = [];
  for (let page = 1; ; page += 1) {
    const r = await call(`/auth/v1/admin/users?page=${page}&per_page=1000`);
    all.push(...(r.users ?? []));
    if (!r.users || r.users.length < 1000) break;
  }
  return all;
}

async function ensureUser(existing, { email, phone, password, name, kind }) {
  const found = existing.find((u) => (email && u.email === email) || (phone && digits(u.phone) === digits(phone)));
  if (found) return { id: found.id, created: false };
  const user = await call("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      ...(email ? { email, email_confirm: true } : {}),
      ...(phone ? { phone, phone_confirm: true } : {}),
      ...(password ? { password } : {}),
      user_metadata: { name, kind },
      app_metadata: { carzen_kind: kind },
    }),
  });
  existing.push(user);
  return { id: user.id, created: true };
}

async function link(table, id, userId) {
  await call(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId }),
  });
}

async function rows(table, select) {
  return call(`/rest/v1/${table}?select=${select}&order=id`);
}

const existing = await loadAuthUsers();
const summary = { created: 0, linked: 0 };

const groups = [
  { table: "admin_users", select: "id,name,email", kind: "admin", map: (r) => ({ email: r.email, password: PASSWORD }) },
  { table: "staff", select: "id,name,phone,role", kind: "staff", map: (r) => ({ phone: r.phone, password: PASSWORD }) },
  { table: "customers", select: "id,name,phone", kind: "customer", map: (r) => ({ phone: r.phone }) },
];

for (const g of groups) {
  const list = await rows(g.table, g.select);
  for (const r of list) {
    const { id, created } = await ensureUser(existing, { ...g.map(r), name: r.name, kind: g.kind });
    await link(g.table, r.id, id);
    summary.linked += 1;
    if (created) summary.created += 1;
  }
  console.log(`✓ ${g.table}: ${list.length} linked`);
}

console.log(`Done — ${summary.created} auth users created, ${summary.linked} profiles linked. Password: ${PASSWORD}`);
