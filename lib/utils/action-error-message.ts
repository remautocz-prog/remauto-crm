import { isInternalErrorText } from "@/lib/utils/user-error-classifier";

const NON_DISPLAYABLE_PRIMITIVES = new Set([
  "0",
  "1",
  "true",
  "false",
  "undefined",
  "null",
]);

function isNonDisplayablePrimitive(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return value === 0 || value === 1;
  if (typeof value === "string") {
    return NON_DISPLAYABLE_PRIMITIVES.has(value.trim().toLowerCase());
  }
  return false;
}

function appendPart(parts: string[], value: unknown, label?: string) {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || isNonDisplayablePrimitive(trimmed)) return;
    parts.push(label ? `${label}: ${trimmed}` : trimmed);
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    if (isNonDisplayablePrimitive(value)) return;
    parts.push(label ? `${label}: ${String(value)}` : String(value));
    return;
  }
  if (typeof value === "object") {
    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== "{}" && serialized !== "[]") {
        parts.push(label ? `${label}: ${serialized}` : serialized);
      }
    } catch {
      parts.push(label ? `${label}: [object]` : "[object]");
    }
  }
}

/** Extract a human-readable message from any thrown/returned error value. */
export function extractErrorMessage(error: unknown): string {
  if (error == null) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed && !isNonDisplayablePrimitive(trimmed) ? trimmed : "Unknown error";
  }

  if (typeof error === "number" || typeof error === "boolean") {
    return isNonDisplayablePrimitive(error) ? "Unknown error" : String(error);
  }

  if (error instanceof Error) {
    const parts: string[] = [];
    appendPart(parts, error.message, error.name !== "Error" ? error.name : undefined);
    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts: string[] = [];

    appendPart(parts, record.message);
    appendPart(parts, record.error_description);
    appendPart(parts, record.error);
    appendPart(parts, record.code, "code");
    appendPart(parts, record.status, "status");
    appendPart(parts, record.details, "details");
    appendPart(parts, record.hint, "hint");

    if (parts.length > 0) {
      return parts.join(" | ");
    }

    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}" && serialized !== "[]") {
        return serialized;
      }
    } catch {
      // fall through
    }
  }

  const fallback = String(error).trim();
  return fallback && !isNonDisplayablePrimitive(fallback) ? fallback : "Unknown error";
}

/** Normalize action error payloads for UI display. Never renders internal backend text. */
export function normalizeActionError(error: unknown, fallback: string): string {
  const message =
    typeof error === "string" ? error.trim() : extractErrorMessage(error);
  if (!message || isInternalErrorText(message)) {
    return fallback;
  }
  return message;
}
