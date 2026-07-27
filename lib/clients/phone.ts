export function normalizePhoneForComparison(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value.replace(/[\s\-().]/g, "");
}

export function normalizePhoneForWhatsApp(value: string | null | undefined): string | null {
  const digits = normalizePhoneForComparison(value)?.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `420${digits.slice(1)}`;
  return digits;
}

export function buildTelHref(phone: string | null | undefined): string | null {
  const normalized = normalizePhoneForComparison(phone);
  if (!normalized) return null;
  return `tel:${phone!.trim()}`;
}

export function buildWhatsAppHref(phone: string | null | undefined): string | null {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}`;
}
