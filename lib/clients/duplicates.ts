import type { Client, ClientDuplicateMatch, ClientFormInput } from "@/lib/types/clients";
import { normalizeEmail, normalizeOptionalString, normalizePhone } from "@/lib/clients/validation";

function pushMatch(
  matches: ClientDuplicateMatch[],
  client: Client,
  reason: ClientDuplicateMatch["matchReason"],
  excludeId?: number
) {
  if (excludeId && client.id === excludeId) return;
  if (matches.some((item) => item.id === client.id)) return;
  matches.push({
    id: client.id,
    full_name: client.full_name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    matchReason: reason,
  });
}

export function findClientDuplicates(
  input: ClientFormInput,
  existingClients: Client[],
  excludeId?: number
): ClientDuplicateMatch[] {
  const matches: ClientDuplicateMatch[] = [];
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const company = normalizeOptionalString(input.company)?.toLowerCase();
  const taxId = normalizeOptionalString(input.tax_id)?.toLowerCase();

  for (const client of existingClients) {
    if (excludeId && client.id === excludeId) continue;

    if (phone && normalizePhone(client.phone) === phone) {
      pushMatch(matches, client, "phone", excludeId);
    }

    if (email && normalizeEmail(client.email) === email) {
      pushMatch(matches, client, "email", excludeId);
    }

    if (company && normalizeOptionalString(client.company)?.toLowerCase() === company) {
      pushMatch(matches, client, "company", excludeId);
    }

    if (taxId && normalizeOptionalString(client.tax_id)?.toLowerCase() === taxId) {
      pushMatch(matches, client, "tax_id", excludeId);
    }
  }

  return matches;
}
