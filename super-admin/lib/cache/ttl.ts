/**
 * React Query stale times in seconds (×1000 at the call site).
 * Admin data changes constantly, so lists stay short-lived; reference data
 * (settings, roles) can be cached longer.
 */

/** Live operational data (dashboard, orders, complaints). */
export const CACHE_TTL_LIVE = 15;

/** Regular lists and detail pages. */
export const CACHE_TTL_DYNAMIC = 30;

/** Reference data that rarely changes (settings, roles matrix, admins). */
export const CACHE_TTL_REFERENCE = 5 * 60;
