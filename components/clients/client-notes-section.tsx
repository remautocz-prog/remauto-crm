"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import type { ClientNote } from "@/lib/types/clients";
import {
  createClientNoteAction,
  deleteClientNoteAction,
  updateClientNoteAction,
} from "@/lib/actions/client-notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useFormatters } from "@/lib/hooks/use-formatters";

type ClientNotesSectionProps = {
  clientId: number;
  notes: ClientNote[];
  currentUserId: string | null;
};

export function ClientNotesSection({
  clientId,
  notes,
  currentUserId,
}: ClientNotesSectionProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const t = useTranslations("clients");
  const tActions = useTranslations("actions");
  const tCommon = useTranslations("common");
  const { formatDateTime } = useFormatters();
  const dash = tCommon("dash");

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createClientNoteAction(clientId, { content });
      if (!result.success) return;
      setContent("");
      showToast(t("noteAdded"));
      router.refresh();
    });
  }

  function handleUpdate(noteId: string) {
    startTransition(async () => {
      const result = await updateClientNoteAction(noteId, { content: editContent });
      if (!result.success) return;
      setEditingId(null);
      showToast(t("noteUpdated"));
      router.refresh();
    });
  }

  function handleDelete(noteId: string) {
    if (!confirm(t("deleteNoteConfirm"))) return;
    startTransition(async () => {
      const result = await deleteClientNoteAction(noteId);
      if (!result.success) return;
      showToast(t("noteDeleted"));
      router.refresh();
    });
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{t("clientNotes")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {toast ? (
          <p className="text-sm text-green-400" role="status">
            {toast}
          </p>
        ) : null}
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("addNote")}
            rows={3}
          />
          <Button onClick={handleCreate} disabled={!content.trim() || isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {t("addNote")}
          </Button>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-zinc-400">{t("noNotes")}</p>
        ) : (
          <ul className="space-y-4">
            {notes.map((note) => {
              const canEdit = !note.created_by || note.created_by === currentUserId;
              const isEditing = editingId === note.id;

              return (
                <li key={note.id} className="rounded-lg border border-zinc-800/80 p-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(note.id)} disabled={isPending}>
                          {t("editNote")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          {tActions("cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm text-zinc-200">{note.content}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                        <span>
                          {note.author?.full_name ?? dash} · {formatDateTime(note.created_at, dash)}
                        </span>
                        {canEdit ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(note.id);
                                setEditContent(note.content);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t("editNote")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(note.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t("deleteNote")}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
