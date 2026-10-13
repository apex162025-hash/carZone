import "server-only";

import { getDb } from "@/lib/mock-api/db";
import { adminRoutes } from "@/lib/mock-api/handlers/admins";
import { applicationRoutes } from "@/lib/mock-api/handlers/applications";
import { authRoutes } from "@/lib/mock-api/handlers/auth";
import { complaintRoutes } from "@/lib/mock-api/handlers/complaints";
import { customerRoutes } from "@/lib/mock-api/handlers/customers";
import { dashboardRoutes } from "@/lib/mock-api/handlers/dashboard";
import { financeRoutes } from "@/lib/mock-api/handlers/finance";
import { offerRoutes } from "@/lib/mock-api/handlers/offers";
import { orderRoutes } from "@/lib/mock-api/handlers/orders";
import { platformRoutes } from "@/lib/mock-api/handlers/platform";
import { reviewRoutes } from "@/lib/mock-api/handlers/reviews";
import { washRoutes } from "@/lib/mock-api/handlers/washes";
import { MockApiError, fail } from "@/lib/mock-api/http";
import { type HttpMethod, type RouteDef, matchPath } from "@/lib/mock-api/router";

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

  let matched: { def: RouteDef; params: Record<string, string> } | null = null;
  for (const def of ROUTES) {
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
  const adminId = token ? db.sessions[token] : undefined;
  const admin = adminId ? db.admins.find((a) => a.id === adminId && a.status === "active") : undefined;

  if (!matched.def.isPublic && !admin) {
    return fail("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى", 401);
  }

  try {
    return await matched.def.handler({
      db,
      params: matched.params,
      query: new URL(req.url).searchParams,
      body: await readBody(req),
      admin: admin!,
      token,
    });
  } catch (error) {
    if (error instanceof MockApiError) return fail(error.message, error.httpStatus, error.errors);
    console.error("[mock-api]", method, path, error);
    return fail("حدث خطأ غير متوقع في الخادم", 500);
  }
}
