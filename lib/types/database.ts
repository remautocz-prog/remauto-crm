export type Client = import("@/lib/types/clients").Client;
export type DocumentTask = import("@/lib/types/documents").DocumentTask;
export type DetailingOrder = import("@/lib/types/detailing").DetailingOrderWithServices;

export type FinanceTransaction = {
  id: number;
  type: "income" | "expense" | string;
  category: string;
  amount: number;
  description: string | null;
  car_id: number | null;
  transaction_date: string;
  created_at: string;
};

export type DashboardStats = {
  totalCars: number;
  carsInStock: number;
  carsSold: number;
  openDocumentTasks: number;
  activeDetailingOrders: number;
  monthlyProfit: number;
};

export function getClientName(client: Pick<Client, "full_name" | "company" | "client_type">, dash = "—") {
  if (client.client_type === "company" && client.company?.trim()) {
    return client.company.trim();
  }
  return client.full_name?.trim() || client.company?.trim() || dash;
}

export function getDocumentTaskTitle(
  task: Pick<
    DocumentTask,
    "id" | "service_type" | "work_type" | "custom_service_name"
  >,
  fallback: (id: number) => string,
  serviceLabel?: string
) {
  const serviceType = task.service_type ?? task.work_type;
  if (serviceLabel?.trim()) return serviceLabel;
  if (serviceType === "custom" && task.custom_service_name?.trim()) {
    return task.custom_service_name.trim();
  }
  if (serviceType) return serviceType;
  return fallback(task.id);
}
