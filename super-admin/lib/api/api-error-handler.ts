import { isAxiosError } from "axios";

const TECHNICAL_ERROR_PATTERNS = [
  /can't access property/i,
  /cannot read propert/i,
  /is null$/i,
  /is undefined$/i,
  /null is not an object/i,
  /undefined is not an object/i,
  /failed to fetch/i,
  /network error/i,
  /\[object object\]/i,
];

export type ApiEnvelope = {
  status?: boolean;
  message?: unknown;
};

export function isApiFailureEnvelope(data: unknown): data is ApiEnvelope & { status: false } {
  return (
    data != null &&
    typeof data === "object" &&
    (data as ApiEnvelope).status === false
  );
}

export function createApiFailureError(
  envelope: ApiEnvelope,
  fallback = "حدث خطأ",
): Error {
  return new Error(getApiEnvelopeMessage(envelope, fallback));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function extractMessageFromRecord(data: Record<string, unknown>): string | null {
  const msg = data.message;
  if (isNonEmptyString(msg)) return msg.trim();

  const err = data.error;
  if (isNonEmptyString(err)) return err.trim();

  const nested = data.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const nestedMessage = (nested as { message?: unknown }).message;
    if (isNonEmptyString(nestedMessage)) return nestedMessage.trim();
  }

  const errors = data.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors as Record<string, unknown>)[0];
    if (Array.isArray(first) && isNonEmptyString(first[0])) return first[0].trim();
    if (isNonEmptyString(first)) return first.trim();
  }

  return null;
}

/** Reads `message` from a Laravel-style `{ status, message, data }` response body. */
export function getApiEnvelopeMessage(
  envelope: ApiEnvelope | null | undefined,
  fallback: string,
): string {
  if (envelope && isNonEmptyString(envelope.message)) {
    return envelope.message.trim();
  }
  return fallback;
}

/**
 * Extracts a user-facing message from axios/API errors.
 * Prefer backend `message` / validation errors over generic fallbacks.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const raw = error.response?.data;
    if (raw && typeof raw === "object") {
      const message = extractMessageFromRecord(raw as Record<string, unknown>);
      if (message) return message;
    }
    if (typeof status === "number" && status >= 500) {
      return `${fallback} (خطأ خادم ${status})`;
    }
  }

  if (error instanceof Error) {
    return resolveUserFacingError(error, fallback);
  }

  return fallback;
}

/** True when the message looks like a raw runtime/JS error, not an API message. */
export function isTechnicalErrorMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Maps any thrown value to a safe user-facing string.
 * Hides technical runtime errors; keeps backend and intentional Error messages.
 */
export function resolveUserFacingError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) return fallback;
  if (isTechnicalErrorMessage(message)) return fallback;
  return message;
}

/** Throws an Error with a user-facing message derived from the API error envelope. */
export function throwApiError(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}
