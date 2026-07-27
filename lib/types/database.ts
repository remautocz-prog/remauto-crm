export type Client = import("@/lib/types/clients").Client;

export type DocumentTask = {
  id: number;
  title?: string | null;
  name?: string | null;
  task_name?: string | null;
  type?: string | null;
  status: string;
  car_id: number | null;
  client_id: number | null;
  deadline?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type DetailingOrder = {
  id: number;
  car_id: number | null;
  client_id: number | null;
  service_type?: string | null;
  status: string;
  price: number;
  scheduled_at?: string | null;
  manager_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

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
  task: DocumentTask,
  fallback: (id: number) => string
) {
  return task.title ?? task.name ?? task.task_name ?? fallback(task.id);
}
