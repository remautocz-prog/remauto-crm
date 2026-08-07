export const DOCUMENTS_WORKLOAD_THRESHOLDS = {
  normalMax: 5,
  busyMax: 10,
} as const;

export const DETAILING_WORKLOAD_THRESHOLDS = {
  normalMax: 3,
  busyMax: 6,
} as const;

export type WorkloadSignal = "normal" | "busy" | "overloaded";

export function getDocumentsWorkloadSignal(activeCount: number): WorkloadSignal {
  if (activeCount > DOCUMENTS_WORKLOAD_THRESHOLDS.busyMax) return "overloaded";
  if (activeCount > DOCUMENTS_WORKLOAD_THRESHOLDS.normalMax) return "busy";
  return "normal";
}

export function getDetailingWorkloadSignal(activeCount: number): WorkloadSignal {
  if (activeCount > DETAILING_WORKLOAD_THRESHOLDS.busyMax) return "overloaded";
  if (activeCount > DETAILING_WORKLOAD_THRESHOLDS.normalMax) return "busy";
  return "normal";
}
