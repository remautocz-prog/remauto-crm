import assert from "node:assert/strict";

// Mirrors lib/detailing/car-selector.ts

function formatVinSuffix(vin, length = 6) {
  const normalized = vin?.trim();
  if (!normalized) return null;
  if (normalized.length <= length) return normalized;
  return `…${normalized.slice(-length)}`;
}

function formatDetailingCarPrimaryLabel(car) {
  return `${car.brand} ${car.model}`.trim();
}

function formatDetailingCarSecondaryLabel(car, options = {}) {
  const parts = [];
  if (car.registration_number?.trim()) parts.push(car.registration_number.trim());
  const vinSuffix = formatVinSuffix(car.vin);
  if (vinSuffix) parts.push(`VIN ${vinSuffix}`);
  if (car.year) parts.push(String(car.year));
  if (options.includeMileage && car.mileage != null && car.mileage > 0) {
    parts.push(`${car.mileage.toLocaleString()} km`);
  }
  if (parts.length === 0 && car.stock_number?.trim()) {
    parts.push(car.stock_number.trim());
  }
  return parts.join(" · ");
}

const STATUS_SORT_ORDER = {
  in_stock: 0,
  reserved: 1,
  in_transit: 2,
  in_progress: 3,
  new: 4,
  sold: 5,
};

function sortDetailingCarSelectorOptions(cars) {
  return [...cars].sort((left, right) => {
    const leftRank = STATUS_SORT_ORDER[left.status] ?? 99;
    const rightRank = STATUS_SORT_ORDER[right.status] ?? 99;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return formatDetailingCarPrimaryLabel(left).localeCompare(
      formatDetailingCarPrimaryLabel(right),
      undefined,
      { sensitivity: "base" }
    );
  });
}

function filterDetailingCarSelectorOptions(cars, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return cars;
  return cars.filter((car) => {
    const haystack = [
      car.brand,
      car.model,
      String(car.year),
      car.vin ?? "",
      car.registration_number ?? "",
      car.stock_number ?? "",
      String(car.id),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

function applyDetailingCarToVehicleFields(car) {
  return {
    vehicleMakeModel: formatDetailingCarPrimaryLabel(car),
    registrationNumber: (car.registration_number ?? "").trim().toUpperCase(),
  };
}

const DETAILING_CAR_SELECTOR_STATUSES = [
  "in_stock",
  "sold",
  "reserved",
  "in_transit",
  "in_progress",
  "new",
];

function isDetailingCarSelectorStatus(status) {
  return DETAILING_CAR_SELECTOR_STATUSES.includes(status);
}

const sampleCars = [
  {
    id: 1,
    brand: "BMW",
    model: "440i xDrive",
    year: 2018,
    vin: "WBA123456789A12345",
    registration_number: "2AB 1234",
    status: "sold",
    mileage: 84500,
    stock_number: "ST-001",
  },
  {
    id: 2,
    brand: "Škoda",
    model: "Octavia",
    year: 2022,
    vin: "TMBJJ7NE0M0123456",
    registration_number: "1AB 2345",
    status: "in_stock",
    mileage: 12000,
    stock_number: null,
  },
  {
    id: 3,
    brand: "Audi",
    model: "A6",
    year: 2020,
    vin: null,
    registration_number: null,
    status: "reserved",
    mileage: null,
    stock_number: "ST-003",
  },
];

assert.equal(formatVinSuffix("WBA123456789A12345"), "…A12345");
assert.equal(formatDetailingCarPrimaryLabel(sampleCars[0]), "BMW 440i xDrive");
assert.match(
  formatDetailingCarSecondaryLabel(sampleCars[0], { includeMileage: true }),
  /2AB 1234 · VIN …A12345 · 2018 · 84,500 km/
);

const sorted = sortDetailingCarSelectorOptions(sampleCars);
assert.equal(sorted[0].status, "in_stock");
assert.equal(sorted.at(-1)?.status, "sold");

assert.deepEqual(
  filterDetailingCarSelectorOptions(sampleCars, "octavia").map((car) => car.id),
  [2]
);
assert.deepEqual(
  filterDetailingCarSelectorOptions(sampleCars, "a12345").map((car) => car.id),
  [1]
);
assert.deepEqual(
  filterDetailingCarSelectorOptions(sampleCars, "2ab 1234").map((car) => car.id),
  [1]
);
assert.deepEqual(
  filterDetailingCarSelectorOptions(sampleCars, "st-003").map((car) => car.id),
  [3]
);

assert.deepEqual(applyDetailingCarToVehicleFields(sampleCars[0]), {
  vehicleMakeModel: "BMW 440i xDrive",
  registrationNumber: "2AB 1234",
});

assert.equal(isDetailingCarSelectorStatus("in_stock"), true);
assert.equal(isDetailingCarSelectorStatus("cancelled"), false);

console.log("test-detailing-car-selector: ok");
