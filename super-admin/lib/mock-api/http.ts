import "server-only";

import type { Pagination } from "@/types/common";

/** Thrown inside handlers; converted to a `{ status: false }` envelope. */
export class MockApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus = 422,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, message = "OK", extras?: { pagination?: Pagination; meta?: unknown }) {
  return Response.json({ status: true, message, data, ...extras });
}

export function fail(message: string, httpStatus = 422, errors?: Record<string, string[]>) {
  return Response.json({ status: false, message, data: null, errors }, { status: httpStatus });
}

export function notFound(entity = "العنصر"): never {
  throw new MockApiError(`${entity} غير موجود`, 404);
}

/** Validates a required, trimmed text field (reasons, notes…). */
export function requireText(value: unknown, field: string, label: string, min = 3): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < min) {
    throw new MockApiError(`${label} مطلوب`, 422, { [field]: [`${label} مطلوب (${min} أحرف على الأقل)`] });
  }
  return text;
}

export function paginate<T>(list: T[], query: URLSearchParams, defaultPerPage = 10) {
  const perPage = clampInt(query.get("per_page"), defaultPerPage, 1, 100);
  const total = list.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const page = clampInt(query.get("page"), 1, 1, lastPage);
  const start = (page - 1) * perPage;
  const items = list.slice(start, start + perPage);

  const pagination: Pagination = {
    current_page: page,
    per_page: perPage,
    total,
    last_page: lastPage,
    from: total === 0 ? 0 : start + 1,
    to: start + items.length,
    has_next: page < lastPage,
  };
  return { items, pagination };
}

function clampInt(raw: string | null, fallback: number, min: number, max: number) {
  const n = Number.parseInt(raw ?? "", 10);
  if (Number.isNaN(n)) return Math.min(Math.max(fallback, min), max);
  return Math.min(Math.max(n, min), max);
}

type Sortable = string | number | boolean | null | undefined;

/** Generic `?sort=field&order=asc|desc` support over a value accessor map. */
export function sortBy<T>(
  list: T[],
  query: URLSearchParams,
  accessors: Record<string, (item: T) => Sortable>,
  fallback: { key: string; order: "asc" | "desc" },
): T[] {
  const key = query.get("sort") ?? fallback.key;
  const order = (query.get("order") as "asc" | "desc" | null) ?? fallback.order;
  const accessor = accessors[key] ?? accessors[fallback.key];
  if (!accessor) return list;
  const dir = order === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const va = accessor(a);
    const vb = accessor(b);
    if (va === vb) return 0;
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    return va > vb ? dir : -dir;
  });
}

export function matchesSearch(query: URLSearchParams, ...fields: (string | null | undefined)[]) {
  const q = query.get("search")?.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}

export function countBy<T, K extends string>(list: T[], keys: readonly K[], pick: (item: T) => string) {
  const counts = Object.fromEntries([...keys, "all"].map((k) => [k, 0])) as Record<K | "all", number>;
  for (const item of list) {
    const k = pick(item) as K;
    if (k in counts) counts[k] += 1;
    counts.all += 1;
  }
  return counts;
}
