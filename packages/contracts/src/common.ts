/** Bilingual text as stored by the Carzen platform (`{ ar, en }`). */
export type Localized = {
  ar: string;
  en: string;
};

/** Laravel-style paginator meta — same shape the backend will return. */
export interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
  has_next: boolean;
}

/** Response envelope used by every admin endpoint. */
export interface ApiEnvelope<T, M = undefined> {
  status: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
  meta?: M;
}

/** Normalized paginated result returned by services to hooks/UI. */
export interface Paginated<T, M = undefined> {
  items: T[];
  pagination: Pagination;
  meta: M;
}

export type SortOrder = "asc" | "desc";

export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  order?: SortOrder;
}

/** Status → count map used by tab/chip filters. */
export type StatusCounts<S extends string> = Record<S | "all", number>;

/** Body shared by every sensitive admin mutation (written to the audit log). */
export interface ReasonPayload {
  reason: string;
}
