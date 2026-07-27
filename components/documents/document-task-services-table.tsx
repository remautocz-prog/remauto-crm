"use client";

import { useTranslations } from "next-intl";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";
import { calculateServiceTotals, sortDocumentTaskServices } from "@/lib/documents/task-services";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DocumentTaskServicesTableProps = {
  task: DocumentTaskWithRelations;
};

export function DocumentTaskServicesTable({ task }: DocumentTaskServicesTableProps) {
  const t = useTranslations("documents");
  const { formatCurrency } = useFormatters();

  const services = task.services?.length
    ? sortDocumentTaskServices(task.services)
    : [
        {
          id: "legacy",
          document_task_id: task.id,
          service_name:
            task.custom_service_name?.trim() ||
            task.service_type ||
            task.work_type ||
            t("service"),
          service_price: Number(task.service_price ?? 0),
          cost_price: Number(task.cost_price ?? 0),
          notes: null,
          sort_order: 0,
          created_at: task.created_at,
          updated_at: task.updated_at,
        },
      ];

  const totals = calculateServiceTotals(services);

  return (
    <div className="space-y-4 text-sm">
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-zinc-900/80 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("service")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("servicePrice")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("costPrice")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("profit")}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => {
              const profit = Number(service.service_price) - Number(service.cost_price);
              return (
                <tr key={service.id} className="border-t border-zinc-800/80">
                  <td className="px-4 py-3 text-zinc-200">
                    <div>{service.service_name}</div>
                    {service.notes ? (
                      <div className="mt-1 text-xs text-zinc-500">{service.notes}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {formatCurrency(service.service_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {formatCurrency(service.cost_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(profit)}</td>
                </tr>
              );
            })}
            <tr className="border-t border-zinc-700 bg-zinc-900/60 font-medium">
              <td className="px-4 py-3 text-white">{t("totalPrice")}</td>
              <td className="px-4 py-3 text-right text-white">
                {formatCurrency(totals.totalServicePrice)}
              </td>
              <td className="px-4 py-3 text-right text-white">
                {formatCurrency(totals.totalCostPrice)}
              </td>
              <td className="px-4 py-3 text-right text-white">{formatCurrency(totals.profit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
