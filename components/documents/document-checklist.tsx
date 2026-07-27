"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import type { ChecklistItem } from "@/lib/types/documents";
import {
  getChecklistProgress,
  toggleChecklistItem,
} from "@/lib/documents/checklists";
import { updateDocumentChecklistAction } from "@/lib/actions/documents";
import { translateChecklistItem } from "@/lib/i18n/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DocumentChecklistProps = {
  taskId: number;
  required: ChecklistItem[];
  received: ChecklistItem[];
  editable?: boolean;
};

export function DocumentChecklist({
  taskId,
  required,
  received,
  editable = true,
}: DocumentChecklistProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customItem, setCustomItem] = useState("");
  const [localRequired, setLocalRequired] = useState(required);
  const [localReceived, setLocalReceived] = useState(received);

  const t = useTranslations("documents");
  const tChecklist = useTranslations("documents.checklist");
  const progress = getChecklistProgress(localRequired, localReceived);

  function persist(nextRequired: ChecklistItem[], nextReceived: ChecklistItem[]) {
    setLocalRequired(nextRequired);
    setLocalReceived(nextReceived);
    startTransition(async () => {
      await updateDocumentChecklistAction(taskId, nextRequired, nextReceived);
      router.refresh();
    });
  }

  function handleToggle(key: string, checked: boolean) {
    const nextReceived = toggleChecklistItem(localRequired, localReceived, key, checked);
    persist(localRequired, nextReceived);
  }

  function handleAddCustom() {
    const label = customItem.trim();
    if (!label) return;
    const key = `custom_${Date.now()}`;
    const item = { key, custom: true, label };
    persist([...localRequired, item], localReceived);
    setCustomItem("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          {t("checklistProgress", { done: progress.done, total: progress.total })}
        </p>
        <span className="text-sm font-medium text-white">{progress.percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-red-600 transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <ul className="space-y-2">
        {localRequired.map((item) => {
          const checked = localReceived.some((r) => r.key === item.key);
          return (
            <li key={item.key} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={checked}
                disabled={!editable || isPending}
                onChange={(e) => handleToggle(item.key, e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600"
              />
              <span className={checked ? "text-zinc-400 line-through" : "text-zinc-200"}>
                {translateChecklistItem((key) => tChecklist(key as never), item)}
              </span>
            </li>
          );
        })}
      </ul>

      {editable ? (
        <div className="flex gap-2">
          <Input
            value={customItem}
            onChange={(e) => setCustomItem(e.target.value)}
            placeholder={t("addChecklistItemPlaceholder")}
          />
          <Button type="button" variant="secondary" onClick={handleAddCustom} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("addChecklistItem")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
