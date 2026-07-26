import type { Metadata } from "next";
import { PageHeader, DataTable } from "@/components/shared/page-shell";
import { getClients } from "@/lib/queries/modules";
import { getClientName } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Clients",
};

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="View and manage your client database."
      />
      <DataTable
        title="Clients"
        headers={["Name", "Email", "Phone", "Company"]}
        rows={clients.map((client) => [
          getClientName(client),
          client.email ?? "—",
          client.phone ?? "—",
          client.company ?? "—",
        ])}
      />
    </div>
  );
}
