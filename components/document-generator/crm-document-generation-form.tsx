"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { DataSourceMode } from "@/lib/constants/document-template-data-source";
import type { DocumentTemplateCategory } from "@/lib/constants/document-templates";
import {
  cloneDocumentTemplateData,
  getGenerationSections,
  isDocumentOnlyFieldPath,
} from "@/lib/documents/apply-template-overrides";
import type { DocumentTemplateData } from "@/lib/types/document-templates";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CrmDocumentGenerationFormProps = {
  category: DocumentTemplateCategory;
  dataSourceMode: DataSourceMode;
  baseData: DocumentTemplateData | null;
  value: DocumentTemplateData;
  onChange: (value: DocumentTemplateData) => void;
  isLoading?: boolean;
};

function sectionData(
  data: DocumentTemplateData,
  section: string
): Record<string, string> {
  if (section === "handover") {
    return {};
  }
  return (data[section as keyof DocumentTemplateData] as Record<string, string>) ?? {};
}

function dataHandover(data: DocumentTemplateData) {
  const handover = data.handover as Record<string, unknown> | undefined;
  return {
    notes: typeof handover?.notes === "string" ? handover.notes : "",
    vehicle_a: (handover?.vehicle_a as Record<string, string> | undefined) ?? {},
    vehicle_b: (handover?.vehicle_b as Record<string, string> | undefined) ?? {},
  };
}

