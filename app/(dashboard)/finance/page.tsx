import type { Metadata } from "next";
import { PageHeader, DataTable } from "@/components/shared/page-shell";
import { formatCurrency } from "@/lib/utils";
import { getFinanceTransactions } from "@/lib/queries/modules";

export const metadata: Metadata = {
  title: "Finance",
};

export default async function FinancePage() {
  const transactions = await getFinanceTransactions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Track income, expenses, and monthly profit."
      />
      <DataTable
        title="Transactions"
        headers={["Type", "Category", "Amount", "Date", "Description"]}
        rows={transactions.map((tx) => [
          tx.type,
          tx.category,
          formatCurrency(Number(tx.amount)),
          new Date(tx.transaction_date).toLocaleDateString(),
          tx.description ?? "—",
        ])}
      />
    </div>
  );
}
