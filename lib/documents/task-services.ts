import type {
  DocumentTask,
  DocumentTaskService,
  DocumentTaskServiceFormInput,
} from "@/lib/types/documents";

export function mapDocumentTaskService(row: Record<string, unknown>): DocumentTaskService {
  return {
    id: String(row.id),
    document_task_id: Number(row.document_task_id),
    service_name: String(row.service_name ?? ""),
    service_price: row.service_price != null ? Number(row.service_price) : 0,
    cost_price: row.cost_price != null ? Number(row.cost_price) : 0,
    notes: (row.notes as string | null) ?? null,
    sort_order: row.sort_order != null ? Number(row.sort_order) : 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export function sortDocumentTaskServices(services: DocumentTaskService[]): DocumentTaskService[] {
  return [...services].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function calculateServiceTotals(
  services: Array<Pick<DocumentTaskService, "service_price" | "cost_price">>
) {
  let totalServicePrice = 0;
  let totalCostPrice = 0;

  for (const service of services) {
    totalServicePrice += Number(service.service_price ?? 0);
    totalCostPrice += Number(service.cost_price ?? 0);
  }

  return {
    totalServicePrice,
    totalCostPrice,
    profit: totalServicePrice - totalCostPrice,
  };
}

export function taskHasServiceRows(
  task: Pick<DocumentTask, "services"> & { services?: DocumentTaskService[] }
): boolean {
  return Boolean(task.services?.length);
}

/** Prefer line-item totals; fall back to legacy parent columns when no rows exist. */
export function resolveTaskPricing(
  task: Pick<DocumentTask, "service_price" | "cost_price"> & {
    services?: DocumentTaskService[];
  }
) {
  if (task.services?.length) {
    const totals = calculateServiceTotals(task.services);
    return {
      servicePrice: totals.totalServicePrice,
      costPrice: totals.totalCostPrice,
      profit: totals.profit,
      usesServiceRows: true as const,
    };
  }

  const servicePrice = Number(task.service_price ?? 0);
  const costPrice = Number(task.cost_price ?? 0);
  return {
    servicePrice,
    costPrice,
    profit: servicePrice - costPrice,
    usesServiceRows: false as const,
  };
}

export function createEmptyServiceRow(sortOrder = 0): DocumentTaskServiceFormInput {
  return {
    service_name: "",
    service_code: null,
    service_price: 0,
    cost_price: 0,
    notes: null,
    sort_order: sortOrder,
  };
}

export function servicesToFormState(
  task: Pick<
    DocumentTask,
    | "service_type"
    | "work_type"
    | "custom_service_name"
    | "service_price"
    | "cost_price"
  > & { services?: DocumentTaskService[] }
): DocumentTaskServiceFormInput[] {
  if (task.services?.length) {
    return sortDocumentTaskServices(task.services).map((service, index) => ({
      id: service.id,
      service_name: service.service_name,
      service_code: null,
      service_price: service.service_price,
      cost_price: service.cost_price,
      notes: service.notes,
      sort_order: service.sort_order ?? index,
    }));
  }

  const legacyName =
    task.custom_service_name?.trim() ||
    task.service_type ||
    task.work_type ||
    "";

  if (!legacyName && task.service_price == null && task.cost_price == null) {
    return [createEmptyServiceRow()];
  }

  return [
    {
      service_name: legacyName,
      service_code: task.service_type ?? task.work_type ?? null,
      service_price: Number(task.service_price ?? 0),
      cost_price: Number(task.cost_price ?? 0),
      notes: null,
      sort_order: 0,
    },
  ];
}

export function normalizeServiceFormRows(
  services: DocumentTaskServiceFormInput[] | undefined
): DocumentTaskServiceFormInput[] {
  if (!services?.length) return [createEmptyServiceRow()];
  return services.map((service, index) => ({
    id: service.id,
    service_name: service.service_name?.trim() ?? "",
    service_code: service.service_code ?? null,
    service_price: Number(service.service_price ?? 0),
    cost_price: Number(service.cost_price ?? 0),
    notes: service.notes?.trim() ? service.notes.trim() : null,
    sort_order: index,
  }));
}

export function derivePrimaryServiceType(
  services: DocumentTaskServiceFormInput[]
): { service_type: string | null; custom_service_name: string | null } {
  const first = services.find((service) => service.service_name.trim());
  if (!first) {
    return { service_type: "custom", custom_service_name: null };
  }

  if (first.service_code) {
    return {
      service_type: first.service_code,
      custom_service_name: first.service_code === "custom" ? first.service_name : null,
    };
  }

  return {
    service_type: "custom",
    custom_service_name: first.service_name,
  };
}
