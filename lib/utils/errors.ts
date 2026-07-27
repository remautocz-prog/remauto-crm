export async function formatSupabaseError(error: {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}) {
  console.error("[Supabase]", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });

  return error.message ?? "Unknown database error";
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<string, string>>;
      duplicates?: Array<{
        id: number;
        full_name: string;
        company: string | null;
        email: string | null;
        phone: string | null;
        matchReason: "phone" | "email" | "company" | "tax_id";
      }>;
    };
