"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Trash2 } from "lucide-react";
import {
  DEFAULT_EMPLOYEE_COMMISSION_PERCENT,
  type DetailingOrderStatus,
  type DetailingPriceType,
} from "@/lib/constants/detailing";
import { calculateServiceCommission } from "@/lib/detailing/commission";
import {
  calculateLineTotal,
  defaultUnitPriceForService,
} from "@/lib/detailing/pricing";
import { groupDetailingServicesByCategory } from "@/lib/detailing/service-catalog";
import {
  formatDetailingServicePrice,
  getDetailingServiceName,
} from "@/lib/detailing/service-labels";
import { getDetailingEmployeeDisplayName } from "@/lib/detailing/employee-display";
import { isValidLocale, type AppLocale } from "@/i18n/config";
import { useLocale } from "next-intl";
import type { DetailingEmployeeWithProfile, DetailingService } from "@/lib/types/detailing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";

export type ServiceLine = {
  key: string;
  id?: string;
  service_id: string | null;
  service_name_snapshot: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  price_type?: DetailingPriceType | null;
  assigned_employee_id?: string | null;
  commission_percent?: number | null;
};

type DetailingServicePickerProps = {
  services: DetailingService[];
  employees: DetailingEmployeeWithProfile[];
  lines: ServiceLine[];
  onChange: (lines: ServiceLine[]) => void;
  orderStatus?: DetailingOrderStatus;
  catalogueLoadFailed?: boolean;
};

function needsPriceVerification(priceType?: DetailingPriceType | null): boolean {
  return (
    priceType === "from" ||
    priceType === "range" ||
    priceType === "on_request" ||
    priceType === "custom"
  );
}

function defaultCommissionPercent(
  employeeId: string | null | undefined,
  employees: DetailingEmployeeWithProfile[]
): number {
  if (!employeeId) return DEFAULT_EMPLOYEE_COMMISSION_PERCENT;
  const employee = employees.find((item) => item.profile_id === employeeId);
  return employee?.commission_percent ?? DEFAULT_EMPLOYEE_COMMISSION_PERCENT;
}

function toServiceLine(service: DetailingService, locale: AppLocale): ServiceLine {
  const unitPrice = defaultUnitPriceForService(service);
  return {
    key: `${service.id}-${Date.now()}-${Math.random()}`,
    service_id: service.id,
    service_name_snapshot: getDetailingServiceName(service, locale),
    quantity: 1,
    unit_price: unitPrice,
    total_price: calculateLineTotal(unitPrice, 1),
    price_type: service.price_type,
    assigned_employee_id: null,
    commission_percent: null,
  };
}

