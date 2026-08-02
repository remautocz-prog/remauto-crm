"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Search, X } from "lucide-react";
import type { Car, ClientOption } from "@/lib/types/cars";
import {
  CAR_SORT_VALUES,
  CAR_STATUS_VALUES,
  type CarSortValue,
} from "@/lib/constants/cars";
import { BUSINESS_MODEL_VALUES } from "@/lib/constants/business-model";
import { getListRowDisplay } from "@/lib/cars/business-rules";
import {
  getCarStatusRowStripe,
  getProfitLabelKey,
  resolveActualSalePrice,
} from "@/lib/cars/display-helpers";
import { BusinessModelBadge } from "@/components/cars/business-model-badge";
import { CarStatusControl } from "@/components/cars/car-status-control";
import { ProfitAmount } from "@/components/cars/profit-amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { translateBusinessModel } from "@/lib/i18n/business-model";
import { translateStatus } from "@/lib/i18n/status";
import { cn } from "@/lib/utils";

const SORT_LABEL_KEYS: Record<CarSortValue, "newest" | "purchaseDate" | "price" | "saleDate"> = {
  newest: "newest",
  purchase_date: "purchaseDate",
  price: "price",
  sale_date: "saleDate",
};

type CarsListProps = {
  cars: Car[];
  clientNames: Record<number, string>;
  clients: ClientOption[];
  expenseTotals: Record<number, number>;
  initialQuery: string;
  initialStatus: string;
  initialBusinessModel: string;
  initialInventory: string;
  initialSort: string;
};

function formatListAmount(
  amount: number | null | undefined,
  isEstimate: boolean | undefined,
  formatCurrency: (value: number) => string,
  estimatedLabel: string,
  dash: string
) {
  if (amount == null) return dash;
  const formatted = formatCurrency(amount);
  return isEstimate ? `${formatted} (${estimatedLabel})` : formatted;
}

