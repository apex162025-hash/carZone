import "server-only";

import { getDb, persistDb } from "./db";
import { adminRoutes } from "./handlers/admins";
import { applicationRoutes } from "./handlers/applications";
import { authRoutes } from "./handlers/auth";
import { complaintRoutes } from "./handlers/complaints";
import { customerRoutes } from "./handlers/customers";
import { dashboardRoutes } from "./handlers/dashboard";
import { financeRoutes } from "./handlers/finance";
import { offerRoutes } from "./handlers/offers";
import { orderRoutes } from "./handlers/orders";
import { platformRoutes } from "./handlers/platform";
import { reviewRoutes } from "./handlers/reviews";
import { washRoutes } from "./handlers/washes";
import { MockApiError, fail } from "./http";
import { type HttpMethod, type RouteDef, type VendorRouteDef, matchPath } from "./router";
import { VENDOR_ROUTES } from "./vendor";
import { resolveVendorActor } from "./vendor/scope";

const ROUTES: RouteDef[] = [
  ...authRoutes,
  ...dashboardRoutes,
  ...washRoutes,
  ...applicationRoutes,
  ...orderRoutes,
  ...customerRoutes,
  ...complaintRoutes,
  ...reviewRoutes,
  ...offerRoutes,
  ...financeRoutes,
  ...adminRoutes,
  ...platformRoutes,
];

/** Simulated network latency so loading states are visible (set MOCK_API_LATENCY=0 to disable). */
function latency() {
  const base = Number(process.env.MOCK_API_LATENCY ?? 280);
  if (!base) return Promise.resolve();
  return new Promise((r) => setTimeout(r, base + Math.floor(Math.random() * base * 0.6)));
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  if (req.method === "GET" || req.method === "DELETE") return {};
  try {
    const json = await req.json();
    return json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function handleMockRequest(req: Request, segments: string[]): Promise<Response> {
  const path = `/${segments.join("/")}`;
  const method = req.method.toUpperCase() as HttpMethod;
  const isVendor = path.startsWith("/vendor/");

  const table: (RouteDef | VendorRouteDef)[] = isVendor ? VENDOR_ROUTES : ROUTES;
  let matched: { def: RouteDef | VendorRouteDef; params: Record<string, string> } | null = null;
  for (const def of table) {
    if (def.method !== method) continue;
    const params = matchPath(def.path, path);
    if (params) {
      matched = { def, params };
      break;
    }
  }
  if (!matched) return fail(`المسار ${method} ${path} غير موجود`, 404);

  await latency();
  const db = getDb();

  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  const base = { db, params: matched.params, query: new URL(req.url).searchParams, body: await readBody(req), token };

  try {
    let response: Response;
    if (isVendor) {
      const actor = token ? resolveVendorActor(db, token) : null;
      if (!matched.def.isPublic && !actor) return fail("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى", 401);
      response = await (matched.def as VendorRouteDef).handler({ ...base, actor: actor! });
    } else {
      const adminId = token ? db.sessions[token] : undefined;
      const admin = adminId ? db.admins.find((a) => a.id === adminId && a.status === "active") : undefined;
      if (!matched.def.isPublic && !admin) return fail("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى", 401);
      response = await (matched.def as RouteDef).handler({ ...base, admin: admin! });
    }
    // Successful writes are flushed to the shared store so other apps see them immediately.
    if (method !== "GET" && response.ok) persistDb(db);
    return response;
  } catch (error) {
    if (error instanceof MockApiError) return fail(error.message, error.httpStatus, error.errors);
    console.error("[mock-api]", method, path, error);
    return fail("حدث خطأ غير متوقع في الخادم", 500);
  }
}
