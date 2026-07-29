"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Archive, Copy, FileUp, Loader2, Pencil, Play, Trash2 } from "lucide-react";
import {
  archiveDocumentTemplateAction,
  createDocumentTemplateAction,
  deleteDocumentTemplateAction,
  duplicateDocumentTemplateAction,
  updateDocumentTemplateMetadataAction,
  validateTemplateFileAction,
} from "@/lib/actions/document-templates";
import { testDocumentTemplateAction } from "@/lib/actions/document-generation";
import {
  DATA_SOURCE_MODES,
  DEFAULT_DATA_SOURCE_BY_CATEGORY,
} from "@/lib/constants/document-template-data-source";
import {
  DOCUMENT_TEMPLATE_CATEGORIES,
  type DocumentTemplateCategory,
} from "@/lib/constants/document-templates";
import type { DocumentTemplate } from "@/lib/types/document-templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFormatters } from "@/lib/hooks/use-formatters";

type TemplatesManagerProps = {
  templates: DocumentTemplate[];
};

export function TemplatesManager({ templates }: TemplatesManagerProps) {
  const t = useTranslations("documentGenerator");
  const tCat = useTranslations("documentGenerator.categories");
  const tMode = useTranslations("documentGenerator.dataSourceMode");
  const { formatDateTime } = useFormatters();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showCreate, setShowCreate] = useState(templates.length === 0);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(DOCUMENT_TEMPLATE_CATEGORIES[0]);
  const [language, setLanguage] = useState("cs");
  const [dataSourceMode, setDataSourceMode] = useState<string>(
    DEFAULT_DATA_SOURCE_BY_CATEGORY[DOCUMENT_TEMPLATE_CATEGORIES[0]]
  );
  const [description, setDescription] = useState("");
  const [recognized, setRecognized] = useState<string[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [filterDataSourceMode, setFilterDataSourceMode] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDataSourceMode(
      DEFAULT_DATA_SOURCE_BY_CATEGORY[category as DocumentTemplateCategory]
    );
  }, [category]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      if (filterCategory !== "all" && template.category !== filterCategory) {
        return false;
      }
      if (filterLanguage !== "all" && template.language !== filterLanguage) {
        return false;
      }
      if (
        filterDataSourceMode !== "all" &&
        template.data_source_mode !== filterDataSourceMode
      ) {
        return false;
      }
      if (filterStatus === "active" && !template.is_active) return false;
      if (filterStatus === "archived" && template.is_active) return false;
      return true;
    });
  }, [templates, filterCategory, filterLanguage, filterDataSourceMode, filterStatus]);

  function resetForm() {
    setName("");
    setDescription("");
    setRecognized([]);
    setUnknown([]);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleValidateFile(file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await validateTemplateFileAction(formData);
      if (!result.success) {
        setError(result.error);
        setRecognized([]);
        setUnknown([]);
        return;
      }
      setRecognized(result.data?.recognized ?? []);
      setUnknown(result.data?.unknown ?? []);
      setError(null);
    });
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError(t("uploadDocxTemplate"));
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("category", category);
    formData.set("language", language);
    formData.set("data_source_mode", dataSourceMode);
    formData.set("description", description);
    formData.set("file", file);

    startTransition(async () => {
      const result = await createDocumentTemplateAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      resetForm();
      setShowCreate(false);
      router.refresh();
    });
  }

  function runTemplateAction(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? t("documentGenerationFailed"));
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base text-white">{t("documentTemplates")}</CardTitle>
          <Button size="sm" onClick={() => setShowCreate((value) => !value)}>
            {showCreate ? t("hideUploadForm") : t("uploadDocxTemplate")}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label={t("filterCategory")}
              value={filterCategory}
              onChange={setFilterCategory}
              options={[
                { value: "all", label: t("filterAll") },
                ...DOCUMENT_TEMPLATE_CATEGORIES.map((item) => ({
                  value: item,
                  label: tCat(item),
                })),
              ]}
            />
            <FilterSelect
              label={t("filterLanguage")}
              value={filterLanguage}
              onChange={setFilterLanguage}
              options={[
                { value: "all", label: t("filterAll") },
                { value: "ru", label: "RU" },
                { value: "cs", label: "CS" },
                { value: "en", label: "EN" },
              ]}
            />
            <FilterSelect
              label={t("filterDataSourceMode")}
              value={filterDataSourceMode}
              onChange={setFilterDataSourceMode}
              options={[
                { value: "all", label: t("filterAll") },
                ...DATA_SOURCE_MODES.map((mode) => ({
                  value: mode,
                  label: tMode(mode),
                })),
              ]}
            />
            <FilterSelect
              label={t("filterStatus")}
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: "all", label: t("filterAll") },
                { value: "active", label: t("filterActive") },
                { value: "archived", label: t("filterArchived") },
              ]}
            />
          </div>

          {templates.length === 0 ? (
            <p className="mb-4 text-sm text-zinc-400">{t("noTemplatesYet")}</p>
          ) : filteredTemplates.length === 0 ? (
            <p className="mb-4 text-sm text-zinc-400">{t("noTemplatesAvailable")}</p>
          ) : (
            <ul className="mb-4 space-y-3">
              {filteredTemplates.map((template) => (
                <li
                  key={template.id}
                  className="rounded-lg border border-zinc-800/80 p-3 text-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-white">
                        {template.name}
                        {!template.is_active ? (
                          <span className="ml-2 text-xs text-zinc-500">
                            ({t("templateArchived")})
                          </span>
                        ) : null}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge variant="outline">{tCat(template.category)}</Badge>
                        <Badge variant="outline">{template.language.toUpperCase()}</Badge>
                        <Badge variant="outline">{tMode(template.data_source_mode)}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("templateVersion")}: {formatDateTime(template.updated_at)} ·{" "}
                        {template.original_filename}
                      </p>
                      {template.description ? (
                        <p className="mt-1 text-xs text-zinc-400">{template.description}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t("editTemplate")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || !template.is_active}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await testDocumentTemplateAction(template.id);
                            if (result.success && result.data?.downloadUrl) {
                              window.open(result.data.downloadUrl, "_blank", "noopener,noreferrer");
                            } else if (!result.success) {
                              setError(result.error ?? t("templateValidationFailed"));
                            }
                          })
                        }
                      >
                        <Play className="h-3.5 w-3.5" />
                        {t("testTemplate")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          runTemplateAction(() => duplicateDocumentTemplateAction(template.id))
                        }
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {t("duplicateTemplate")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() =>
                          runTemplateAction(() =>
                            archiveDocumentTemplateAction(template.id, template.is_active)
                          )
                        }
                      >
                        <Archive className="h-3.5 w-3.5" />
                        {template.is_active ? t("archiveTemplate") : t("restoreTemplate")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() =>
                          runTemplateAction(() => deleteDocumentTemplateAction(template.id))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("deleteTemplate")}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showCreate ? (
            <form onSubmit={handleCreate} className="space-y-4 border-t border-zinc-800 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("templateName")}</Label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("templateCategory")}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TEMPLATE_CATEGORIES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {tCat(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("documentLanguage")}</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">RU</SelectItem>
                      <SelectItem value="cs">CS</SelectItem>
                      <SelectItem value="en">EN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tMode("dataSourceMode")}</Label>
                  <Select value={dataSourceMode} onValueChange={setDataSourceMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_SOURCE_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {tMode(mode)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500">{tMode("data_source_mode_help")}</p>
                  <p className="text-xs text-zinc-500">{tMode(`${dataSourceMode}_help` as never)}</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("uploadDocxTemplate")}</Label>
                  <Input
                    ref={fileRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => handleValidateFile(event.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("templateDescription")}</Label>
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              {recognized.length > 0 ? (
                <p className="text-xs text-emerald-300">
                  {t("recognizedPlaceholders")}: {recognized.join(", ")}
                </p>
              ) : null}
              {unknown.length > 0 ? (
                <p className="text-xs text-amber-300">
                  {t("unknownPlaceholders")}: {unknown.join(", ")}
                </p>
              ) : null}
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {t("createTemplate")}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <TemplateEditDialog
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
        onSaved={() => {
          setEditingTemplate(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TemplateEditDialog({
  template,
  onClose,
  onSaved,
}: {
  template: DocumentTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("documentGenerator");
  const tCat = useTranslations("documentGenerator.categories");
  const tMode = useTranslations("documentGenerator.dataSourceMode");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(DOCUMENT_TEMPLATE_CATEGORIES[0]);
  const [language, setLanguage] = useState("cs");
  const [dataSourceMode, setDataSourceMode] = useState<string>(
    DEFAULT_DATA_SOURCE_BY_CATEGORY[DOCUMENT_TEMPLATE_CATEGORIES[0]]
  );
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!template) return;
    setName(template.name);
    setCategory(template.category);
    setLanguage(template.language);
    setDataSourceMode(template.data_source_mode);
    setDescription(template.description ?? "");
    setError(null);
  }, [template]);

  function handleSave() {
    if (!template) return;
    startTransition(async () => {
      const result = await updateDocumentTemplateMetadataAction({
        templateId: template.id,
        name,
        category: category as DocumentTemplateCategory,
        language: language as DocumentTemplate["language"],
        description,
        data_source_mode: dataSourceMode as (typeof DATA_SOURCE_MODES)[number],
      });
      if (!result.success) {
        setError(result.error ?? t("documentGenerationFailed"));
        return;
      }
      onSaved();
    });
  }

  return (
    <Dialog open={Boolean(template)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editTemplate")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("templateName")}</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("templateCategory")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TEMPLATE_CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {tCat(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("documentLanguage")}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">RU</SelectItem>
                <SelectItem value="cs">CS</SelectItem>
                <SelectItem value="en">EN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tMode("dataSourceMode")}</Label>
            <Select value={dataSourceMode} onValueChange={setDataSourceMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_SOURCE_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {tMode(mode)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">{tMode("data_source_mode_help")}</p>
            <p className="text-xs text-zinc-500">{tMode(`${dataSourceMode}_help` as never)}</p>
          </div>
          <div className="space-y-2">
            <Label>{t("templateDescription")}</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("saveTemplateMetadata")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
