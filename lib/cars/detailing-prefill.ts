import type { DetailingOrderPrefill } from "@/lib/types/detailing";
import { getCarById, getClientById } from "@/lib/queries/cars";

export async function loadDetailingOrderPrefill(
  carId: number
): Promise<DetailingOrderPrefill | null> {
  try {
    const car = await getCarById(carId);
    const client = car.client_id ? await getClientById(car.client_id) : null;
    const nameParts = client?.full_name?.trim().split(/\s+/) ?? [];

    return {
      carId: car.id,
      vehicleMakeModel: `${car.brand} ${car.model}`.trim(),
      registrationNumber: car.registration_number ?? "",
      isInternalVehicle: car.business_model === "owned",
      customerFirstName: nameParts[0] ?? "",
      customerLastName: nameParts.slice(1).join(" ") || "",
      customerPhone: client?.phone ?? "",
    };
  } catch {
    return null;
  }
}
