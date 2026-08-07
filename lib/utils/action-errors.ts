import { getTranslations } from "next-intl/server";

export async function formatDeleteActionError(error: {
  code?: string;
  message?: string;
}): Promise<string> {
  const t = await getTranslations("access");

  if (error.code === "23503") {
    return t("deleteBlockedDependencies");
  }

  if (error.code === "42501") {
    return t("permissionDenied");
  }

  return t("deleteFailed");
}
