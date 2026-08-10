import { formatDeleteUserFacingError } from "@/lib/utils/user-facing-error";

export async function formatDeleteActionError(error: {
  code?: string;
  message?: string;
}): Promise<string> {
  return formatDeleteUserFacingError(error);
}
