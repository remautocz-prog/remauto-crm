"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DOCUMENT_SERVICE_CATEGORIES,
  type DocumentServiceCategory,
} from "@/lib/constants/documents";
import {
  filterGroupedServices,
  isLegacyDocumentServiceType,
  resolveDocumentServiceLabelKey,
} from "@/lib/documents/services";
import { bindDocumentServiceTranslator, translateDocumentService } from "@/lib/i18n/documents";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DocumentServiceSelectProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
  className?: string;
  error?: boolean;
};

export function DocumentServiceSelect({
  value,
  onChange,
  id,
  className,
  error,
}: DocumentServiceSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const tServices = useTranslations("documents.services");
  const tCategories = useTranslations("documents.serviceCategories");
  const tFields = useTranslations("fields");
  const t = useTranslations("documents");

  const legacyValue =
    value && isLegacyDocumentServiceType(value) ? value : null;

  const grouped = useMemo(
    () => filterGroupedServices(query, { includeLegacy: legacyValue ? [legacyValue] : [] }),
    [query, legacyValue]
  );

  const serviceT = bindDocumentServiceTranslator(tServices as (key: never) => string);

  const displayLabel = value
    ? translateDocumentService(serviceT, value)
    : tFields("notSelected");

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handlePointerDown);
      return () => document.removeEventListener("mousedown", handlePointerDown);
    }
  }, [open]);

  function selectService(code: string | null) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  function renderOption(code: string) {
    const labelKey = resolveDocumentServiceLabelKey(code);
    const label = translateDocumentService(serviceT, code);
    const isSelected = value === code;

    return (
      <button
        key={code}
        type="button"
        className={cn(
          "flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-800",
          isSelected && "bg-zinc-800/80 text-white"
        )}
        onClick={() => selectService(code)}
      >
        {label}
        {code !== labelKey && isLegacyDocumentServiceType(code) ? (
          <span className="ml-2 text-xs text-zinc-500">({code})</span>
        ) : null}
      </button>
    );
  }

  function renderCategory(category: DocumentServiceCategory) {
    const items = grouped[category];
    if (!items.length) return null;

    return (
      <div key={category}>
        <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
          {tCategories(category)}
        </div>
        {items.map((code) => renderOption(code))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100",
          "focus:outline-none focus:ring-2 focus:ring-red-500/40",
          error && "border-red-500",
          className
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={cn(!value && "text-zinc-500")}>{displayLabel}</span>
        <ChevronDown className="size-4 shrink-0 opacity-60" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 shadow-lg">
          <div className="border-b border-zinc-800 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-zinc-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchServices")}
                className="pl-8"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-800"
              onClick={() => selectService(null)}
            >
              {tFields("notSelected")}
            </button>
            {legacyValue ? (
              <div>
                <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {t("legacyService")}
                </div>
                {renderOption(legacyValue)}
              </div>
            ) : null}
            {DOCUMENT_SERVICE_CATEGORIES.map((category) => renderCategory(category))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