export function DetailingServicePicker({
  services,
  employees,
  lines,
  onChange,
  orderStatus = "scheduled",
  catalogueLoadFailed = false,
}: DetailingServicePickerProps) {
  const t = useTranslations("detailing");
  const rawLocale = useLocale();
  const locale: AppLocale = isValidLocale(rawLocale) ? rawLocale : "ru";
  const { formatCurrency } = useFormatters();
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const priceLabels = {
    from: t("priceLabels.from"),
    range: t("priceLabels.range"),
    perItem: t("priceLabels.perItem"),
    onRequest: t("priceLabels.onRequest"),
    custom: t("priceLabels.custom"),
  };

  const filteredByCategory = useMemo(
    () =>
      groupDetailingServicesByCategory(services, {
        locale,
        search,
        activeOnly: true,
      }),
    [services, search, locale]
  );

  const activeServiceCount = useMemo(
    () => services.filter((service) => service.active).length,
    [services]
  );

  function addService(service: DetailingService) {
    onChange([...lines, toServiceLine(service, locale)]);
  }

  function addCustomService() {
    const name = customName.trim();
    if (!name) return;
    const unitPrice = customPrice.trim() === "" ? null : Number(customPrice.replace(",", "."));
    onChange([
      ...lines,
      {
        key: `custom-${Date.now()}`,
        service_id: null,
        service_name_snapshot: name,
        quantity: 1,
        unit_price: unitPrice,
        total_price: calculateLineTotal(unitPrice, 1),
        price_type: "custom",
        assigned_employee_id: null,
        commission_percent: null,
      },
    ]);
    setCustomName("");
    setCustomPrice("");
  }

  function updateLine(key: string, patch: Partial<ServiceLine>) {
    onChange(
      lines.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };

        if ("assigned_employee_id" in patch) {
          next.commission_percent = next.assigned_employee_id
            ? defaultCommissionPercent(next.assigned_employee_id, employees)
            : null;
        }

        next.total_price = calculateLineTotal(next.unit_price, next.quantity);
        return next;
      })
    );
  }

  function removeLine(key: string) {
    onChange(lines.filter((line) => line.key !== key));
  }

  const emptyCatalogueMessage = catalogueLoadFailed
    ? t("servicesLoadFailed")
    : activeServiceCount === 0
      ? t("noServicesInCatalogue")
      : t("noServicesFound");

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchServicesPlaceholder")}
        />
      </div>

      <div className="max-h-48 space-y-3 overflow-y-auto rounded-lg border border-zinc-800 p-3">
        {filteredByCategory.map(({ category, items }) => (
          <div key={category}>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t(`categories.${category}`)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((service) => (
                <Button
                  key={service.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal py-1 text-left text-xs"
                  onClick={() => addService(service)}
                >
                  <Plus className="mr-1 h-3 w-3 shrink-0" />
                  {getDetailingServiceName(service, locale)}
                  <span className="ml-1 text-zinc-500">
                    ({formatDetailingServicePrice(service, formatCurrency, priceLabels)})
                  </span>
                </Button>
              ))}
            </div>
          </div>
        ))}
        {!filteredByCategory.length ? (
          <p className="text-sm text-zinc-500">{emptyCatalogueMessage}</p>
        ) : null}
      </div>

      <div className="rounded-lg border border-dashed border-zinc-700 p-3">
        <p className="mb-2 text-sm font-medium text-zinc-300">{t("addCustomService")}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={t("fields.serviceName")}
          />
          <Input
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder={t("fields.unitPrice")}
          />
          <Button type="button" variant="secondary" onClick={addCustomService} disabled={!customName.trim()}>
            {t("addService")}
          </Button>
        </div>
      </div>

      {lines.length ? (
        <div className="space-y-2">
          <div className="hidden text-xs text-zinc-500 xl:grid xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_70px_90px_90px_80px_90px_40px] xl:gap-2 xl:px-1">
            <span>{t("fields.serviceName")}</span>
            <span>{t("fields.serviceEmployee")}</span>
            <span>{t("fields.quantity")}</span>
            <span>{t("fields.unitPrice")}</span>
            <span>{t("fields.lineTotal")}</span>
            <span>{t("fields.commissionPercent")}</span>
            <span>{t("fields.commissionAmount")}</span>
            <span />
          </div>
          {lines.map((line) => {
            const commissionPercent =
              line.commission_percent ??
              defaultCommissionPercent(line.assigned_employee_id, employees);
            const commissionAmount = calculateServiceCommission(
              line.total_price,
              commissionPercent,
              orderStatus
            );

            return (
              <div
                key={line.key}
                className="grid gap-2 rounded-lg border border-zinc-800 p-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_70px_90px_90px_80px_90px_40px]"
              >
                <div className="space-y-1">
                  <Input
                    value={line.service_name_snapshot}
                    onChange={(e) => updateLine(line.key, { service_name_snapshot: e.target.value })}
                  />
                  {needsPriceVerification(line.price_type) ? (
                    <p className="text-xs text-amber-400">{t("verifyPriceHint")}</p>
                  ) : line.price_type ? (
                    <p className="text-xs text-zinc-500">{t(`priceTypes.${line.price_type}`)}</p>
                  ) : null}
                </div>
                <Select
                  value={line.assigned_employee_id || "none"}
                  onValueChange={(value) =>
                    updateLine(line.key, {
                      assigned_employee_id: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={t("fields.unassigned")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("fields.unassigned")}</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.profile_id} value={employee.profile_id}>
                        {getDetailingEmployeeDisplayName(employee)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) || 1 })}
                />
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={line.unit_price ?? ""}
                  placeholder="—"
                  onChange={(e) =>
                    updateLine(line.key, {
                      unit_price: e.target.value === "" ? null : Number(e.target.value.replace(",", ".")),
                    })
                  }
                />
                <div className="flex h-10 items-center text-sm text-zinc-300">
                  {formatCurrency(line.total_price)}
                </div>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={line.assigned_employee_id ? commissionPercent : ""}
                  placeholder="—"
                  disabled={!line.assigned_employee_id}
                  onChange={(e) =>
                    updateLine(line.key, {
                      commission_percent:
                        e.target.value === "" ? null : Number(e.target.value.replace(",", ".")),
                    })
                  }
                />
                <div className="flex h-10 items-center text-sm text-zinc-300">
                  {line.assigned_employee_id ? formatCurrency(commissionAmount) : "—"}
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.key)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">{t("noServicesSelected")}</p>
      )}
    </div>
  );
}
