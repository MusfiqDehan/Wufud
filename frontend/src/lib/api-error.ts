import { ERROR_MESSAGES, ErrorCode } from "@wufud/contracts";
import { ApiError } from "@/lib/api";

const NETWORK_FALLBACK = "We couldn't reach the server. Check your connection and try again.";
const GENERIC_FALLBACK = "Something went wrong. Please try again.";

function isErrorCode(value: string | undefined): value is ErrorCode {
  return !!value && value in ERROR_MESSAGES;
}

export function fieldErrorsFromApi(err: ApiError): Record<string, string> {
  if (!err.errors || Array.isArray(err.errors)) return {};
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(err.errors)) {
    const first = messages?.[0];
    if (first) out[field] = first;
  }
  return out;
}

export function formatApiError(err: unknown, fallback = GENERIC_FALLBACK): string {
  if (err instanceof ApiError) {
    if (err.errors && !Array.isArray(err.errors)) {
      const first = Object.values(err.errors).flat()[0];
      if (first) return first;
    }
    if (isErrorCode(err.error_code)) {
      const mapped = ERROR_MESSAGES[err.error_code];
      if (err.message && err.message !== mapped) return err.message;
      return mapped;
    }
    return err.message || fallback;
  }
  if (err instanceof Error) {
    if (err.message === "Failed to fetch") return NETWORK_FALLBACK;
    if (/cannot read propert/i.test(err.message) || /undefined is not/i.test(err.message)) {
      return fallback;
    }
    return err.message || fallback;
  }
  return fallback;
}

export function firstZodIssueMessage(result: { success: false; error: { issues: { message: string }[] } }): string {
  return result.error.issues[0]?.message ?? GENERIC_FALLBACK;
}
