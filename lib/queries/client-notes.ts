import { createClient } from "@/lib/supabase/server";
import type { ClientNote } from "@/lib/types/clients";

const NOTE_SELECT = `
  *,
  author:created_by ( id, full_name )
`;

function mapNote(row: Record<string, unknown>): ClientNote {
  const author = row.author as ClientNote["author"];
  return {
    id: String(row.id),
    client_id: Number(row.client_id),
    content: String(row.content ?? ""),
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    author: author ?? null,
  };
}

export async function getClientNotes(clientId: number): Promise<ClientNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .select(NOTE_SELECT)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapNote(row as Record<string, unknown>));
}

export async function getClientNoteById(noteId: string): Promise<ClientNote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .select(NOTE_SELECT)
    .eq("id", noteId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapNote(data as Record<string, unknown>);
}
