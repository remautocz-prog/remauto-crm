import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ArchiveModuleCounts = {
  documents: number;
  detailing: number;
  deals: number;
};

export async function getArchiveModuleCounts(): Promise<ArchiveModuleCounts> {
  const supabase = await createClient();

  const [documents, detailing, deals] = await Promise.all([
    supabase
      .from("document_tasks")
      .select("id", { count: "exact", head: true })
      .not("archived_at", "is", null),
    supabase
      .from("detailing_orders")
      .select("id", { count: "exact", head: true })
      .not("archived_at", "is", null),
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .not("archived_at", "is", null),
  ]);

  return {
    documents: documents.count ?? 0,
    detailing: detailing.count ?? 0,
    deals: deals.count ?? 0,
  };
}
