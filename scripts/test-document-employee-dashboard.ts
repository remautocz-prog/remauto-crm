import assert from "node:assert/strict";
import { resolveDateRange } from "../lib/date-range/filter";
import {
  getDocumentEmployeeDashboardSummary,
  isTaskCompletedInPeriod,
  isTaskDueInPeriod,
} from "../lib/documents/employee-dashboard";
import { isTaskOverdue } from "../lib/documents/helpers";
import type { DocumentTaskWithRelations } from "../lib/types/documents";

const EMPLOYEE = "employee-1";
const TODAY = "2026-08-07";
const AUGUST = resolveDateRange({
  from: "2026-08-01",
  to: "2026-08-31",
  preset: "custom",
});

function task(
  overrides: Partial<DocumentTaskWithRelations> & { id: number }
): DocumentTaskWithRelations {
  const { id, ...rest } = overrides;
  return {
    id,
    client_id: null,
    car_id: null,
    vehicle_mode: "external",
    vehicle_vin: null,
    vehicle_plate: null,
    vehicle_brand: null,
    vehicle_model: null,
    vehicle_year: null,
    service_type: "registration",
    work_type: "registration",
    custom_service_name: null,
    assigned_to: EMPLOYEE,
    status: "IN_PROGRESS",
    priority: "normal",
    started_at: null,
    due_date: null,
    deadline: null,
    completed_at: null,
    ready_at: null,
    delivered_at: null,
    service_price: null,
    cost_price: null,
    paid_amount: 0,
    payment_status: "unpaid",
    paid_at: null,
    payment_method: null,
    document_count: 0,
    required_documents: [],
    received_documents: [],
    notes: null,
    result_notes: null,
    archived_at: null,
    archived_by: null,
    created_at: "2026-05-01T10:00:00.000Z",
    updated_at: "2026-05-01T10:00:00.000Z",
    ...rest,
  };
}

function summarize(tasks: DocumentTaskWithRelations[]) {
  return getDocumentEmployeeDashboardSummary({
    tasks,
    employeeId: EMPLOYEE,
    employeeName: "Employee",
    viewerName: "Employee",
    canSelectEmployee: false,
    assigneeOptions: [],
    dateRange: AUGUST,
    today: TODAY,
  });
}

function includesTask(items: DocumentTaskWithRelations[], id: number) {
  return items.some((item) => item.id === id);
}

let passed = 0;
function check(name: string, condition: boolean) {
  assert.ok(condition, name);
  passed += 1;
  console.log(`✓ ${name}`);
}

console.log("Document employee dashboard period/overdue tests\n");

// CASE A: June deadline, open, August period -> overdue visible
{
  const t = task({ id: 1, due_date: "2026-06-01" });
  const summary = summarize([t]);
  check("CASE A overdue KPI", summary.kpis.overdue === 1);
  check("CASE A in needs attention", includesTask(summary.needsAttention, 1));
  check("CASE A in active tasks", includesTask(summary.activeTasks, 1));
  check("CASE A not due in August period", summary.kpis.dueInPeriod === 0);
}

// CASE B: June deadline, completed 05.08, August period -> not overdue, completed in period
{
  const t = task({
    id: 2,
    due_date: "2026-06-01",
    status: "COMPLETED",
    completed_at: "2026-08-05T12:00:00.000Z",
  });
  const summary = summarize([t]);
  check("CASE B not overdue", summary.kpis.overdue === 0);
  check("CASE B completed in period", summary.kpis.completedInPeriod === 1);
  check("CASE B not in active", !includesTask(summary.activeTasks, 2));
  check(
    "CASE B helper completed in period",
    isTaskCompletedInPeriod(t, AUGUST.from, AUGUST.to)
  );
}

// CASE C: Created May, deadline 20.08, open, August -> active + due in period
{
  const t = task({ id: 3, due_date: "2026-08-20", created_at: "2026-05-10T10:00:00.000Z" });
  const summary = summarize([t]);
  check("CASE C active", summary.kpis.myActive === 1);
  check("CASE C due in period", summary.kpis.dueInPeriod === 1);
  check(
    "CASE C due helper",
    isTaskDueInPeriod(t, AUGUST.from, AUGUST.to, TODAY)
  );
}

// CASE D: Created May, no deadline, open, August -> remains active
{
  const t = task({ id: 4, created_at: "2026-05-10T10:00:00.000Z" });
  const summary = summarize([t]);
  check("CASE D active", includesTask(summary.activeTasks, 4));
  check("CASE D not due in period", summary.kpis.dueInPeriod === 0);
}

// CASE E: Due yesterday, open, all presets/custom -> remains overdue
{
  const overdueTask = task({ id: 5, due_date: "2026-08-06" });
  const presets = [
    resolveDateRange({ from: TODAY, to: TODAY, preset: "today" }),
    resolveDateRange({ from: "2026-08-04", to: "2026-08-10", preset: "week" }),
    AUGUST,
    resolveDateRange({ from: "2026-07-01", to: "2026-07-31", preset: "custom" }),
  ];

  for (const range of presets) {
    const summary = getDocumentEmployeeDashboardSummary({
      tasks: [overdueTask],
      employeeId: EMPLOYEE,
      employeeName: "Employee",
      viewerName: "Employee",
      canSelectEmployee: false,
      assigneeOptions: [],
      dateRange: range,
      today: TODAY,
    });
    check(
      `CASE E overdue visible for ${range.preset} ${range.from}-${range.to}`,
      summary.kpis.overdue === 1 &&
        includesTask(summary.needsAttention, 5) &&
        isTaskOverdue(overdueTask, TODAY)
    );
  }
}

// CASE F: Same task completed -> disappears from overdue
{
  const openTask = task({ id: 6, due_date: "2026-06-01" });
  const openSummary = summarize([openTask]);
  check("CASE F open overdue", openSummary.kpis.overdue === 1);

  const completedTask = task({
    id: 6,
    due_date: "2026-06-01",
    status: "COMPLETED",
    completed_at: "2026-08-07T09:00:00.000Z",
  });
  const completedSummary = summarize([completedTask]);
  check("CASE F completed not overdue", completedSummary.kpis.overdue === 0);
  check(
    "CASE F completed not in attention",
    !includesTask(completedSummary.needsAttention, 6)
  );
}

console.log(`\n${passed} assertions passed.`);
