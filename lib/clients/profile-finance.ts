import { calculateCarProfit, calculateRemAutoRevenue } from "@/lib/cars/business-rules";
import { getDocumentFinanceSummary } from "@/lib/documents/helpers";
import type { Car } from "@/lib/types/cars";
import type { DocumentTaskWithRelations } from "@/lib/types/documents";

export type ClientDocumentFinance = {
  revenue: number;
  costs: number;
  profit: number;
  paid: number;
  outstanding: number;
};

export type ClientVehicleFinance = {
  revenue: number;
  costs: number;
  profit: number;
  soldCount: number;
};

export type ClientProfileFinance = {
  vehiclesCount: number;
  activeDocumentOrders: number;
  documents: ClientDocumentFinance;
  vehicles: ClientVehicleFinance;
  combined: {
    revenue: number;
    costs: number;
    profit: number;
    documentPaid: number;
    outstanding: number;
  };
};

export function calculateClientProfileFinance(input: {
  cars: Car[];
  carExpenseTotals: Record<number, number>;
  documentTasks: DocumentTaskWithRelations[];
  activeDocumentOrders: number;
}): ClientProfileFinance {
  const documents: ClientDocumentFinance = {
    revenue: 0,
    costs: 0,
    profit: 0,
    paid: 0,
    outstanding: 0,
  };

  for (const task of input.documentTasks) {
    const finance = getDocumentFinanceSummary(task);
    documents.revenue += finance.servicePrice;
    documents.costs += finance.costPrice;
    documents.profit += finance.profit;
    documents.paid += finance.paidAmount;
    documents.outstanding += finance.outstandingBalance;
  }

  const vehicles: ClientVehicleFinance = {
    revenue: 0,
    costs: 0,
    profit: 0,
    soldCount: 0,
  };

  for (const car of input.cars) {
    const expenses = input.carExpenseTotals[car.id] ?? 0;
    const purchasePrice = Number(car.purchase_price ?? 0);
    const profitResult = calculateCarProfit(car, expenses);
    vehicles.costs += purchasePrice + expenses;
    vehicles.profit += profitResult.netProfit;

    if (car.status === "sold") {
      vehicles.soldCount += 1;
      vehicles.revenue += calculateRemAutoRevenue(car, profitResult);
    }
  }

  return {
    vehiclesCount: input.cars.length,
    activeDocumentOrders: input.activeDocumentOrders,
    documents,
    vehicles,
    combined: {
      revenue: documents.revenue + vehicles.revenue,
      costs: documents.costs + vehicles.costs,
      profit: documents.profit + vehicles.profit,
      documentPaid: documents.paid,
      outstanding: documents.outstanding,
    },
  };
}
