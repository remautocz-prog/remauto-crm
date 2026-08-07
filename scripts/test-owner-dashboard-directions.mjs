import assert from "node:assert/strict";

function buildPeriodComparison(currentValue, previousValue) {
  if (previousValue === 0 && currentValue === 0) {
    return null;
  }

  if (previousValue === 0) {
    return { kind: "new_result", previousValue: 0 };
  }

  const changePercent =
    Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 1000) / 10;

  if (changePercent === 0) {
    return { kind: "unchanged", previousValue, changePercent: 0 };
  }

  return { previousValue, changePercent, kind: "percent" };
}

function getPreviousComparableRange(range) {
  const dayCount =
    Math.floor(
      (Date.parse(range.to) - Date.parse(range.from)) / (1000 * 60 * 60 * 24)
    ) + 1;
  const previousEnd = addDays(range.from, -1);
  const previousStart = addDays(previousEnd, -(dayCount - 1));
  return { from: previousStart, to: previousEnd, preset: "custom" };
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
}

check(
  "positive percent change",
  buildPeriodComparison(120, 100)?.kind === "percent" &&
    buildPeriodComparison(120, 100)?.changePercent === 20
);
check(
  "negative percent with negative base uses abs denominator",
  buildPeriodComparison(-50, -100)?.changePercent === 50
);
check("both zero hides comparison", buildPeriodComparison(0, 0) === null);
check(
  "previous zero with current value is new result",
  buildPeriodComparison(5000, 0)?.kind === "new_result"
);
check(
  "unchanged non-zero",
  buildPeriodComparison(1000, 1000)?.kind === "unchanged"
);
check(
  "custom previous range length matches",
  getPreviousComparableRange({ from: "2026-08-01", to: "2026-08-31", preset: "custom" })
    .from === "2026-07-01"
);
check(
  "finance href preserves range",
  (() => {
    const params = new URLSearchParams(
      buildFinanceHref("/finance", {
        from: "2026-08-01",
        to: "2026-08-31",
        preset: "custom",
      }).split("?")[1]
    );
    return params.get("from") === "2026-08-01" && params.get("to") === "2026-08-31";
  })()
);

function buildFinanceHref(path, range) {
  const params = new URLSearchParams();
  params.set("from", range.from);
  params.set("to", range.to);
  if (range.preset !== "custom") {
    params.set("preset", range.preset);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

console.log(`owner dashboard direction checks: ${passed} assertions passed`);
