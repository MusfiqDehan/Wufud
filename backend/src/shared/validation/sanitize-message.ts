import { ErrorCode, ERROR_MESSAGES } from "@wufud/contracts";

const INTERNAL_PATTERNS = [
  /\bselect\b.+\bfrom\b/i,
  /\binsert\b.+\binto\b/i,
  /\bupdate\b.+\bset\b/i,
  /\bexception\b/i,
  /\bstack\b/i,
  /\btraceback\b/i,
  /at\s+\S+\.(ts|js|py):\d+/i,
  /\bpostgres\b/i,
  /\bconstraint\b/i,
  /\bviolat/i,
  /password\s*[:=]/i,
  /token\s*[:=]/i,
  /secret\s*[:=]/i,
  /api[_-]?key/i,
];

export function sanitizePublicMessage(
  text: string | undefined,
  code: ErrorCode,
  status: number,
): string {
  const fallback = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  if (!text || typeof text !== "string") return fallback;
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  if (status >= 500) return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  if (trimmed.length > 240) return fallback;
  if (INTERNAL_PATTERNS.some((re) => re.test(trimmed))) return fallback;
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}
