"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  FileText,
  Plus,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ControlMetricCard,
  PrimaryKpiCard,
} from "@/components/finance/finance-kpi-cards";
import { DateRangeSelector } from "@/components/shared/date-range-selector";
import { Button } from "@/components/ui/button";
import type {
  AccountantFinancialTask,
  AccountantPaymentRow,
} from "@/lib/types/accountant-dashboard";
import type { AccountantDashboardData } from "@/lib/types/accountant-dashboard";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { cn } from "@/lib/utils";

type AccountantDashboardProps = {
  data: AccountantDashboardData;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-4 text-xs text-zinc-500">
      {message}
    </p>
  );
}

function StatusBadge({
  status,
  daysOverdue,
  t,
}: {
  status: string;
  daysOverdue: number | null;
  t: ReturnType<typeof useTranslations<"dashboard.accountant">>;
}) {
  const tone =
    daysOverdue && daysOverdue > 0
      ? "bg-red-500/15 text-red-200"
      : status === "partially_paid"
        ? "bg-amber-500/15 text-amber-200"
        : status === "paid"
          ? "bg-emerald-500/15 text-emerald-200"
          : "bg-orange-500/15 text-orange-200";

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase", tone)}>
      {daysOverdue && daysOverdue > 0
        ? t("overdueDays", { days: daysOverdue })
      : status === "missing_actual_price"
        ? t("paymentStatus.missing_actual_price")
        : t(`paymentStatus.${status}` as "paymentStatus.unpaid")}
    </span>
  );
}

