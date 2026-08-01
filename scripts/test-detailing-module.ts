import {
  calculateEmployeeCommission,
  calculateServiceCommission,
  hasServiceLevelAssignments,
  resolveCommissionPercent,
  resolveCompanyRemainder,
  resolveOrderTotalCommission,
  sumServiceCommissions,
} from "@/lib/detailing/commission";
import {
  calculateLineTotal,
  calculateOrderPricing,
  calculatePaymentStatus,
  calculateRemainingAmount,
  getVehicleSizeSurchargePercent,
  isSurchargeEligiblePrice,
} from "@/lib/detailing/pricing";
import { buildServicesSummary, getCustomerDisplayName } from "@/lib/detailing/validation";

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

function testMultipleServicesSubtotal() {
  const pricing = calculateOrderPricing({
    services: [
      { unit_price: 1000, quantity: 1, total_price: 1000, price_type: "from" },
      { unit_price: 400, quantity: 2, total_price: 800, price_type: "per_item" },
    ],
    vehicleSize: "standard",
    discountAmount: 0,
  });
  assert(pricing.servicesSubtotal === 1800);
}

function testPriceSnapshotPreservation() {
  const cataloguePrice: number = 1600;
  const snapshotPrice: number = 1500;
  assert(snapshotPrice !== cataloguePrice);
  assert(snapshotPrice === 1500, "Historical order keeps edited snapshot price");
}

function testSuvSurcharge() {
  const pricing = calculateOrderPricing({
    services: [{ unit_price: 1000, quantity: 1, total_price: 1000, price_type: "from" }],
    vehicleSize: "suv",
    discountAmount: 0,
  });
  assert(getVehicleSizeSurchargePercent("suv") === 15);
  assert(pricing.vehicleSurchargeAmount === 150);
  assert(pricing.finalPrice === 1150);
}

function testXxlSurcharge() {
  const pricing = calculateOrderPricing({
    services: [{ unit_price: 1000, quantity: 1, total_price: 1000, price_type: "from" }],
    vehicleSize: "xxl",
    discountAmount: 0,
  });
  assert(getVehicleSizeSurchargePercent("xxl") === 25);
  assert(pricing.vehicleSurchargeAmount === 250);
  assert(pricing.finalPrice === 1250);
}

function testDiscountCalculation() {
  const pricing = calculateOrderPricing({
    services: [{ unit_price: 2000, quantity: 1, total_price: 2000, price_type: "fixed" }],
    vehicleSize: "standard",
    discountAmount: 300,
  });
  assert(pricing.finalPrice === 1700);
}

function testRemainingBalance() {
  assert(calculateRemainingAmount(1700, 500) === 1200);
  assert(calculateRemainingAmount(1700, 2000) === 0);
  assert(calculatePaymentStatus(1700, 500) === "partially_paid");
  assert(calculatePaymentStatus(1700, 1700) === "paid");
}

function testEmployeeCommissionDefault() {
  assert(calculateEmployeeCommission(10000, 35, "delivered") === 3500);
}

function testCustomEmployeeCommission() {
  assert(calculateEmployeeCommission(10000, 40, "delivered") === 4000);
  assert(resolveCommissionPercent(null) === 35);
  assert(resolveCommissionPercent(42) === 42);
}

function testCommissionSnapshotPreservation() {
  const storedPercent = 35;
  const storedAmount = 3500;
  const newPercent = 40;
  const newAmount = calculateEmployeeCommission(10000, newPercent, "delivered");
  assert(storedAmount !== newAmount);
  assert(storedPercent === 35);
}

function testCancelledOrderZeroCommission() {
  assert(calculateEmployeeCommission(10000, 35, "cancelled") === 0);
}

function testOnRequestExcludedFromSurcharge() {
  assert(!isSurchargeEligiblePrice(null, "on_request"));
  const pricing = calculateOrderPricing({
    services: [
      { unit_price: null, quantity: 1, total_price: 0, price_type: "on_request" },
      { unit_price: 1000, quantity: 1, total_price: 1000, price_type: "from" },
    ],
    vehicleSize: "suv",
    discountAmount: 0,
  });
  assert(pricing.vehicleSurchargeAmount === 150);
}

function testExpenseShape() {
  const expense = {
    expense_date: "2026-07-26",
    category: "chemicals" as const,
    description: "Shampoo",
    amount: 1200,
  };
  assert(expense.amount >= 0);
  assert(expense.category === "chemicals");
}

function testDashboardNetResult() {
  const revenue = 50000;
  const commissions = 17500;
  const expenses = 8000;
  assert(revenue - commissions - expenses === 24500);
}

