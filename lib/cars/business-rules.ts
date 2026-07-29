import {
  DEFAULT_BUSINESS_MODEL,
  type BusinessModel,
  type CommissionType,
} from "@/lib/constants/business-model";
import { CAR_STATUS_SOLD } from "@/lib/constants/status";
import type { Car, CarFormInput } from "@/lib/types/cars";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function isBlankString(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}

export function isMissingNumber(value: number | null | undefined): boolean {
  return value === null || value === undefined || Number.isNaN(value);
}

export function isMissingPositiveNumber(value: number | null | undefined): boolean {
  if (isMissingNumber(value)) return true;
  return (value as number) <= 0;
}

export function isInvalidNonNegativeNumber(
  value: number | null | undefined,
  options: { required: boolean }
): boolean {
  if (isMissingNumber(value)) return options.required;
  return (value as number) < 0;
}

export function parseOptionalNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return value;
}

export function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizeOptionalDate(value: string | null | undefined): string | null {
  return normalizeOptionalString(value);
}

export function normalizeOptionalUuid(value: string | null | undefined): string | null {
  return normalizeOptionalString(value);
}

export function normalizeOptionalForeignKey(
  value: number | null | undefined
): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return value;
}

export function getBusinessModel(
  input: Pick<CarFormInput, "business_model"> | Pick<Car, "business_model">
): BusinessModel {
  return (input.business_model ?? DEFAULT_BUSINESS_MODEL) as BusinessModel;
}

export function isCarSold(car: Pick<Car, "status">) {
  return car.status === CAR_STATUS_SOLD;
}

// ---------------------------------------------------------------------------
// Field rules by business model
// ---------------------------------------------------------------------------

export type CarField = keyof CarFormInput;

const BASE_REQUIRED: CarField[] = [
  "brand",
  "model",
  "year",
  "vin",
  "status",
  "business_model",
];

const OWNED_REQUIRED: CarField[] = [...BASE_REQUIRED, "purchase_price"];
const COMMISSION_REQUIRED: CarField[] = [
  ...BASE_REQUIRED,
  "owner_net_amount",
  "commission_type",
  "commission_value",
];
const CLIENT_ORDER_REQUIRED: CarField[] = [
  ...BASE_REQUIRED,
  "client_id",
  "commission_type",
  "commission_value",
];

const OWNED_HIDDEN: CarField[] = [
  "owner_net_amount",
  "commission_type",
  "commission_value",
  "owner_client_id",
  "contract_end_date",
  "contract_document_url",
];

const COMMISSION_HIDDEN: CarField[] = ["client_id", "purchase_price"];

const CLIENT_ORDER_HIDDEN: CarField[] = [
  "owner_net_amount",
  "owner_client_id",
  "contract_end_date",
  "contract_document_url",
  "purchase_price",
];

export function getRequiredFields(model: BusinessModel): CarField[] {
  if (model === "commission") return COMMISSION_REQUIRED;
  if (model === "client_order") return CLIENT_ORDER_REQUIRED;
  return OWNED_REQUIRED;
}

export function getHiddenFormFields(model: BusinessModel): CarField[] {
  if (model === "commission") return COMMISSION_HIDDEN;
  if (model === "client_order") return CLIENT_ORDER_HIDDEN;
  return OWNED_HIDDEN;
}

export function getNullableFields(model: BusinessModel): CarField[] {
  const allFields: CarField[] = [
    "stock_number",
    "registration_number",
    "color",
    "sale_price",
    "actual_sale_price",
    "purchase_date",
    "sale_date",
    "manager_id",
    "notes",
    "client_id",
    "owner_client_id",
    "contract_end_date",
    "contract_document_url",
  ];

  if (model === "owned") {
    return [...allFields, "commission_type", "commission_value", "owner_net_amount"];
  }

  if (model === "commission") {
    return [
      ...allFields,
      "purchase_price",
      "owner_client_id",
    ];
  }

  return [...allFields, "purchase_price", "owner_net_amount", "owner_client_id"];
}