function PaymentTable({
  rows,
  t,
  formatCurrency,
  formatDateTime,
  emptyMessage,
}: {
  rows: AccountantPaymentRow[];
  t: ReturnType<typeof useTranslations<"dashboard.accountant">>;
  formatCurrency: (value: number) => string;
  formatDateTime: (value: string) => string;
  emptyMessage: string;
}) {
  if (rows.length === 0) return <EmptyRow message={emptyMessage} />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-2 py-2">{t("tableClient")}</th>
            <th className="px-2 py-2">{t("tableVehicle")}</th>
            <th className="px-2 py-2">{t("tableAmount")}</th>
            <th className="px-2 py-2">{t("tablePaid")}</th>
            <th className="px-2 py-2">{t("tableRemaining")}</th>
            <th className="px-2 py-2">{t("tableStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-zinc-800/70 hover:bg-zinc-950/40">
              <td className="px-2 py-3">
                <Link href={row.href} className="block min-w-[8rem]">
                  <p className="font-medium text-white">{row.client}</p>
                  <p className="text-xs text-zinc-500">{t(`module.${row.module}`)}</p>
                </Link>
              </td>
              <td className="px-2 py-3 text-zinc-300">{row.vehicle}</td>
              <td className="px-2 py-3 tabular-nums text-zinc-200">
                {formatCurrency(row.amount)}
              </td>
              <td className="px-2 py-3 tabular-nums text-emerald-300">
                {formatCurrency(row.paid)}
              </td>
              <td className="px-2 py-3 tabular-nums text-orange-300">
                {formatCurrency(row.remaining)}
              </td>
              <td className="px-2 py-3">
                <StatusBadge status={row.status} daysOverdue={row.daysOverdue} t={t} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentPaymentsTable({
  rows,
  t,
  formatCurrency,
  formatDateTime,
  emptyMessage,
}: {
  rows: AccountantPaymentRow[];
  t: ReturnType<typeof useTranslations<"dashboard.accountant">>;
  formatCurrency: (value: number) => string;
  formatDateTime: (value: string) => string;
  emptyMessage: string;
}) {
  if (rows.length === 0) return <EmptyRow message={emptyMessage} />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-2 py-2">{t("tableTime")}</th>
            <th className="px-2 py-2">{t("tableAmount")}</th>
            <th className="px-2 py-2">{t("tableModule")}</th>
            <th className="px-2 py-2">{t("tableClient")}</th>
            <th className="px-2 py-2">{t("tableMethod")}</th>
            <th className="px-2 py-2">{t("tableStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-zinc-800/70 hover:bg-zinc-950/40">
              <td className="px-2 py-3 text-zinc-400">
                <Link href={row.href}>{formatDateTime(row.occurredAt)}</Link>
              </td>
              <td className="px-2 py-3 tabular-nums text-emerald-300">
                {formatCurrency(row.paid)}
              </td>
              <td className="px-2 py-3 text-zinc-300">{t(`module.${row.module}`)}</td>
              <td className="px-2 py-3 text-zinc-200">{row.client}</td>
              <td className="px-2 py-3 text-zinc-400">{row.paymentMethod ?? "—"}</td>
              <td className="px-2 py-3">
                <StatusBadge status={row.status} daysOverdue={null} t={t} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FinancialTaskRow({
  task,
  t,
}: {
  task: AccountantFinancialTask;
  t: ReturnType<typeof useTranslations<"dashboard.accountant">>;
}) {
  return (
    <Link
      href={task.href}
      className={cn(
        "block rounded-lg border px-3 py-2.5 transition-colors",
        task.priority === "high"
          ? "border-red-500/25 bg-red-950/10 hover:border-red-500/40"
          : "border-amber-500/20 bg-amber-950/10 hover:border-amber-500/35"
      )}
    >
      <p className="text-sm font-medium text-white">{task.title}</p>
      <p className="text-xs text-zinc-400">{task.subtitle}</p>
      <p className="mt-1 text-xs text-zinc-500">{t(`taskKind.${task.kind}`)}</p>
    </Link>
  );
}

export function AccountantDashboard({ data }: AccountantDashboardProps) {
  const t = useTranslations("dashboard.accountant");
  const tDateRange = useTranslations("dateRange");
  const { formatCurrency, formatDateTime } = useFormatters();

  const periodSubtitle =
    data.dateRange.preset === "custom"
      ? `${data.dateRange.from} – ${data.dateRange.to}`
      : tDateRange(`preset.${data.dateRange.preset}` as "preset.today");

  const quickActions = [
    data.quickActions.canManageExpenses
      ? { href: "/detailing/expenses", label: t("newExpense"), icon: Plus }
      : null,
    data.quickActions.canViewFinanceCenter
      ? { href: "/finance", label: t("financeCenter"), icon: Wallet }
      : null,
    data.quickActions.canViewDocuments
      ? { href: "/documents", label: t("documents"), icon: FileText }
      : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof Plus }[];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>
        </div>
        <DateRangeSelector
          from={data.dateRange.from}
          to={data.dateRange.to}
          preset={data.dateRange.preset}
        />
      </div>

      {quickActions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button key={action.href} asChild variant="outline" size="sm" className="gap-2 border-zinc-700">
              <Link href={action.href}>
                <action.icon className="h-4 w-4 text-emerald-400" aria-hidden />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PrimaryKpiCard
          label={t("incomingToday")}
          value={formatCurrency(data.kpis.incomingToday)}
          hint={t("currentDayHint")}
          accent="green"
          formatCurrency={formatCurrency}
        />
        <PrimaryKpiCard
          label={t("unpaidInvoices")}
          value={String(data.kpis.unpaidCount)}
          hint={t("currentStateHint")}
          accent="amber"
          formatCurrency={formatCurrency}
        />
        <PrimaryKpiCard
          label={t("receivables")}
          value={formatCurrency(data.kpis.outstandingReceivables)}
          hint={t("currentStateHint")}
          accent="amber"
          formatCurrency={formatCurrency}
        />
        <PrimaryKpiCard
          label={t("awaitingVerification")}
          value={String(data.kpis.expensesAwaitingVerification)}
          hint={t("currentStateHint")}
          accent="blue"
          formatCurrency={formatCurrency}
        />
        <PrimaryKpiCard
          label={t("financialTasksToday")}
          value={String(data.kpis.financialTasksToday)}
          hint={t("currentStateHint")}
          accent="violet"
          formatCurrency={formatCurrency}
        />
      </div>

      <Section title={t("moneyReceived")} description={periodSubtitle}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ControlMetricCard
            label={t("module.cars")}
            value={formatCurrency(data.incomeBySource.cars)}
            accent="green"
          />
          <ControlMetricCard
            label={t("module.detailing")}
            value={formatCurrency(data.incomeBySource.detailing)}
            accent="green"
          />
          <ControlMetricCard
            label={t("module.documents")}
            value={formatCurrency(data.incomeBySource.documents)}
            accent="green"
          />
          <ControlMetricCard
            label={t("totalReceived")}
            value={formatCurrency(data.incomeBySource.total)}
            accent="green"
          />
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title={t("receivables")} description={t("currentStateHint")}>
          {data.errors.receivables ? (
            <EmptyRow message={t("sectionLoadFailed")} />
          ) : (
            <PaymentTable
              rows={data.receivables.slice(0, 12)}
              t={t}
              formatCurrency={formatCurrency}
              formatDateTime={formatDateTime}
              emptyMessage={t("noReceivables")}
            />
          )}
        </Section>

        <Section title={t("financialTasksToday")}>
          {data.financialTasks.length === 0 ? (
            <EmptyRow message={t("noFinancialTasks")} />
          ) : (
            <ul className="space-y-2">
              {data.financialTasks.map((task) => (
                <li key={task.id}>
                  <FinancialTaskRow task={task} t={t} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title={t("awaitingPayment")} description={t("currentStateHint")}>
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-300">{t("module.documents")}</h3>
            <PaymentTable
              rows={data.awaitingPayment.documents.slice(0, 8)}
              t={t}
              formatCurrency={formatCurrency}
              formatDateTime={formatDateTime}
              emptyMessage={t("noAwaitingPayment")}
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-300">{t("module.detailing")}</h3>
            <PaymentTable
              rows={data.awaitingPayment.detailing.slice(0, 8)}
              t={t}
              formatCurrency={formatCurrency}
              formatDateTime={formatDateTime}
              emptyMessage={t("noAwaitingPayment")}
            />
          </div>
          {data.awaitingPayment.cars.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-300">{t("module.cars")}</h3>
              <PaymentTable
                rows={data.awaitingPayment.cars.slice(0, 8)}
                t={t}
                formatCurrency={formatCurrency}
                formatDateTime={formatDateTime}
                emptyMessage={t("noAwaitingPayment")}
              />
            </div>
          ) : null}
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title={t("expenses")} description={periodSubtitle}>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ControlMetricCard
              label={t("expensesToday")}
              value={formatCurrency(data.expenses.todayTotal)}
              accent="amber"
            />
            <ControlMetricCard
              label={t("pendingExpenses")}
              value={String(data.expenses.pendingVerificationCount)}
              accent="red"
            />
            <ControlMetricCard
              label={t("periodExpenses")}
              value={formatCurrency(data.expenses.periodTotal)}
              accent="amber"
            />
          </div>
          {data.expenses.recent.length === 0 ? (
            <EmptyRow message={t("noExpenses")} />
          ) : (
            <ul className="space-y-2">
              {data.expenses.recent.map((expense) => (
                <li key={expense.id}>
                  {expense.href ? (
                    <Link
                      href={expense.href}
                      className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 hover:border-zinc-700"
                    >
                      <div>
                        <p className="text-sm text-white">{expense.label}</p>
                        <p className="text-xs text-zinc-500">
                          {t(`module.${expense.module}`)} · {expense.date}
                        </p>
                      </div>
                      <p className="text-sm tabular-nums text-orange-300">
                        {formatCurrency(expense.amount)}
                      </p>
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
                      <div>
                        <p className="text-sm text-white">{expense.label}</p>
                        <p className="text-xs text-zinc-500">{expense.date}</p>
                      </div>
                      <p className="text-sm tabular-nums text-orange-300">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("recentPayments")}>
          <RecentPaymentsTable
            rows={data.recentPayments}
            t={t}
            formatCurrency={formatCurrency}
            formatDateTime={formatDateTime}
            emptyMessage={t("noRecentPayments")}
          />
        </Section>
      </div>
    </div>
  );
}