export function CrmDocumentGenerationForm({
  category,
  dataSourceMode,
  baseData,
  value,
  onChange,
  isLoading,
}: CrmDocumentGenerationFormProps) {
  const t = useTranslations("documentGenerator");
  const tMode = useTranslations("documentGenerator.dataSourceMode");
  const sections = useMemo(() => getGenerationSections(category), [category]);

  function isEditable(path: string) {
    if (dataSourceMode === "crm_with_manual_overrides") return true;
    if (dataSourceMode === "manual_only") return true;
    return isDocumentOnlyFieldPath(path);
  }

  function isOverridden(path: string, currentValue: string) {
    if (!baseData) return dataSourceMode !== "crm_only";
    const [section, ...rest] = path.split(".");
    if (section === "handover") {
      if (rest[0] === "notes") {
        return dataHandover(value).notes !== dataHandover(baseData).notes;
      }
      const side = rest[0] as "vehicle_a" | "vehicle_b";
      const key = rest[1];
      return (
        (dataHandover(value)[side][key] ?? "") !==
        (dataHandover(baseData)[side][key] ?? "")
      );
    }
    const key = rest[0];
    const baseSection = sectionData(baseData, section);
    const valueSection = sectionData(value, section);
    return (valueSection[key] ?? "") !== (baseSection[key] ?? "");
  }

  function updateFlat(section: string, key: string, nextValue: string) {
    onChange({
      ...value,
      [section]: {
        ...sectionData(value, section),
        [key]: nextValue,
      },
    });
  }

  function updateHandoverSide(
    side: "vehicle_a" | "vehicle_b",
    key: string,
    nextValue: string
  ) {
    const current = dataHandover(value);
    onChange({
      ...value,
      handover: {
        vehicle_a: side === "vehicle_a"
          ? { ...current.vehicle_a, [key]: nextValue }
          : current.vehicle_a,
        vehicle_b: side === "vehicle_b"
          ? { ...current.vehicle_b, [key]: nextValue }
          : current.vehicle_b,
        notes: current.notes,
      },
    });
  }

  function updateHandoverNotes(nextValue: string) {
    const current = dataHandover(value);
    onChange({
      ...value,
      handover: {
        ...current,
        notes: nextValue,
      },
    });
  }

  if (isLoading) {
    return <p className="text-sm text-zinc-400">{t("loadingPreview")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800/80 p-3">
        <Badge variant="outline" className="mb-2">
          {tMode(dataSourceMode)}
        </Badge>
        <p className="text-xs text-zinc-400">{tMode(`${dataSourceMode}_help` as never)}</p>
      </div>

      {sections.map((section) => {
        if (section === "handover") {
          return (
            <div key={section} className="space-y-3 rounded-lg border border-zinc-800 p-3">
              <p className="text-sm font-medium text-white">{t(`sections.${section}` as never)}</p>
              {(["vehicle_a", "vehicle_b"] as const).map((side) => (
                <div key={side} className="space-y-2 rounded-md border border-zinc-800/70 p-2">
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    {t(`sections.${side}` as never)}
                  </p>
                  {Object.entries(dataHandover(value)[side]).map(([key, fieldValue]) => {
                    const path = `handover.${side}.${key}`;
                    const editable = isEditable(path);
                    return (
                      <FieldRow
                        key={path}
                        label={key}
                        value={fieldValue}
                        editable={editable}
                        overridden={isOverridden(path, fieldValue)}
                        onChange={(next) => updateHandoverSide(side, key, next)}
                        t={t}
                        tMode={tMode}
                      />
                    );
                  })}
                </div>
              ))}
              <FieldRow
                label="notes"
                value={dataHandover(value).notes}
                editable={isEditable("handover.notes")}
                overridden={isOverridden("handover.notes", dataHandover(value).notes)}
                onChange={updateHandoverNotes}
                multiline
                t={t}
                tMode={tMode}
              />
            </div>
          );
        }

        const fields = sectionData(value, section);
        if (Object.keys(fields).length === 0 && dataSourceMode === "manual_only") {
          return (
            <div key={section} className="space-y-2 rounded-lg border border-zinc-800 p-3">
              <p className="text-sm font-medium text-white">{t(`sections.${section}` as never)}</p>
              <p className="text-xs text-zinc-500">{t("manualSectionEmpty")}</p>
            </div>
          );
        }

        return (
          <div key={section} className="space-y-2 rounded-lg border border-zinc-800 p-3">
            <p className="text-sm font-medium text-white">{t(`sections.${section}` as never)}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(fields).map(([key, fieldValue]) => {
                const path = `${section}.${key}`;
                const editable = isEditable(path);
                return (
                  <FieldRow
                    key={path}
                    label={key}
                    value={fieldValue}
                    editable={editable}
                    overridden={isOverridden(path, fieldValue)}
                    onChange={(next) => updateFlat(section, key, next)}
                    multiline={key.includes("notes") || key.includes("defects") || key.includes("terms")}
                    t={t}
                    tMode={tMode}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldRow({
  label,
  value,
  editable,
  overridden,
  onChange,
  multiline,
  t,
  tMode,
}: {
  label: string;
  value: string;
  editable: boolean;
  overridden: boolean;
  onChange: (value: string) => void;
  multiline?: boolean;
  t: ReturnType<typeof useTranslations<"documentGenerator">>;
  tMode: ReturnType<typeof useTranslations<"documentGenerator.dataSourceMode">>;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-zinc-400">{label}</Label>
        {overridden ? (
          <Badge variant="outline" className="text-[10px] text-amber-200">
            {tMode("valueOverridden")}
          </Badge>
        ) : editable ? null : (
          <Badge variant="outline" className="text-[10px] text-zinc-400">
            {tMode("crmValue")}
          </Badge>
        )}
      </div>
      {multiline ? (
        <Textarea
          rows={2}
          value={value}
          readOnly={!editable}
          className={cn(!editable && "opacity-80")}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          value={value}
          readOnly={!editable}
          className={cn(!editable && "opacity-80")}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

export function useCrmDocumentFormState(
  baseData: DocumentTemplateData | null,
  initialSnapshot?: DocumentTemplateData | null
) {
  const [formData, setFormData] = useState<DocumentTemplateData>(
    initialSnapshot ?? baseData ?? cloneDocumentTemplateData(emptyFallback())
  );

  useEffect(() => {
    if (initialSnapshot) {
      setFormData(cloneDocumentTemplateData(initialSnapshot));
      return;
    }
    if (baseData) {
      setFormData(cloneDocumentTemplateData(baseData));
    }
  }, [baseData, initialSnapshot]);

  return [formData, setFormData] as const;
}

function emptyFallback(): DocumentTemplateData {
  return {
    company: {},
    client: {},
    vehicle: {},
    order: {},
    document: {},
    employee: {},
    deal: {},
    vehicle_a: {},
    vehicle_b: {},
    handover: { vehicle_a: {}, vehicle_b: {}, notes: "" },
  };
}
