/**
 * Admin API base. Defaults to the bundled mock API (`/api/v1`, same origin).
 * Set NEXT_PUBLIC_API_URL to the Laravel backend when it is available.
 */
const MOCK_API_BASE = "/api/v1";

export function normalizeApiBaseUrl(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim().replace(/\/$/, "");
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return trimmed;
  } catch {
    return undefined;
  }
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL) ?? MOCK_API_BASE;
}

export function isUsingMockApi(): boolean {
  return getApiBaseUrl() === MOCK_API_BASE;
}
