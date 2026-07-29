"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { updateCompanySettingsAction } from "@/lib/actions/document-templates";
import type { CompanySettings } from "@/lib/types/document-templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CompanySettingsFormProps = {
  settings: CompanySettings;
};

export function CompanySettingsForm({ settings }: CompanySettingsFormProps) {
  const t = useTranslations("documentGenerator");
  const tFields = useTranslations("fields");
  const [form, setForm] = useState({
    name: settings.name ?? "",
    ico: settings.ico ?? "",
    dic: settings.dic ?? "",
    address: settings.address ?? "",
    city: settings.city ?? "",
    postal_code: settings.postal_code ?? "",
    country: settings.country ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    bank_account: settings.bank_account ?? "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateCompanySettingsAction(form);
      setMessage(result.success ? t("companySettingsSaved") : result.error);
    });
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{t("companySettings")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["name", tFields("name")],
              ["ico", t("companyIco")],
              ["dic", t("companyDic")],
              ["address", tFields("address")],
              ["city", t("companyCity")],
              ["postal_code", t("postalCode")],
              ["country", tFields("country")],
              ["phone", tFields("phone")],
              ["email", tFields("email")],
              ["bank_account", t("bankAccount")],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <Input
                value={form[key]}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, [key]: event.target.value }))
                }
              />
            </div>
          ))}
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("saveCompanySettings")}
            </Button>
            {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