export function CarsList({
  cars,
  clientNames,
  clients,
  expenseTotals,
  initialQuery,
  initialStatus,
  initialBusinessModel,
  initialInventory,
  initialSort,
}: CarsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [businessModel, setBusinessModel] = useState(initialBusinessModel);
  const [inventory, setInventory] = useState(initialInventory);
  const [sort, setSort] = useState(initialSort);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );
  const debouncedQuery = useDebouncedValue(query, 350);

  const t = useTranslations("cars");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tSort = useTranslations("sort");
  const tStatus = useTranslations("status");
  const tBusinessModel = useTranslations("businessModel");
  const tCommon = useTranslations("common");
  const { formatCurrency } = useFormatters();
  const dash = tCommon("dash");
  const estimatedLabel = tFields("estimated");

  const showOwnedColumns =
    businessModel === "all" || businessModel === "owned";

  function applyFilters(next: {
    q?: string;
    status?: string;
    business_model?: string;
    inventory?: string;
    sort?: string;
  }) {
    const params = new URLSearchParams();
    const q = next.q ?? query;
    const nextStatus = next.status ?? status;
    const nextBusinessModel = next.business_model ?? businessModel;
    const nextInventory = next.inventory ?? inventory;
    const nextSort = next.sort ?? sort;

    if (q.trim()) params.set("q", q.trim());
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextBusinessModel && nextBusinessModel !== "all") {
      params.set("business_model", nextBusinessModel);
    }
    if (nextInventory && nextInventory !== "all") {
      params.set("inventory", nextInventory);
    }
    if (nextSort && nextSort !== "newest") params.set("sort", nextSort);

    startTransition(() => {
      router.push(`/cars${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  useEffect(() => {
    if (debouncedQuery === initialQuery) return;
    applyFilters({ q: debouncedQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const hasFilters = useMemo(
    () =>
      Boolean(
        initialQuery ||
          (initialStatus && initialStatus !== "all") ||
          (initialBusinessModel && initialBusinessModel !== "all") ||
          (initialInventory && initialInventory !== "all") ||
          (initialSort && initialSort !== "newest")
      ),
    [initialBusinessModel, initialInventory, initialQuery, initialSort, initialStatus]
  );

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setBusinessModel("all");
    setInventory("all");
    setSort("newest");
    startTransition(() => router.push("/cars"));
  }

  function resolveFieldLabel(key: string) {
    if (key === "projectedProfit" || key === "finalProfit") {
      return t(key);
    }
    return tFields(key as "purchasePrice");
  }

  function renderPrimaryCell(
    car: Car,
    display: ReturnType<typeof getListRowDisplay>
  ) {
    if (display.primaryLabelKey === "client") {
      const name = car.client_id ? clientNames[car.client_id] : null;
      return name ?? dash;
    }

    return formatListAmount(
      display.primary.amount,
      display.primary.isEstimate,
      formatCurrency,
      estimatedLabel,
      dash
    );
  }

  function renderCarFinancials(car: Car) {
    const totalExpenses = expenseTotals[car.id] ?? 0;
    const display = getListRowDisplay(
      car,
      totalExpenses,
      car.client_id ? clientNames[car.client_id] : null
    );
    const actualSale = resolveActualSalePrice(car);
    const profitLabelKey = getProfitLabelKey(car);

    return { totalExpenses, display, actualSale, profitLabelKey };
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <p
          className={
            toast.type === "success"
              ? "rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm text-green-400"
              : "rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400"
          }
          role="status"
        >
          {toast.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t("title")}</h2>
          <p className="text-zinc-400">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/cars/new">
            <Plus className="h-4 w-4" />
            {tActions("addCar")}
          </Link>
        </Button>
      </div>

      <Card className="sticky top-0 z-20 border-zinc-800 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/75">
        <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-zinc-400">{tActions("search")}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{tFields("status")}</label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                applyFilters({ status: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={tFields("allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFields("allStatuses")}</SelectItem>
                {CAR_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {translateStatus(tStatus, value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{t("ownershipType")}</label>
            <Select
              value={businessModel}
              onValueChange={(value) => {
                setBusinessModel(value);
                applyFilters({ business_model: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={tFields("allBusinessModels")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFields("allBusinessModels")}</SelectItem>
                {BUSINESS_MODEL_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {translateBusinessModel(tBusinessModel, value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{t("inventoryFilter")}</label>
            <Select
              value={inventory}
              onValueChange={(value) => {
                setInventory(value);
                applyFilters({ inventory: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={tFields("allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFields("allStatuses")}</SelectItem>
                <SelectItem value="active">{t("activeVehicles")}</SelectItem>
                <SelectItem value="sold">{t("soldVehicles")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{tFields("sort")}</label>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value);
                applyFilters({ sort: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={tSort("newest")} />
              </SelectTrigger>
              <SelectContent>
                {CAR_SORT_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {tSort(SORT_LABEL_KEYS[value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters ? (
            <div className="flex items-end md:col-span-2 xl:col-span-6">
              <Button variant="ghost" size="sm" onClick={resetFilters} disabled={isPending}>
                <X className="h-4 w-4" />
                {t("resetFilters")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      ) : null}

      {cars.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium text-white">
              {hasFilters ? t("notFound") : t("empty")}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {hasFilters ? t("notFoundHint") : t("emptyHint")}
            </p>
            {!hasFilters ? (
              <Button asChild className="mt-6">
                <Link href="/cars/new">{tActions("addCar")}</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-zinc-800 lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">{tFields("car")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("vin")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("registrationNumber")}</th>
                  <th className="px-4 py-3 font-medium">{t("ownershipType")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("status")}</th>
                  <th className="px-4 py-3 font-medium">
                    {showOwnedColumns ? tFields("purchasePrice") : tFields("ownerNetAmount")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {showOwnedColumns
                      ? tFields("plannedSalePrice")
                      : tFields("expectedCommission")}
                  </th>
                  {showOwnedColumns ? (
                    <th className="px-4 py-3 font-medium">{tFields("actualSalePrice")}</th>
                  ) : null}
                  <th className="px-4 py-3 font-medium">{tFields("totalExpenses")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("netProfit")}</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => {
                  const { totalExpenses, display, actualSale, profitLabelKey } =
                    renderCarFinancials(car);

                  return (
                    <tr
                      key={car.id}
                      className={cn(
                        "border-t border-zinc-800/80 border-l-4 hover:bg-zinc-900/50",
                        getCarStatusRowStripe(car.status)
                      )}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/cars/${car.id}`}
                          className="text-base font-semibold text-white hover:text-red-400"
                        >
                          {car.brand} {car.model}
                        </Link>
                        <p className="text-xs text-zinc-500">
                          {car.year} {t("yearSuffix")}
                          {car.stock_number ? ` · ${car.stock_number}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                        {car.vin ?? dash}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {car.registration_number ?? dash}
                      </td>
                      <td className="px-4 py-3">
                        <BusinessModelBadge businessModel={car.business_model} />
                      </td>
                      <td className="px-4 py-3">
                        <CarStatusControl
                          car={car}
                          clients={clients}
                          compact
                          onToast={setToast}
                        />
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {renderPrimaryCell(car, display)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {formatListAmount(
                          display.secondary.amount,
                          display.secondary.isEstimate,
                          formatCurrency,
                          estimatedLabel,
                          dash
                        )}
                      </td>
                      {showOwnedColumns ? (
                        <td className="px-4 py-3 text-zinc-300">
                          {actualSale != null ? formatCurrency(actualSale) : dash}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-zinc-300">
                        {formatCurrency(totalExpenses)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                            {t(profitLabelKey)}
                          </p>
                          <ProfitAmount
                            amount={display.profit.amount}
                            isEstimate={display.profit.isEstimate}
                            formatCurrency={formatCurrency}
                            estimatedLabel={estimatedLabel}
                            dash={dash}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {cars.map((car) => {
              const { totalExpenses, display, profitLabelKey } = renderCarFinancials(car);

              return (
                <Link
                  key={car.id}
                  href={`/cars/${car.id}`}
                  className={cn(
                    "block overflow-hidden rounded-xl border border-zinc-800 border-l-4 bg-zinc-900/60 transition-colors hover:bg-zinc-900/80",
                    getCarStatusRowStripe(car.status)
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-white">
                          {car.brand} {car.model}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {car.registration_number ?? car.vin ?? dash}
                        </p>
                      </div>
                      <div
                        className="flex shrink-0 flex-col items-end gap-2"
                        onClick={(event) => event.preventDefault()}
                      >
                        <BusinessModelBadge businessModel={car.business_model} />
                        <CarStatusControl
                          car={car}
                          clients={clients}
                          compact
                          onToast={setToast}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-zinc-500">{resolveFieldLabel(display.primaryLabelKey)}</p>
                        <p className="mt-1 text-zinc-200">{renderPrimaryCell(car, display)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">{t(profitLabelKey)}</p>
                        <div className="mt-1">
                          <ProfitAmount
                            amount={display.profit.amount}
                            isEstimate={display.profit.isEstimate}
                            formatCurrency={formatCurrency}
                            estimatedLabel={estimatedLabel}
                            dash={dash}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-zinc-500">
                      {tFields("totalExpenses")}: {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
