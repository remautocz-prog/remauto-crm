import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_STORAGE_BUCKETS } from "@/lib/constants/document-templates";
import { sanitizeDocumentFilename } from "@/lib/documents/template-engine";

export async function uploadTemplateFile(input: {
  templateId: string;
  filename: string;
  buffer: Buffer;
}) {
  const supabase = await createClient();
  const safeName = sanitizeDocumentFilename(input.filename);
  const path = `templates/${input.templateId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKETS.templates)
    .upload(path, input.buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });

  if (error) throw error;
  return path;
}

export async function downloadTemplateFile(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKETS.templates)
    .download(storagePath);

  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

export async function uploadGeneratedDocx(input: {
  generatedId: string;
  clientId: number | null;
  filename: string;
  buffer: Buffer;
}) {
  const supabase = await createClient();
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const clientPart = input.clientId ?? "unknown";
  const safeName = sanitizeDocumentFilename(input.filename);
  const path = `generated/${year}/${month}/${clientPart}/${input.generatedId}/${safeName}.docx`;

  const { error } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKETS.generated)
    .upload(path, input.buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });

  if (error) throw error;
  return path;
}

export async function createSignedDownloadUrl(
  bucket: keyof typeof DOCUMENT_STORAGE_BUCKETS,
  storagePath: string,
  expiresInSeconds = 300
) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKETS[bucket])
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}

export async function removeStorageFile(
  bucket: keyof typeof DOCUMENT_STORAGE_BUCKETS,
  storagePath: string
) {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKETS[bucket])
    .remove([storagePath]);

  if (error) throw error;
}
