"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { upsertDealHandoverAction } from "@/lib/actions/deals";
import {
  HANDOVER_DOCUMENT_VALUES,
  HANDOVER_FUEL_LEVEL_VALUES,
  type HandoverVehicleSide,
} from "@/lib/constants/handover";
import { getHandoverDetailForSide, isHandoverSideComplete } from "@/lib/deals/handover";
import type { DealHandoverDetail, DealWithRelations } from "@/lib/types/deals";
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
import { cn } from "@/lib/utils";

type SideFormState = {
  handover_datetime: string;
  mileage: string;
  fuel_level: string;
  fuel_custom: string;
  key_count: string;
  documents: string[];
  accessories: string;
  visible_damage: string;
  notes: string;
};

function toSideFormState(detail: DealHandoverDetail | null): SideFormState {
  const fuel = detail?.fuel_level ?? "";
  const isPreset = HANDOVER_FUEL_LEVEL_VALUES.includes(
    fuel as (typeof HANDOVER_FUEL_LEVEL_VALUES)[number]
  );
  return {
    handover_datetime: detail?.handover_datetime
      ? detail.handover_datetime.slice(0, 16)
      : "",
    mileage: detail?.mileage != null ? String(detail.mileage) : "",
    fuel_level: isPreset ? fuel : fuel ? "custom" : "",
    fuel_custom: !isPreset && fuel ? fuel : "",
    key_count: detail?.key_count != null ? String(detail.key_count) : "",
    documents: detail?.documents ?? [],
    accessories: detail?.accessories ?? "",
    visible_damage: detail?.visible_damage ?? "",
    notes: detail?.notes ?? "",
  };
}

type DealHandoverPanelProps = {
  deal: DealWithRelations;
  defaultSide?: HandoverVehicleSide;
  compact?: boolean;
};

function SideForm({
  dealId,
  side,
  initial,
  onSaved,
}: {
  dealId: string;
  side: HandoverVehicleSide;
  initial: DealHandoverDetail | null;
  onSaved: () => void;
}) {
  const t = useTranslations("deals.handoverPanel");
  const tDocs = useTranslations("deals.handoverPanel.documents");
  const tFuel = useTranslations("deals.handoverPanel.fuelLevels");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<SideFormState>(() => toSideFormState(initial));

  const complete = isHandoverSideComplete(initial);

  function toggleDocument(code: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      documents: checked
        ? [...prev.documents, code]
        : prev.documents.filter((item) => item !== code),
    }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const fuelLevel =
        form.fuel_level === "custom"
          ? form.fuel_custom.trim() || null
          : form.fuel_level || null;

      const result = await upsertDealHandoverAction({
        deal_id: dealId,
        vehicle_side: side,
        handover_datetime: form.handover_datetime
          ? new Date(form.handover_datetime).toISOString()
          : null,
        mileage: form.mileage ? Number(form.mileage) : null,
        fuel_level: fuelLevel,
        key_count: form.key_count ? Number(form.key_count) : null,
        documents: form.documents,
        accessories: form.accessories || null,
        visible_damage: form.visible_damage || null,
        notes: form.notes || null,
      });

      if (!result.success) {
        setError(result.error ?? t("saveFailed"));
        return;
      }

      setSaved(true);
      onSaved();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">
          {side === "vehicle_a" ? t("vehicleAHandover") : t("vehicleBHandover")}
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            complete ? "bg-green-950/50 text-green-300" : "bg-amber-950/40 text-amber-200"
          )}
        >
          {complete ? t("sideComplete") : t("handoverIncomplete")}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${side}_datetime`}>{t("handoverDatetime")}</Label>
          <Input
            id={`${side}_datetime`}
            type="datetime-local"
            value={form.handover_datetime}
            onChange={(e) => {
              setForm({ ...form, handover_datetime: e.target.value });
              setSaved(false);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${side}_mileage`}>{t("mileage")}</Label>
          <Input
            id={`${side}_mileage`}
            type="number"
            min={0}
            value={form.mileage}
            onChange={(e) => {
              setForm({ ...form, mileage: e.target.value });
              setSaved(false);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("fuelLevel")}</Label>
          <Select
            value={form.fuel_level || "none"}
            onValueChange={(value) => {
              setForm({
                ...form,
                fuel_level: value === "none" ? "" : value,
                fuel_custom: value === "custom" ? form.fuel_custom : "",
              });
              setSaved(false);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("fuelLevel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {HANDOVER_FUEL_LEVEL_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {tFuel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.fuel_level === "custom" ? (
            <Input
              value={form.fuel_custom}
              placeholder={t("fuelCustomPlaceholder")}
              onChange={(e) => {
                setForm({ ...form, fuel_custom: e.target.value });
                setSaved(false);
              }}
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${side}_keys`}>{t("keyCount")}</Label>
          <Input
            id={`${side}_keys`}
            type="number"
            min={0}
            value={form.key_count}
            onChange={(e) => {
              setForm({ ...form, key_count: e.target.value });
              setSaved(false);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("handedOverDocuments")}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {HANDOVER_DOCUMENT_VALUES.map((code) => (
            <label key={code} className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                className="rounded border-zinc-600"
                checked={form.documents.includes(code)}
                onChange={(e) => toggleDocument(code, e.target.checked)}
              />
              {tDocs(code)}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${side}_accessories`}>{t("accessories")}</Label>
        <Textarea
          id={`${side}_accessories`}
          value={form.accessories}
          onChange={(e) => {
            setForm({ ...form, accessories: e.target.value });
            setSaved(false);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${side}_damage`}>{t("visibleDamage")}</Label>
        <Textarea
          id={`${side}_damage`}
          value={form.visible_damage}
          onChange={(e) => {
            setForm({ ...form, visible_damage: e.target.value });
            setSaved(false);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${side}_notes`}>{t("sideNotes")}</Label>
        <Textarea
          id={`${side}_notes`}
          value={form.notes}
          onChange={(e) => {
            setForm({ ...form, notes: e.target.value });
            setSaved(false);
          }}
        />
      </div>

      {error ? (
        <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-green-300">{t("handoverSaved")}</p>
      ) : null}

      <Button type="button" onClick={handleSave} disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("saveHandover")}
      </Button>
    </div>
  );
}

export function DealHandoverPanel({
  deal,
  defaultSide = "vehicle_a",
  compact = false,
}: DealHandoverPanelProps) {
  const t = useTranslations("deals.handoverPanel");
  const [activeSide, setActiveSide] = useState<HandoverVehicleSide>(defaultSide);
  const [, setRevision] = useState(0);

  const sideA = useMemo(
    () => getHandoverDetailForSide(deal.handover_details, "vehicle_a"),
    [deal.handover_details]
  );
  const sideB = useMemo(
    () => getHandoverDetailForSide(deal.handover_details, "vehicle_b"),
    [deal.handover_details]
  );

  const content = (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["vehicle_a", "vehicle_b"] as const).map((side) => (
          <Button
            key={side}
            type="button"
            size="sm"
            variant={activeSide === side ? "default" : "outline"}
            onClick={() => setActiveSide(side)}
          >
            {side === "vehicle_a" ? t("vehicleAHandover") : t("vehicleBHandover")}
          </Button>
        ))}
      </div>
      <SideForm
        key={`${activeSide}-${deal.updated_at}`}
        dealId={deal.id}
        side={activeSide}
        initial={activeSide === "vehicle_a" ? sideA : sideB}
        onSaved={() => setRevision((value) => value + 1)}
      />
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader>
        <CardTitle className="text-base text-white">{t("handoverProtocol")}</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