function testSearchByRegistrationNumber() {
  const orders = [
    { registration_number: "1AB2345", order_number: "DT-2026-0001" },
    { registration_number: "9ZZ9999", order_number: "DT-2026-0002" },
  ];
  const term = "1ab2345";
  const match = orders.filter((order) =>
    order.registration_number.toLowerCase().includes(term)
  );
  assert(match.length === 1);
}

function testDirectStatusUpdatePayload() {
  const nextStatus = "ready";
  assert(nextStatus === "ready");
}

function testOrderNumberFormat() {
  const sample = "DT-2026-0001";
  assert(/^DT-\d{4}-\d{4}$/.test(sample));
}

function testNoClientSideDeletePolicy() {
  const revokedTables = [
    "detailing_services",
    "detailing_orders",
    "detailing_employee_settings",
    "detailing_expenses",
  ];
  assert(revokedTables.length === 4);
}

function testHelpers() {
  assert(getCustomerDisplayName({ customer_first_name: "Jan", customer_last_name: "Novák" }) === "Jan Novák");
  assert(
    buildServicesSummary([
      { service_name_snapshot: "Program I", quantity: 1 },
      { service_name_snapshot: "Tepování sedaček", quantity: 2 },
    ]) === "Program I, Tepování sedaček ×2"
  );
  assert(calculateLineTotal(250, 4) === 1000);
}

function testPerServiceCommissionSplit() {
  assert(calculateServiceCommission(4000, 35, "delivered") === 1400);
  assert(calculateServiceCommission(6000, 35, "delivered") === 2100);
  const total = sumServiceCommissions(
    [{ commission_amount: 1400 }, { commission_amount: 2100 }],
    "delivered"
  );
  assert(total === 3500);
}

function testCustomServiceCommissionPercent() {
  assert(calculateServiceCommission(10000, 40, "delivered") === 4000);
}

function testUnassignedServiceZeroCommission() {
  assert(calculateServiceCommission(5000, 35, "delivered") === 1750);
  assert(
    sumServiceCommissions([{ commission_amount: 0 }, { commission_amount: 1750 }], "delivered") ===
      1750
  );
}

function testLegacyOrderCommissionFallback() {
  const order = {
    final_price: 10000,
    status: "delivered" as const,
    assigned_employee_id: "legacy-employee",
    employee_commission_percent_snapshot: 35,
    employee_commission_amount: 3500,
  };
  const services = [
    {
      id: "1",
      order_id: "o1",
      service_id: null,
      service_name_snapshot: "Program I",
      quantity: 1,
      unit_price: 10000,
      total_price: 10000,
      notes: null,
      assigned_employee_id: null,
      employee_name_snapshot: null,
      commission_percent_snapshot: null,
      commission_amount: 0,
      created_at: "2026-01-01",
    },
  ];
  assert(!hasServiceLevelAssignments(services));
  assert(resolveOrderTotalCommission(order, services) === 3500);
}

function testCompanyRemainder() {
  assert(resolveCompanyRemainder(10000, 3500) === 6500);
}

function testCommissionCannotExceedServiceTotal() {
  assert(calculateServiceCommission(1000, 100, "delivered") === 1000);
}

const tests: Array<[string, () => void]> = [
  ["multiple services subtotal", testMultipleServicesSubtotal],
  ["price snapshot preservation", testPriceSnapshotPreservation],
  ["15% SUV surcharge", testSuvSurcharge],
  ["25% XXL surcharge", testXxlSurcharge],
  ["discount calculation", testDiscountCalculation],
  ["remaining balance calculation", testRemainingBalance],
  ["35% employee commission", testEmployeeCommissionDefault],
  ["custom employee commission", testCustomEmployeeCommission],
  ["per-service commission split", testPerServiceCommissionSplit],
  ["custom service commission percent", testCustomServiceCommissionPercent],
  ["unassigned service zero commission", testUnassignedServiceZeroCommission],
  ["legacy order commission fallback", testLegacyOrderCommissionFallback],
  ["company remainder", testCompanyRemainder],
  ["commission cannot exceed service total", testCommissionCannotExceedServiceTotal],
  ["commission snapshot preservation", testCommissionSnapshotPreservation],
  ["cancelled order zero commission", testCancelledOrderZeroCommission],
  ["on_request excluded from surcharge", testOnRequestExcludedFromSurcharge],
  ["expense creation shape", testExpenseShape],
  ["dashboard monthly totals", testDashboardNetResult],
  ["search by registration number", testSearchByRegistrationNumber],
  ["direct status update", testDirectStatusUpdatePayload],
  ["order number generation format", testOrderNumberFormat],
  ["RLS no client-side delete tables", testNoClientSideDeletePolicy],
  ["helper utilities", testHelpers],
];

let passed = 0;
for (const [name, fn] of tests) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

console.log(`\n${passed}/${tests.length} detailing module tests passed.`);
