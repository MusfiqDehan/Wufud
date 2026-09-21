/** Array fields that UIs treat as lists; keep `[]` so clients never see `undefined`. */
const KEEP_EMPTY_ARRAY_KEYS = new Set([
  "items",
  "role_slugs",
  "enabled_features",
  "package_gated_features",
  "errors",
  "non_field_errors",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function omitEmpty<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date || typeof value !== "object") {
    return value;
  }
  if (seen.has(value as object)) {
    return undefined as T;
  }
  seen.add(value as object);

  try {
  
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return value;
      }
      return value.map((item) => omitEmpty(item, seen)) as T;
    }
  
    if (!isPlainObject(value)) {
      const maybeJson =
        typeof (value as { toJSON?: () => unknown }).toJSON === "function"
          ? (value as unknown as { toJSON: () => unknown }).toJSON()
          : undefined;
      if (maybeJson !== undefined && maybeJson !== value) {
        return omitEmpty(maybeJson as T, seen);
      }
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        if (val === null || val === undefined) continue;
        if (typeof val === "function") continue;
        if (val && typeof val === "object" && val.constructor?.name === "Collection") continue;
        out[key] = omitEmpty(val, seen);
      }
      return out as T;
    }
  
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (val === null || val === undefined) {
        continue;
      }
      if (typeof val === "object" && !Array.isArray(val) && !(val instanceof Date) && isPlainObject(val) && Object.keys(val).length === 0) {
        continue;
      }
      if (Array.isArray(val) && val.length === 0 && !KEEP_EMPTY_ARRAY_KEYS.has(key)) {
        continue;
      }
      out[key] = omitEmpty(val, seen);
    }
    return out as T;
  } finally {
    // Only ancestors are circular; sibling references must serialize independently.
    seen.delete(value as object);
  }
}
