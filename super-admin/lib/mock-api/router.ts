import "server-only";

import type { MockDatabase, StoredAdmin } from "@/lib/mock-api/schema";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HandlerContext {
  db: MockDatabase;
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  /** Authenticated admin (null only on public routes). */
  admin: StoredAdmin;
  token: string | null;
}

export type Handler = (ctx: HandlerContext) => Response | Promise<Response>;

export interface RouteDef {
  method: HttpMethod;
  path: string;
  handler: Handler;
  /** Public routes skip the Bearer check (login). */
  isPublic?: boolean;
}

export function route(method: HttpMethod, path: string, handler: Handler, isPublic = false): RouteDef {
  return { method, path, handler, isPublic };
}

/** Matches `/admin/washes/:id/suspend` against `/admin/washes/biz_1/suspend`. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].startsWith(":")) {
      params[a[i].slice(1)] = decodeURIComponent(b[i]);
    } else if (a[i] !== b[i]) {
      return null;
    }
  }
  return params;
}
