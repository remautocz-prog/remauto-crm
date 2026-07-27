"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Loader2, Search } from "lucide-react";
import type { Profile } from "@/lib/types/cars";
import { updateDocumentTaskAssignmentAction } from "@/lib/actions/documents";
import type { DocumentListToast } from "@/components/documents/document-inline-status-select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DocumentInlineAssigneeSelectProps = {
  taskId: number;
  assignedTo: string | null;
  assigneeName?: string | null;
  profiles: Profile[];
  onAssignmentChange?: (taskId: number, assignedTo: string | null, assigneeName: string | null) => void;
  onToast?: (toast: DocumentListToast) => void;
  className?: string;
};

export function DocumentInlineAssigneeSelect({
  taskId,
  assignedTo,
  assigneeName,
  profiles,
  onAssignmentChange,
  onToast,
  className,
}: DocumentInlineAssigneeSelectProps) {
  const [value, setValue] = useState<string | null>(assignedTo);
  const [label, setLabel] = useState<string | null>(assigneeName ?? null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("documents");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter((profile) =>
      (profile.full_name ?? profile.id).toLowerCase().includes(term)
    );
  }, [profiles, search]);

  function handleSelect(nextValue: string | null, nextLabel: string | null) {
    if (nextValue === value) {
      setOpen(false);
      return;
    }

    const previousValue = value;
    const previousLabel = label;
    setValue(nextValue);
    setLabel(nextLabel);
    setOpen(false);
    setSearch("");

    startTransition(async () => {
      const result = await updateDocumentTaskAssignmentAction(taskId, nextValue);
      if (!result.success) {
        setValue(previousValue);
        setLabel(previousLabel);
        onToast?.({ message: t("assignmentUpdateFailed"), type: "error" });
        return;
      }
      onAssignmentChange?.(taskId, nextValue, nextLabel);
      onToast?.({ message: t("assignmentUpdated"), type: "success" });
    });
  }

  const displayLabel = label?.trim() || t("unassigned");

  return (
    <div ref={containerRef} className={cn("relative min-w-[9rem]", className)}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-left text-xs text-zinc-200",
          isPending && "opacity-70"
        )}
        aria-label={t("responsibleEmployee")}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      </button>
      {isPending ? (
        <Loader2 className="absolute -right-5 top-1.5 h-3.5 w-3.5 animate-spin text-zinc-400" />
      ) : null}
      {open ? (
        <div className="absolute z-50 mt-1 w-64 rounded-md border border-zinc-700 bg-zinc-950 p-2 shadow-xl">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchAssignees")}
              className="h-8 pl-8 text-xs"
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-y-auto text-sm">
            <li>
              <button
                type="button"
                className="w-full rounded px-2 py-1.5 text-left text-zinc-300 hover:bg-zinc-800"
                onClick={() => handleSelect(null, null)}
              >
                {t("unassigned")}
              </button>
            </li>
            {filteredProfiles.map((profile) => (
              <li key={profile.id}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-zinc-200 hover:bg-zinc-800"
                  onClick={() =>
                    handleSelect(profile.id, profile.full_name ?? profile.id)
                  }
                >
                  {profile.full_name ?? profile.id}
                </button>
              </li>
            ))}
            {filteredProfiles.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-zinc-500">{t("noAssigneesFound")}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
