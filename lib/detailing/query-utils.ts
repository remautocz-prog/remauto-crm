export type SupabaseQueryError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export type DetailingRequiredTable =
  | "detailing_services"
  | "detailing_orders"
  | "detailing_order_services"
  | "detailing_employee_settings"
  | "detailing_expenses";

export const DETAILING_REQUIRED_TABLES: DetailingRequiredTable[] = [
  "detailing_services",
  "detailing_orders",
  "detailing_order_services",
  "detailing_employee_settings",
  "detailing_expenses",
];

export type DetailingTableCheck = {
  table: DetailingRequiredTable;
  ok: boolean;
  error?: SupabaseQueryError;
};

export type DetailingReadinessResult = {
  ready: boolean;
  checks: DetailingTableCheck[];
  missingTables: DetailingRequiredTable[];
};

export type DetailingQueryWarning = {
  query: string;
  message: string;
  code?: string;
};

export class DetailingDatabaseUnavailableError extends Error {
  readonly missingTables: DetailingRequiredTable[];
  readonly checks: DetailingTableCheck[];

  constructor(
    missingTables: DetailingRequiredTable[],
    checks: DetailingTableCheck[],
    message = "Detailing database is not ready. Apply migrations 018 and 019."
  ) {
    super(message);
    this.name = "DetailingDatabaseUnavailableError";
    this.missingTables = missingTables;
    this.checks = checks;
  }
}

export class DetailingQueryError extends Error {
  readonly queryName: string;
  readonly code?: string;

  constructor(queryName: string, error: SupabaseQueryError) {
    super(error.message ?? `Detailing query failed: ${queryName}`);
    this.name = "DetailingQueryError";
    this.queryName = queryName;
    this.code = error.code;
  }
}

export function logDetailingQueryError(
  queryName: string,
  error: SupabaseQueryError
): void {
  console.error("[detailing-query]", {
    query: queryName,
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
}

/** True only when the relation/table itself is missing from the database or API schema. */
export function isMissingRelationError(error: SupabaseQueryError): boolean {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "42P01") return true;
  if (code === "PGRST205") return true;

  if (message.includes("relation") && message.includes("does not exist")) return true;
  if (message.includes("could not find the table") && message.includes("schema cache")) {
    return true;
  }

  return false;
}

/** @deprecated Use isMissingRelationError — kept for dashboard integration. */
export function isDetailingDatabaseUnavailableError(error: SupabaseQueryError): boolean {
  return isMissingRelationError(error);
}

export function handleDetailingQueryError(
  queryName: string,
  error: SupabaseQueryError
): never {
  logDetailingQueryError(queryName, error);
  throw new DetailingQueryError(queryName, error);
}

export async function verifyDetailingDatabaseReadiness(): Promise<DetailingReadinessResult> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const checks: DetailingTableCheck[] = [];

  for (const table of DETAILING_REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error) {
      logDetailingQueryError(`readiness.${table}`, error);
      checks.push({ table, ok: false, error });
    } else {
      checks.push({ table, ok: true });
    }
  }

  const missingTables = checks
    .filter((check) => !check.ok && check.error && isMissingRelationError(check.error))
    .map((check) => check.table);

  const ready = missingTables.length === 0;

  console.info("[detailing-readiness]", {
    ready,
    missingTables,
    checks: checks.map((check) => ({
      table: check.table,
      ok: check.ok,
      code: check.error?.code ?? null,
      message: check.error?.message ?? null,
    })),
  });

  return { ready, checks, missingTables };
}

function isSupabaseQueryError(error: unknown): error is SupabaseQueryError {
  if (typeof error !== "object" || error === null) return false;
  return "message" in error || "code" in error;
}

export function toQueryWarning(error: unknown, query = "unknown"): DetailingQueryWarning {
  if (error instanceof DetailingQueryError) {
    return {
      query: error.queryName,
      message: error.message,
      code: error.code,
    };
  }
  if (error instanceof Error) {
    return { query, message: error.message };
  }
  if (isSupabaseQueryError(error)) {
    return {
      query,
      message: error.message ?? "Unknown detailing query error",
      code: error.code,
    };
  }
  return { query, message: "Unknown detailing query error" };
}

export function formatQueryWarning(warning: DetailingQueryWarning): string {
  const code = warning.code ? ` (${warning.code})` : "";
  return `${warning.query}${code}: ${warning.message}`;
}

export async function safeDetailingQuery<T>(
  queryName: string,
  fn: () => Promise<T>,
  fallback: T,
  warnings: DetailingQueryWarning[]
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const warning = toQueryWarning(error, queryName);
    warnings.push(warning);
    console.error("[detailing-query-safe]", formatQueryWarning(warning));
    return fallback;
  }
}
