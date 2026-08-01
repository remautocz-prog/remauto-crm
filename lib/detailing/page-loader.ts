import {
  type DetailingQueryWarning,
  type DetailingReadinessResult,
  verifyDetailingDatabaseReadiness,
  toQueryWarning,
} from "@/lib/detailing/query-utils";

export type DetailingPageLoadResult<T> =
  | { blocked: true; readiness: DetailingReadinessResult }
  | { blocked: false; data: T; readiness: DetailingReadinessResult; warnings: DetailingQueryWarning[] };

export async function runDetailingPage<T>(
  loader: () => Promise<T>
): Promise<DetailingPageLoadResult<T>> {
  const readiness = await verifyDetailingDatabaseReadiness();

  if (!readiness.ready) {
    return { blocked: true, readiness };
  }

  try {
    const data = await loader();
    return { blocked: false, data, readiness, warnings: [] };
  } catch (error) {
    const warning = toQueryWarning(error, "page-loader");
    console.error("[detailing-page-loader] loader failed after readiness passed", warning);
    throw error;
  }
}

export async function runDetailingPageSafe<T>(
  loader: () => Promise<T>,
  fallback: T
): Promise<DetailingPageLoadResult<T>> {
  const readiness = await verifyDetailingDatabaseReadiness();

  if (!readiness.ready) {
    return { blocked: true, readiness };
  }

  try {
    const data = await loader();
    return { blocked: false, data, readiness, warnings: [] };
  } catch (error) {
    const warning = toQueryWarning(error, "page-loader");
    console.error("[detailing-page-loader] using fallback after query error", warning);
    return { blocked: false, data: fallback, readiness, warnings: [warning] };
  }
}