export function clearFieldsForBusinessModel(
  form: CarFormInput,
  model: BusinessModel
): CarFormInput {
  const next: CarFormInput = { ...form, business_model: model };

  if (model === "owned") {
    next.commission_type = null;
    next.commission_value = null;
    next.owner_net_amount = null;
    next.owner_client_id = null;
    next.contract_end_date = null;
    next.contract_document_url = null;
  } else if (model === "commission") {
    next.client_id = null;
    next.purchase_price = null;
  } else if (model === "client_order") {
    next.purchase_price = null;
    next.owner_net_amount = null;
    next.owner_client_id = null;
    next.contract_end_date = null;
    next.contract_document_url = null;
  }

  return next;
}

export function parseOptionalInteger(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.trunc(value);
}

export function normalizeVinField(value: string | null | undefined): string | null {
  const trimmed = normalizeOptionalString(value);
  return trimmed ? trimmed.toUpperCase() : null;
}

export function normalizeCarPayload(input: CarFormInput) {
  const model = getBusinessModel(input);

  const technicalFields = {
    first_registration_date: normalizeOptionalDate(input.first_registration_date),
    fuel_type: normalizeOptionalString(input.fuel_type),
    engine_capacity: normalizeOptionalString(input.engine_capacity),
    power_kw: parseOptionalNumber(input.power_kw),
    technical_certificate_number: normalizeOptionalString(input.technical_certificate_number),
    key_count: parseOptionalInteger(input.key_count),
    mileage: parseOptionalInteger(input.mileage),
  };

  const base = {
    stock_number: normalizeOptionalString(input.stock_number),
    vin: normalizeVinField(input.vin),
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: input.year,
    registration_number: normalizeOptionalString(input.registration_number),
    color: normalizeOptionalString(input.color),
    status: input.status.trim(),
    business_model: model,
    manager_id: normalizeOptionalUuid(input.manager_id),
    notes: normalizeOptionalString(input.notes),
    sale_price: parseOptionalNumber(input.sale_price),
    actual_sale_price: parseOptionalNumber(input.actual_sale_price),
    purchase_date: normalizeOptionalDate(input.purchase_date),
    sale_date: normalizeOptionalDate(input.sale_date),
    ...technicalFields,
  };

  if (model === "owned") {
    return {
      ...base,
      purchase_price: parseOptionalNumber(input.purchase_price) as number,
      client_id: normalizeOptionalForeignKey(input.client_id),
      commission_type: null,
      commission_value: null,
      owner_net_amount: null,
      owner_client_id: null,
      contract_end_date: null,
      contract_document_url: null,
    };
  }

  if (model === "commission") {
    return {
      ...base,
      purchase_price: null,
      client_id: normalizeOptionalForeignKey(input.client_id),
      commission_type: (input.commission_type as CommissionType) ?? null,
      commission_value: parseOptionalNumber(input.commission_value),
      owner_net_amount: parseOptionalNumber(input.owner_net_amount),
      owner_client_id: normalizeOptionalForeignKey(input.owner_client_id),
      contract_end_date: normalizeOptionalDate(input.contract_end_date),
      contract_document_url: normalizeOptionalString(input.contract_document_url),
    };
  }

  return {
    ...base,
    purchase_price: null,
    client_id: normalizeOptionalForeignKey(input.client_id),
    commission_type: (input.commission_type as CommissionType) ?? null,
    commission_value: parseOptionalNumber(input.commission_value),
    owner_net_amount: null,
    owner_client_id: null,
    contract_end_date: null,
    contract_document_url: null,
  };
}

// ---------------------------------------------------------------------------
// Sale price & commission
// ---------------------------------------------------------------------------

export type CarFinanceInput = {
  business_model?: BusinessModel | string | null;
  purchase_price?: number | null;
  sale_price?: number | null;
  actual_sale_price?: number | null;
  commission_type?: CommissionType | string | null;
  commission_value?: number | null;
  owner_net_amount?: number | null;
  status?: string;
};

export type SaleBasePrice = {
  price: number;
  isActual: boolean;
  isEstimate: boolean;
};

export function resolveSaleBasePrice(car: CarFinanceInput): SaleBasePrice {
  const actualSale = car.actual_sale_price;
  if (
    actualSale !== null &&
    actualSale !== undefined &&
    !Number.isNaN(actualSale) &&
    actualSale > 0
  ) {
    return { price: Number(actualSale), isActual: true, isEstimate: false };
  }

  const salePrice = car.sale_price;
  if (
    salePrice !== null &&
    salePrice !== undefined &&
    !Number.isNaN(salePrice) &&
    salePrice > 0
  ) {
    return { price: Number(salePrice), isActual: false, isEstimate: true };
  }

  return { price: 0, isActual: false, isEstimate: true };
}

