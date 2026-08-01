"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Pencil, Plus } from "lucide-react";
import {
  DETAILING_PRICE_TYPES,
  DETAILING_SERVICE_CATEGORIES,
  type DetailingPriceType,
  type DetailingServiceCategory,
} from "@/lib/constants/detailing";
import {
  saveDetailingServiceAction,
  updateDetailingServiceAction,
} from "@/lib/actions/detailing";
import {
  formatDetailingServicePrice,
  getDetailingServiceName,
} from "@/lib/detailing/service-labels";
import { isValidLocale, type AppLocale } from "@/i18n/config";
import type { DetailingService } from "@/lib/types/detailing";
import { DetailingPageHeader } from "@/components/detailing/detailing-page-header";
import { DetailingSection, DetailingTable } from "@/components/detailing/detailing-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatters } from "@/lib/hooks/use-formatters";

type DetailingServicesAdminProps = {
  services: DetailingService[];
};

const emptyForm = {
  name_cs: "",
  name_ru: "",
  description_cs: "",
  description_ru: "",
  category: "other" as DetailingServiceCategory,
  base_price: "",
  max_price: "",
  price_type: "fixed" as DetailingPriceType,
  unit: "",
  active: true,
  sort_order: "0",
};

export function DetailingServicesAdmin({ services }: DetailingServicesAdminProps) {
  const t = useTranslations("detailing");
  const rawLocale = useLocale();
  const locale: AppLocale = isValidLocale(rawLocale) ? rawLocale : "ru";
  const { formatCurrency } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const priceLabels = {
    from: t("priceLabels.from"),
    range: t("priceLabels.range"),
    perItem: t("priceLabels.perItem"),
    onRequest: t("priceLabels.onRequest"),
    custom: t("priceLabels.custom"),
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((service) => {
      if (categoryFilter !== "all" && service.category !== categoryFilter) return false;
      if (activeFilter === "active" && !service.active) return false;
      if (activeFilter === "inactive" && service.active) return false;
      if (!q) return true;
      return (
        service.name_cs.toLowerCase().includes(q) ||
        service.name_ru.toLowerCase().includes(q)
      );
    });
  }, [services, search, categoryFilter, activeFilter]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setEditorOpen(true);
  }

  function openEdit(service: DetailingService) {
    setEditingId(service.id);
    setForm({
      name_cs: service.name_cs,
      name_ru: service.name_ru,
      description_cs: service.description_cs ?? "",
      description_ru: service.description_ru ?? "",
      category: service.category,
      base_price: service.base_price != null ? String(service.base_price) : "",
      max_price: service.max_price != null ? String(service.max_price) : "",
      price_type: service.price_type,
      unit: service.unit ?? "",
      active: service.active,
      sort_order: String(service.sort_order),
    });
    setEditorOpen(true);
  }

  function saveService() {
    startTransition(async () => {
      const result = await saveDetailingServiceAction({
        id: editingId ?? undefined,
        name_cs: form.name_cs,
        name_ru: form.name_ru,
        description_cs: form.description_cs || null,
        description_ru: form.description_ru || null,
        category: form.category,
        base_price: form.base_price === "" ? null : Number(form.base_price.replace(",", ".")),
        max_price: form.max_price === "" ? null : Number(form.max_price.replace(",", ".")),
        price_type: form.price_type,
        unit: form.unit || null,
        active: form.active,
        sort_order: Number(form.sort_order) || 0,
      });
      setMessage(result.success ? t("serviceSaved") : result.error);
      if (result.success) setEditorOpen(false);
    });
  }

  function toggleActive(service: DetailingService) {
    startTransition(async () => {
      const result = await updateDetailingServiceAction({
        id: service.id,
        active: !service.active,
      });
      setMessage(result.success ? t("serviceSaved") : result.error);
    });
  }

  return (
    <div className="space-y-8">
      <DetailingPageHeader title={t("servicesTitle")} description={t("servicesDescription")} />

      <div className="flex justify-end">
        <Button onClick={openCreate} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          {t("createService")}
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchServicesPlaceholder")}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger><SelectValue placeholder={t("fields.category")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allCategories")}</SelectItem>
              {DETAILING_SERVICE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{t(`categories.${cat}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              <SelectItem value="active">{t("active")}</SelectItem>
              <SelectItem value="inactive">{t("inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="hidden overflow-x-auto rounded-xl border border-zinc-800 md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/80 text-left text-zinc-400">
            <tr>
              <th className="px-4 py-3">{t("fields.nameCs")}</th>
              <th className="px-4 py-3">{t("fields.nameRu")}</th>
              <th className="px-4 py-3">{t("fields.category")}</th>
              <th className="px-4 py-3">{t("fields.price")}</th>
              <th className="px-4 py-3">{t("fields.priceType")}</th>
              <th className="px-4 py-3">{t("fields.unit")}</th>
              <th className="px-4 py-3">{t("fields.status")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((service) => (
              <tr key={service.id} className="border-t border-zinc-800">
                <td className="px-4 py-3">{service.name_cs}</td>
                <td className="px-4 py-3">{service.name_ru}</td>
                <td className="px-4 py-3">{t(`categories.${service.category}`)}</td>
                <td className="px-4 py-3">
                  {formatDetailingServicePrice(service, formatCurrency, priceLabels)}
                </td>
                <td className="px-4 py-3">{t(`priceTypes.${service.price_type}`)}</td>
                <td className="px-4 py-3">{service.unit || "—"}</td>
                <td className="px-4 py-3">{service.active ? t("active") : t("inactive")}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleActive(service)} disabled={isPending}>
                      {service.active ? t("archive") : t("activate")}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {filtered.map((service) => (
          <div key={service.id} className="rounded-xl border border-zinc-800 p-4">
            <p className="font-medium text-white">{getDetailingServiceName(service, locale)}</p>
            <p className="text-sm text-zinc-500">
              {formatDetailingServicePrice(service, formatCurrency, priceLabels)}
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(service)}>{t("edit")}</Button>
              <Button variant="secondary" size="sm" onClick={() => toggleActive(service)} disabled={isPending}>
                {service.active ? t("archive") : t("activate")}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!filtered.length ? <p className="text-sm text-zinc-500">{t("noServicesFound")}</p> : null}
      {message ? <p className="text-sm text-zinc-400">{message}</p> : null}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? t("editService") : t("createService")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("fields.nameCs")}</Label>
                <Input value={form.name_cs} onChange={(e) => setForm({ ...form, name_cs: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{t("fields.nameRu")}</Label>
                <Input value={form.name_ru} onChange={(e) => setForm({ ...form, name_ru: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("fields.descriptionCs")}</Label>
              <Textarea value={form.description_cs} onChange={(e) => setForm({ ...form, description_cs: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>{t("fields.descriptionRu")}</Label>
              <Textarea value={form.description_ru} onChange={(e) => setForm({ ...form, description_ru: e.target.value })} rows={2} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("fields.category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as DetailingServiceCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DETAILING_SERVICE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{t(`categories.${cat}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("fields.priceType")}</Label>
                <Select value={form.price_type} onValueChange={(v) => setForm({ ...form, price_type: v as DetailingPriceType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DETAILING_PRICE_TYPES.map((pt) => (
                      <SelectItem key={pt} value={pt}>{t(`priceTypes.${pt}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>{t("fields.basePrice")}</Label>
                <Input value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{t("fields.maxPrice")}</Label>
                <Input value={form.max_price} onChange={(e) => setForm({ ...form, max_price: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{t("fields.unit")}</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("fields.sortOrder")}</Label>
                <Input value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                {t("active")}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>{t("cancel")}</Button>
            <Button onClick={saveService} disabled={isPending || !form.name_cs.trim() || !form.name_ru.trim()}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("saveService")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
