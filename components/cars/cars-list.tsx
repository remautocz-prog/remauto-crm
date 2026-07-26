"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Search } from "lucide-react";
import type { Car } from "@/lib/types/cars";
import {
  CAR_SORT_VALUES,
  CAR_STATUS_VALUES,
  type CarSortValue,
} from "@/lib/constants/cars";
import { BUSINESS_MODEL_VALUES } from "@/lib/constants/business-model";
import { getListRowDisplay } from "@/lib/cars/business-rules";
import { BusinessModelBadge } from "@/components/cars/business-model-badge";
import { CarStatusBadge } from "@/components/cars/car-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { translateBusinessModel } from "@/lib/i18n/business-model";
import { translateStatus } from "@/lib/i18n/status";

const SORT_LABEL_KEYS: Record<CarSortValue, "newest" | "purchaseDate" | "price" | "saleDate"> = {
  newest: "newest",
  purchase_date: "purchaseDate",
  price: "price",
  sale_date: "saleDate",
};

type CarsListProps = {
  cars: Car[];
  clientNames: Record<number, string>;
  initialQuery: string;
  initialStatus: string;
  initialBusinessModel: string;
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

function getTableHeaders(
  businessModel: string,
  labels: {
    purchasePrice: string;
    salePrice: string;
    netProfit: string;
    ownerNetAmount: string;
    expectedCommission: string;
    client: string;
    primaryAmount: string;
    secondaryAmount: string;
  }
): [string, string, string] {
  if (businessModel === "owned") {
    return [labels.purchasePrice, labels.salePrice, labels.netProfit];
  }
  if (businessModel === "commission") {
    return [labels.ownerNetAmount, labels.expectedCommission, labels.netProfit];
  }
  if (businessModel === "client_order") {
    return [labels.client, labels.expectedCommission, labels.netProfit];
  }
  return [labels.primaryAmount, labels.secondaryAmount, labels.netProfit];
}

export function CarsList({
  cars,
  clientNames,
  initialQuery,
  initialStatus,
  initialBusinessModel,
  initialSort,
}: CarsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [businessModel, setBusinessModel] = useState(initialBusinessModel);
  const [sort, setSort] = useState(initialSort);

  const t = useTranslations("cars");
  const tActions = useTranslations("actions");
  const tFields = useTranslations("fields");
  const tSort = useTranslations("sort");
  const tStatus = useTranslations("status");
  const tBusinessModel = useTranslations("businessModel");
  const tCommon = useTranslations("common");
  const { formatCurrency, formatDate } = useFormatters();
  const dash = tCommon("dash");
  const estimatedLabel = tFields("estimated");
  const [col1, col2, col3] = getTableHeaders(businessModel, {
    purchasePrice: tFields("purchasePrice"),
    salePrice: tFields("salePrice"),
    netProfit: tFields("netProfit"),
    ownerNetAmount: tFields("ownerNetAmount"),
    expectedCommission: tFields("expectedCommission"),
    client: tFields("client"),
    primaryAmount: tFields("primaryAmount"),
    secondaryAmount: tFields("secondaryAmount"),
  });

  function applyFilters(next: {
    q?: string;
    status?: string;
    business_model?: string;
    sort?: string;
  }) {
    const params = new URLSearchParams();
    const q = next.q ?? query;
    const nextStatus = next.status ?? status;
    const nextBusinessModel = next.business_model ?? businessModel;
    const nextSort = next.sort ?? sort;

    if (q.trim()) params.set("q", q.trim());
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextBusinessModel && nextBusinessModel !== "all") {
      params.set("business_model", nextBusinessModel);
    }
    if (nextSort && nextSort !== "newest") params.set("sort", nextSort);

    startTransition(() => {
      router.push(`/cars${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  const hasFilters = useMemo(
    () =>
      Boolean(
        initialQuery ||
          (initialStatus && initialStatus !== "all") ||
          (initialBusinessModel && initialBusinessModel !== "all") ||
          (initialSort && initialSort !== "newest")
      ),
    [initialBusinessModel, initialQuery, initialSort, initialStatus]
  );

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

  return (
    <div className="space-y-6">
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

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <label className="text-sm text-zinc-400">{tActions("search")}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters({ q: query })}
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
            <label className="text-sm text-zinc-400">{tFields("businessModel")}</label>
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

          <div className="md:col-span-2 xl:col-span-5">
            <Button
              variant="secondary"
              onClick={() => applyFilters({ q: query })}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {tActions("applyFilters")}
            </Button>
          </div>
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
                  <th className="px-4 py-3 font-medium">
                    {tFields("registrationNumber")}
                  </th>
                  <th className="px-4 py-3 font-medium">{tFields("businessModel")}</th>
                  <th className="px-4 py-3 font-medium">{tFields("status")}</th>
                  <th className="px-4 py-3 font-medium">{col1}</th>
                  <th className="px-4 py-3 font-medium">{col2}</th>
                  <th className="px-4 py-3 font-medium">{col3}</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => {
                  const display = getListRowDisplay(
                    car,
                    0,
                    car.client_id ? clientNames[car.client_id] : null
                  );

                  return (
                    <tr
                      key={car.id}
                      className="border-t border-zinc-800/80 hover:bg-zinc-900/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/cars/${car.id}`}
                          className="font-medium text-white hover:text-red-400"
                        >
                          {car.brand} {car.model} ({car.year})
                        </Link>
                        {car.stock_number ? (
                          <p className="text-xs text-zinc-500">{car.stock_number}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{car.vin ?? dash}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {car.registration_number ?? dash}
                      </td>
                      <td className="px-4 py-3">
                        <BusinessModelBadge businessModel={car.business_model} />
                      </td>
                      <td className="px-4 py-3">
                        <CarStatusBadge status={car.status} />
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
                      <td className="px-4 py-3 text-zinc-300">
                        {formatListAmount(
                          display.profit.amount,
                          display.profit.isEstimate,
                          formatCurrency,
                          estimatedLabel,
                          dash
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:hidden">
            {cars.map((car) => {
              const display = getListRowDisplay(
                car,
                0,
                car.client_id ? clientNames[car.client_id] : null
              );

              return (
                <Card key={car.id} className="border-zinc-800 bg-zinc-900/60">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base text-white">
                          <Link href={`/cars/${car.id}`} className="hover:text-red-400">
                            {car.brand} {car.model}
                          </Link>
                        </CardTitle>
                        <p className="text-sm text-zinc-400">
                          {car.year} {t("yearSuffix")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <BusinessModelBadge businessModel={car.business_model} />
                        <CarStatusBadge status={car.status} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm text-zinc-300">
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{tFields("vin")}</span>
                      <span>{car.vin ?? dash}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{tFields("registrationNumber")}</span>
                      <span>{car.registration_number ?? dash}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{tFields("purchaseDate")}</span>
                      <span>{formatDate(car.purchase_date, dash)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{tFields(display.primaryLabelKey)}</span>
                      <span>{renderPrimaryCell(car, display)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{tFields(display.secondaryLabelKey)}</span>
                      <span>
                        {formatListAmount(
                          display.secondary.amount,
                          display.secondary.isEstimate,
                          formatCurrency,
                          estimatedLabel,
                          dash
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{tFields(display.profitLabelKey)}</span>
                      <span>
                        {formatListAmount(
                          display.profit.amount,
                          display.profit.isEstimate,
                          formatCurrency,
                          estimatedLabel,
                          dash
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
