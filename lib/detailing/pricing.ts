import {
  DETAILING_VEHICLE_SIZE_SURCHARGE_PERCENT,
  type DetailingPriceType,
  type DetailingVehicleSize,
} from "@/lib/constants/detailing";

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getVehicleSizeSurchargePercent(
  vehicleSize: DetailingVehicleSize
): number {
  return DETAILING_VEHICLE_SIZE_SURCHARGE_PERCENT[vehicleSize] ?? 0;
}

export function isSurchargeEligiblePrice(
  unitPrice: number | null | undefined,
  priceType?: DetailingPriceType | null
): boolean {
  if (unitPrice == null || unitPrice <= 0) return false;
  if (priceType === "on_request" || priceType === "custom") return false;
  return true;
}

export function calculateLineTotal(
  unitPrice: number | null | undefined,
  quantity: number
): number {
  if (unitPrice == null || quantity <= 0) return 0;
  return roundMoney(unitPrice * quantity);
}

export type OrderPricingLine = {
  unit_price: number | null;
  quantity: number;
  total_price?: number | null;
  price_type?: DetailingPriceType | null;
};

export type OrderPricingInput = {
  services: OrderPricingLine[];
  vehicleSize: DetailingVehicleSize;
  discountAmount?: number | null;
  finalPriceOverride?: number | null;
};

export type OrderPricingResult = {
  servicesSubtotal: number;
  surchargePercent: number;
  vehicleSurchargeAmount: number;
  discountAmount: number;
  calculatedFinal: number;
  finalPrice: number;
};

export function calculateOrderPricing(input: OrderPricingInput): OrderPricingResult {
  const servicesSubtotal = roundMoney(
    input.services.reduce((sum, line) => {
      const total =
        line.total_price != null
          ? line.total_price
          : calculateLineTotal(line.unit_price, line.quantity);
      return sum + total;
    }, 0)
  );

  const surchargePercent = getVehicleSizeSurchargePercent(input.vehicleSize);
  const surchargeBase = roundMoney(
    input.services.reduce((sum, line) => {
      if (!isSurchargeEligiblePrice(line.unit_price, line.price_type)) {
        return sum;
      }
      const total =
        line.total_price != null
          ? line.total_price
          : calculateLineTotal(line.unit_price, line.quantity);
      return sum + total;
    }, 0)
  );

  const vehicleSurchargeAmount = roundMoney(
    surchargeBase * (surchargePercent / 100)
  );
  const discountAmount = roundMoney(Math.max(input.discountAmount ?? 0, 0));
  const calculatedFinal = roundMoney(
    Math.max(servicesSubtotal + vehicleSurchargeAmount - discountAmount, 0)
  );
  const finalPrice =
    input.finalPriceOverride != null && input.finalPriceOverride >= 0
      ? roundMoney(input.finalPriceOverride)
      : calculatedFinal;

  return {
    servicesSubtotal,
    surchargePercent,
    vehicleSurchargeAmount,
    discountAmount,
    calculatedFinal,
    finalPrice,
  };
}

export function calculatePaymentStatus(
  finalPrice: number,
  paidAmount: number
): "unpaid" | "partially_paid" | "paid" {
  const paid = roundMoney(Math.max(paidAmount, 0));
  const total = roundMoney(Math.max(finalPrice, 0));
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partially_paid";
}

export function calculateRemainingAmount(
  finalPrice: number,
  paidAmount: number
): number {
  return roundMoney(Math.max(finalPrice - Math.max(paidAmount, 0), 0));
}

export function resolveQuickPaymentUpdate(
  finalPrice: number,
  targetStatus: "paid" | "unpaid"
): {
  paid_amount: number;
  remaining_amount: number;
  payment_status: "paid" | "unpaid";
} {
  const total = roundMoney(Math.max(finalPrice, 0));

  if (targetStatus === "paid") {
    return {
      paid_amount: total,
      remaining_amount: 0,
      payment_status: "paid",
    };
  }

  return {
    paid_amount: 0,
    remaining_amount: total,
    payment_status: "unpaid",
  };
}

export function defaultUnitPriceForService(service: {
  base_price: number | null;
  price_type: DetailingPriceType;
}): number | null {
  if (service.price_type === "on_request" || service.price_type === "custom") {
    return null;
  }
  return service.base_price;
}
