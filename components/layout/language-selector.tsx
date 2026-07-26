"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Languages } from "lucide-react";
import { setLocale } from "@/lib/actions/locale";
import {
  isValidLocale,
  localeLabels,
  locales,
  type AppLocale,
} from "@/i18n/config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSelector() {
  const router = useRouter();
  const t = useTranslations("language");
  const rawLocale = useLocale();
  const locale: AppLocale = isValidLocale(rawLocale) ? rawLocale : "ru";
  const [isPending, startTransition] = useTransition();

  function handleSelect(nextLocale: AppLocale) {
    if (nextLocale === locale) return;

    startTransition(async () => {
      await setLocale(nextLocale);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className="gap-1.5 border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800"
        >
          <Languages className="h-4 w-4 text-zinc-400" />
          <span className="font-medium">{localeLabels[locale].short}</span>
          <span className="hidden text-zinc-400 sm:inline">
            {localeLabels[locale].name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("select")}</DropdownMenuLabel>
        {locales.map((item) => (
          <DropdownMenuItem
            key={item}
            onClick={() => handleSelect(item)}
            className="flex items-center justify-between"
          >
            <span>
              <span className="mr-2 font-medium text-zinc-300">
                {localeLabels[item].short}
              </span>
              {localeLabels[item].name}
            </span>
            {item === locale ? (
              <Check className="h-4 w-4 text-red-500" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
