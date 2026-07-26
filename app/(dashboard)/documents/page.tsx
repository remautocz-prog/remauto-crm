import type { Metadata } from "next";
import { PageHeader, DataTable } from "@/components/shared/page-shell";
import { getDocumentTasks } from "@/lib/queries/modules";
import { getDocumentTaskTitle } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Documents",
};

export default async function DocumentsPage() {
  const tasks = await getDocumentTasks();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Track open and completed document tasks."
      />
      <DataTable
        title="Document tasks"
        headers={["Task", "Type", "Status", "Car ID", "Created"]}
        rows={tasks.map((task) => [
          getDocumentTaskTitle(task),
          task.type ?? "—",
          task.status,
          task.car_id ? String(task.car_id) : "—",
          new Date(task.created_at).toLocaleDateString(),
        ])}
      />
    </div>
  );
}
