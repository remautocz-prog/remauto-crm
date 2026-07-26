export type Client = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentTask = {
  id: number;
  title?: string | null;
  name?: string | null;
  task_name?: string | null;
  type?: string | null;
  status: string;
  car_id: number | null;
  client_id: number | null;
  created_at: string;
  updated_at?: string | null;
};

export type DetailingOrder = {
  id: number;
  car_id: number | null;
  client_id: number | null;
  service_type: string;
  status: string;
  price: number;
  scheduled_at: string | null;
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

export function getClientName(client: Client, dash = "—") {
  return client.full_name ?? dash;
}

export function getDocumentTaskTitle(
  task: DocumentTask,
  fallback: (id: number) => string
) {
  return task.title ?? task.name ?? task.task_name ?? fallback(task.id);
}
