import type { Metadata } from "next";
import { PageHeader, DataTable } from "@/components/shared/page-shell";
import { formatCurrency } from "@/lib/utils";
import { getDetailingOrders } from "@/lib/queries/modules";

export const metadata: Metadata = {
  title: "Detailing",
};

export default async function DetailingPage() {
  const orders = await getDetailingOrders();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detailing"
        description="Monitor detailing orders and service pipeline."
      />
      <DataTable
        title="Detailing orders"
        headers={["Service", "Status", "Price", "Scheduled"]}
        rows={orders.map((order) => [
          order.service_type,
          order.status,
          formatCurrency(Number(order.price)),
          order.scheduled_at
            ? new Date(order.scheduled_at).toLocaleDateString()
            : "—",
        ])}
      />
    </div>
  );
}