export function calculateGrossCommission(
  car: CarFinanceInput,
  saleBasePrice: number
): number {
  const commissionType = car.commission_type;
  const commissionValue = car.commission_value;

  if (
    commissionValue === null ||
    commissionValue === undefined ||
    Number.isNaN(commissionValue)
  ) {
    return 0;
  }

  if (commissionType === "fixed") {
    return Number(commissionValue);
  }

  if (commissionType === "percentage") {
    return saleBasePrice * Number(commissionValue) / 100;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Profit & revenue
// ---------------------------------------------------------------------------

export type CarProfitResult = {
  businessModel: BusinessModel;
  netProfit: number;
  grossCommission: number | null;
  revenue: number;
  isEstimate: boolean;
  salePriceUsed: number;
  usesActualSale: boolean;
};

export function calculateCarProfit(
  car: CarFinanceInput,
  totalExpenses: number
): CarProfitResult {
  const businessModel = getBusinessModel(
    car as Pick<CarFormInput, "business_model">
  );
  const saleBase = resolveSaleBasePrice(car);
  const sold = car.status === CAR_STATUS_SOLD;

  if (businessModel === "owned") {
    const purchasePrice =
      car.purchase_price === null || car.purchase_price === undefined
        ? 0
        : Number(car.purchase_price);

    const netProfit = saleBase.isActual
      ? saleBase.price - purchasePrice - totalExpenses
      : saleBase.price > 0
        ? saleBase.price - purchasePrice - totalExpenses
        : -purchasePrice - totalExpenses;

    return {
      businessModel,
      netProfit,
      grossCommission: null,
      revenue: sold && saleBase.isActual ? saleBase.price : 0,
      isEstimate: !saleBase.isActual,
      salePriceUsed: saleBase.price,
      usesActualSale: saleBase.isActual,
    };
  }

  const grossCommission = calculateGrossCommission(car, saleBase.price);
  const netProfit = grossCommission - totalExpenses;

  return {
    businessModel,
    netProfit,
    grossCommission,
    revenue: sold ? grossCommission : 0,
    isEstimate: !saleBase.isActual || !sold,
    salePriceUsed: saleBase.price,
    usesActualSale: saleBase.isActual,
  };
}

export function calculateRemAutoRevenue(
  car: CarFinanceInput,
  profitResult?: CarProfitResult
): number {
  const result = profitResult ?? calculateCarProfit(car, 0);
  return result.revenue;
}

export function shouldCountStatsRevenue(car: Car): boolean {
  return isCarSold(car);
}

export function shouldCountStatsProfit(car: Car): boolean {
  return isCarSold(car);
}

// ---------------------------------------------------------------------------
// List display helpers
// ---------------------------------------------------------------------------

export type ListAmount = {
  amount: number | null;
  isEstimate: boolean;
};

export type ListRowDisplay = {
  primary: ListAmount;
  secondary: ListAmount;
  profit: ListAmount;
  primaryLabelKey: ListLabelKey;
  secondaryLabelKey: ListLabelKey;
  profitLabelKey: ListLabelKey;
};

export type ListLabelKey =
  | "purchasePrice"
  | "ownerNetAmount"
  | "client"
  | "salePrice"
  | "expectedCommission"
  | "netProfit";

export function getListRowDisplay(
  car: Car,
  totalExpenses = 0,
  clientName?: string | null
): ListRowDisplay {
  const model = getBusinessModel(car);
  const profit = calculateCarProfit(car, totalExpenses);

  if (model === "owned") {
    return {
      primary: {
        amount:
          car.purchase_price !== null && car.purchase_price !== undefined
            ? Number(car.purchase_price)
            : null,
        isEstimate: false,
      },
      secondary: {
        amount: profit.salePriceUsed > 0 ? profit.salePriceUsed : null,
        isEstimate: profit.isEstimate,
      },
      profit: {
        amount: profit.netProfit,
        isEstimate: profit.isEstimate,
      },
      primaryLabelKey: "purchasePrice",
      secondaryLabelKey: "salePrice",
      profitLabelKey: "netProfit",
    };
  }

  if (model === "commission") {
    return {
      primary: {
        amount:
          car.owner_net_amount !== null && car.owner_net_amount !== undefined
            ? Number(car.owner_net_amount)
            : null,
        isEstimate: false,
      },
      secondary: {
        amount: profit.grossCommission,
        isEstimate: profit.isEstimate,
      },
      profit: {
        amount: profit.netProfit,
        isEstimate: profit.isEstimate,
      },
      primaryLabelKey: "ownerNetAmount",
      secondaryLabelKey: "expectedCommission",
      profitLabelKey: "netProfit",
    };
  }

  return {
    primary: {
      amount: null,
      isEstimate: false,
    },
    secondary: {
      amount: profit.grossCommission,
      isEstimate: profit.isEstimate,
    },
    profit: {
      amount: profit.netProfit,
      isEstimate: profit.isEstimate,
    },
    primaryLabelKey: "client",
    secondaryLabelKey: "expectedCommission",
    profitLabelKey: "netProfit",
    ...(clientName ? { clientName } : {}),
  } as ListRowDisplay & { clientName?: string };
}

export function formatListClientPrimary(
  display: ListRowDisplay,
  clientName: string | null | undefined,
  dash: string
): string {
  if (display.primaryLabelKey === "client") {
    return clientName?.trim() || dash;
  }
  return dash;
}

// ---------------------------------------------------------------------------
// Finance summary structure
// ---------------------------------------------------------------------------

export type FinanceSummaryLabelKey =
  | "purchase"
  | "expenses"
  | "sale"
  | "salePrice"
  | "actualSalePrice"
  | "estimatedProfit"
  | "actualProfit"
  | "ownerNetAmount"
  | "remautoCommission"
  | "vehiclePrice"
  | "netProfit";

export type FinanceSummaryRow = {
  labelKey: FinanceSummaryLabelKey;
  amount: number | null;
  isEstimate?: boolean;
  accent?: boolean;
  hint?: "commissionType";
};

export function getFinanceSummaryRows(
  car: Car,
  totalExpenses: number
): FinanceSummaryRow[] {
  const model = getBusinessModel(car);
  const profit = calculateCarProfit(car, totalExpenses);
  const saleBase = resolveSaleBasePrice(car);
  const actualSale =
    car.actual_sale_price !== null &&
    car.actual_sale_price !== undefined &&
    !Number.isNaN(car.actual_sale_price) &&
    car.actual_sale_price > 0
      ? Number(car.actual_sale_price)
      : null;
  const plannedSale =
    car.sale_price !== null &&
    car.sale_price !== undefined &&
    !Number.isNaN(car.sale_price)
      ? Number(car.sale_price)
      : null;

  if (model === "owned") {
    return [
      {
        labelKey: "purchase",
        amount:
          car.purchase_price !== null && car.purchase_price !== undefined
            ? Number(car.purchase_price)
            : null,
      },
      { labelKey: "expenses", amount: totalExpenses },
      {
        labelKey: "salePrice",
        amount: plannedSale,
        isEstimate: plannedSale !== null && actualSale === null,
      },
      {
        labelKey: "actualSalePrice",
        amount: actualSale,
      },
      {
        labelKey: profit.isEstimate ? "estimatedProfit" : "actualProfit",
        amount: profit.netProfit,
        isEstimate: profit.isEstimate,
        accent: true,
      },
    ];
  }

  if (model === "commission") {
    return [
      {
        labelKey: "ownerNetAmount",
        amount:
          car.owner_net_amount !== null && car.owner_net_amount !== undefined
            ? Number(car.owner_net_amount)
            : null,
      },
      {
        labelKey: "salePrice",
        amount: plannedSale,
        isEstimate: plannedSale !== null && actualSale === null,
      },
      {
        labelKey: "actualSalePrice",
        amount: actualSale,
      },
      {
        labelKey: "remautoCommission",
        amount: profit.grossCommission,
        isEstimate: profit.isEstimate,
        hint: "commissionType",
      },
      { labelKey: "expenses", amount: totalExpenses },
      {
        labelKey: "netProfit",
        amount: profit.netProfit,
        isEstimate: profit.isEstimate,
        accent: true,
      },
    ];
  }

  return [
    {
      labelKey: "vehiclePrice",
      amount: saleBase.price > 0 ? saleBase.price : null,
      isEstimate: saleBase.isEstimate,
    },
    {
      labelKey: "remautoCommission",
      amount: profit.grossCommission,
      isEstimate: profit.isEstimate,
      hint: "commissionType",
    },
    { labelKey: "expenses", amount: totalExpenses },
    {
      labelKey: "netProfit",
      amount: profit.netProfit,
      isEstimate: profit.isEstimate,
      accent: true,
    },
  ];
}

export function getFinanceSummaryTitleKey(model: BusinessModel) {
  if (model === "commission") return "commissionFinanceTitle" as const;
  if (model === "client_order") return "clientOrderFinanceTitle" as const;
  return "ownedFinanceTitle" as const;
}

export function formatCommissionDisplay(
  car: Pick<Car, "commission_type" | "commission_value">,
  formatCurrency: (value: number) => string
): string | null {
  if (
    car.commission_value === null ||
    car.commission_value === undefined ||
    Number.isNaN(car.commission_value)
  ) {
    return null;
  }

  if (car.commission_type === "percentage") {
    return `${car.commission_value}%`;
  }

  return formatCurrency(Number(car.commission_value));
}

export function formatGrossCommissionDisplay(
  car: Car,
  formatCurrency: (value: number) => string
): string | null {
  const profit = calculateCarProfit(car, 0);
  if (profit.grossCommission === null) return null;
  return formatCurrency(profit.grossCommission);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type CarValidationMessageKey =
  | "brandRequired"
  | "modelRequired"
  | "vinRequired"
  | "yearInvalid"
  | "statusRequired"
  | "businessModelRequired"
  | "ownerNetAmountRequired"
  | "commissionTypeRequired"
  | "commissionValueRequired"
  | "commissionPercentageInvalid"
  | "clientRequired"
  | "purchasePriceRequired"
  | "purchasePriceInvalid"
  | "actualSalePriceRequired"
  | "saleDateRequired"
  | "salePriceRequiredForPercentage"
  | "mileageInvalid"
  | "powerKwInvalid"
  | "keyCountInvalid";

export type CarValidationIssue = {
  field: CarField;
  messageKey: CarValidationMessageKey;
};

export type CarFieldErrors = Partial<Record<CarField, string>>;

function isInvalidYear(year: number | null | undefined): boolean {
  if (isMissingNumber(year)) return true;
  const currentYear = new Date().getFullYear();
  return (year as number) < 1900 || (year as number) > currentYear + 1;
}

function hasSaleBasePrice(input: CarFinanceInput): boolean {
  const base = resolveSaleBasePrice(input);
  return base.price > 0;
}

function validatePercentageCommission(
  input: CarFormInput,
  issues: CarValidationIssue[]
) {
  if (input.commission_type !== "percentage") return;

  if (
    input.commission_value !== null &&
    input.commission_value !== undefined &&
    !Number.isNaN(input.commission_value) &&
    input.commission_value > 100
  ) {
    issues.push({
      field: "commission_value",
      messageKey: "commissionPercentageInvalid",
    });
  }

  if (
    input.commission_value !== null &&
    input.commission_value !== undefined &&
    !Number.isNaN(input.commission_value) &&
    input.commission_value > 0 &&
    !hasSaleBasePrice(input)
  ) {
    issues.push({
      field: "sale_price",
      messageKey: "salePriceRequiredForPercentage",
    });
  }
}

export function collectCarValidationIssues(
  input: CarFormInput,
  options?: { requireSaleFields?: boolean }
): CarValidationIssue[] {
  const issues: CarValidationIssue[] = [];
  const model = getBusinessModel(input);

  if (isBlankString(input.brand)) {
    issues.push({ field: "brand", messageKey: "brandRequired" });
  }

  if (isBlankString(input.model)) {
    issues.push({ field: "model", messageKey: "modelRequired" });
  }

  if (isBlankString(input.vin)) {
    issues.push({ field: "vin", messageKey: "vinRequired" });
  }

  if (isInvalidYear(input.year)) {
    issues.push({ field: "year", messageKey: "yearInvalid" });
  }

  if (isBlankString(input.status)) {
    issues.push({ field: "status", messageKey: "statusRequired" });
  }

  if (input.business_model === null || input.business_model === undefined) {
    issues.push({ field: "business_model", messageKey: "businessModelRequired" });
  }

  if (model === "owned") {
    if (isInvalidNonNegativeNumber(input.purchase_price, { required: true })) {
      issues.push({
        field: "purchase_price",
        messageKey: isMissingNumber(input.purchase_price)
          ? "purchasePriceRequired"
          : "purchasePriceInvalid",
      });
    }
  }

  if (model === "commission") {
    if (isMissingPositiveNumber(input.owner_net_amount)) {
      issues.push({ field: "owner_net_amount", messageKey: "ownerNetAmountRequired" });
    }

    if (input.commission_type === null || input.commission_type === undefined) {
      issues.push({ field: "commission_type", messageKey: "commissionTypeRequired" });
    }

    if (isMissingPositiveNumber(input.commission_value)) {
      issues.push({ field: "commission_value", messageKey: "commissionValueRequired" });
    }

    validatePercentageCommission(input, issues);
  }

  if (model === "client_order") {
    if (
      input.client_id === null ||
      input.client_id === undefined ||
      Number.isNaN(input.client_id)
    ) {
      issues.push({ field: "client_id", messageKey: "clientRequired" });
    }

    if (input.commission_type === null || input.commission_type === undefined) {
      issues.push({ field: "commission_type", messageKey: "commissionTypeRequired" });
    }

    if (isMissingPositiveNumber(input.commission_value)) {
      issues.push({ field: "commission_value", messageKey: "commissionValueRequired" });
    }

    validatePercentageCommission(input, issues);
  }

  if (options?.requireSaleFields) {
    if (isMissingPositiveNumber(input.actual_sale_price)) {
      issues.push({
        field: "actual_sale_price",
        messageKey: "actualSalePriceRequired",
      });
    }

    if (isBlankString(input.sale_date)) {
      issues.push({ field: "sale_date", messageKey: "saleDateRequired" });
    }
  }

  if (input.mileage != null && input.mileage < 0) {
    issues.push({ field: "mileage", messageKey: "mileageInvalid" });
  }
  if (input.power_kw != null && input.power_kw < 0) {
    issues.push({ field: "power_kw", messageKey: "powerKwInvalid" });
  }
  if (input.key_count != null && input.key_count < 0) {
    issues.push({ field: "key_count", messageKey: "keyCountInvalid" });
  }

  return issues;
}

export function collectMarkSoldValidationIssues(
  car: Car,
  input: Pick<CarFormInput, "actual_sale_price" | "sale_date" | "client_id">
): CarValidationIssue[] {
  const issues: CarValidationIssue[] = [];
  const model = getBusinessModel(car);

  if (isMissingPositiveNumber(input.actual_sale_price)) {
    issues.push({
      field: "actual_sale_price",
      messageKey: "actualSalePriceRequired",
    });
  }

  if (isBlankString(input.sale_date)) {
    issues.push({ field: "sale_date", messageKey: "saleDateRequired" });
  }

  if (model === "owned") {
    if (isMissingNumber(car.purchase_price)) {
      issues.push({
        field: "purchase_price",
        messageKey: "purchasePriceRequired",
      });
    } else if (isInvalidNonNegativeNumber(car.purchase_price, { required: true })) {
      issues.push({
        field: "purchase_price",
        messageKey: "purchasePriceInvalid",
      });
    }
  }

  if (model === "commission" || model === "client_order") {
    if (car.commission_type === null || car.commission_type === undefined) {
      issues.push({
        field: "commission_type",
        messageKey: "commissionTypeRequired",
      });
    }

    if (isMissingPositiveNumber(car.commission_value)) {
      issues.push({
        field: "commission_value",
        messageKey: "commissionValueRequired",
      });
    } else if (
      car.commission_type === "percentage" &&
      car.commission_value !== null &&
      car.commission_value !== undefined &&
      !Number.isNaN(car.commission_value) &&
      car.commission_value > 100
    ) {
      issues.push({
        field: "commission_value",
        messageKey: "commissionPercentageInvalid",
      });
    }
  }

  return issues;
}

export function getHiddenValidationFields(
  model: BusinessModel = DEFAULT_BUSINESS_MODEL
): CarField[] {
  return getHiddenFormFields(model);
}

export function stripHiddenFieldErrors(
  fieldErrors: CarFieldErrors,
  model: BusinessModel = DEFAULT_BUSINESS_MODEL
): CarFieldErrors {
  const hidden = new Set(getHiddenValidationFields(model));
  const next: CarFieldErrors = {};

  for (const [field, message] of Object.entries(fieldErrors)) {
    if (!hidden.has(field as CarField)) {
      next[field as CarField] = message;
    }
  }

  return next;
}
