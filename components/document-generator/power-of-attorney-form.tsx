"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  buildPowerOfAttorneyPreviewAction,
  getPowerOfAttorneyDealVehiclesAction,
  loadPowerOfAttorneyAutofillAction,
  searchPowerOfAttorneyClientsAction,
  searchPowerOfAttorneyVehiclesAction,
} from "@/lib/actions/power-of-attorney";
import { generateDocumentAction } from "@/lib/actions/document-generation";
import {
  POA_AUTHORIZATION_SCOPES,
  POA_NOTARIZED_OPTIONS,
  POA_PARTY_TYPES,
  POA_VALIDITY_TYPES,
} from "@/lib/constants/power-of-attorney";
import type { DocumentTemplateLanguage } from "@/lib/constants/document-templates";
import type { DocumentTemplateData } from "@/lib/types/document-templates";
import type {
  PowerOfAttorneyFormInput,
  PowerOfAttorneyPartyInput,
  PowerOfAttorneyVehicleInput,
} from "@/lib/types/power-of-attorney";
import {
  buildAuthorizationScopeText,
  buildScopeLabels,
  collectPowerOfAttorneyValidationIssues,
  emptyPowerOfAttorneyForm,
  getScopeLabelKey,
  mergePartyFields,
  mergeVehicleFields,
  partyDisplayName,
  type PoaDealVehicleOption,
  type PoaDealVehicleSide,
} from "@/lib/documents/power-of-attorney";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type PowerOfAttorneyFormProps = {
  templateId: string;
  language: DocumentTemplateLanguage;
  documentName: string;
  initialForm?: PowerOfAttorneyFormInput | null;
  contextClientId?: number | null;
  contextVehicleId?: number | null;
  contextDealId?: string | null;
  onGenerated: () => void;
  onError: (message: string) => void;
};

type SearchOption = { id: number; label: string };

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-zinc-800 p-3">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {children}
    </section>
  );
}

function PartyFields({
  prefix,
  party,
  onChange,
  showPrincipalExtras,
  showAuthorizedExtras,
  t,
}: {
  prefix: string;
  party: PowerOfAttorneyPartyInput;
  onChange: (party: PowerOfAttorneyPartyInput) => void;
  showPrincipalExtras?: boolean;
  showAuthorizedExtras?: boolean;
  t: ReturnType<typeof useTranslations<"documentGenerator.powerOfAttorney">>;
}) {
  function setField<K extends keyof PowerOfAttorneyPartyInput>(
    key: K,
    value: PowerOfAttorneyPartyInput[K]
  ) {
    onChange({ ...party, [key]: value });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>{t("partyType")}</Label>
        <Select
          value={party.type}
          onValueChange={(value) =>
            setField("type", value as PowerOfAttorneyPartyInput["type"])
          }
        >
          <SelectTrigger id={`${prefix}_type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POA_PARTY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(type === "individual" ? "privatePerson" : "company")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {party.type === "individual" ? (
        <>
          <Field id={`${prefix}_full_name`} label={t("fullName")} value={party.full_name} onChange={(v) => setField("full_name", v)} />
          <Field id={`${prefix}_birth_date`} label={t("birthDate")} type="date" value={party.birth_date} onChange={(v) => setField("birth_date", v)} />
          <Field id={`${prefix}_personal_id`} label={t("personalIdNumber")} value={party.personal_id_number} onChange={(v) => setField("personal_id_number", v)} />
          <Field id={`${prefix}_identity_doc`} label={t("identityDocumentNumber")} value={party.identity_document_number} onChange={(v) => setField("identity_document_number", v)} />
          <Field id={`${prefix}_address`} label={t("permanentAddress")} value={party.address} onChange={(v) => setField("address", v)} />
          {showPrincipalExtras ? (
            <Field id={`${prefix}_contact_address`} label={t("contactAddress")} value={party.contact_address} onChange={(v) => setField("contact_address", v)} />
          ) : null}
        </>
      ) : (
        <>
          <Field id={`${prefix}_company_name`} label={t("companyName")} value={party.company_name} onChange={(v) => setField("company_name", v)} />
          <Field id={`${prefix}_ico`} label={t("ico")} value={party.ico} onChange={(v) => setField("ico", v)} />
          <Field id={`${prefix}_dic`} label={t("dic")} value={party.dic} onChange={(v) => setField("dic", v)} />
          <Field id={`${prefix}_address`} label={t("registeredAddress")} value={party.address} onChange={(v) => setField("address", v)} />
          <Field id={`${prefix}_represented_by`} label={t("representedBy")} value={party.represented_by} onChange={(v) => setField("represented_by", v)} />
          <Field id={`${prefix}_representative_position`} label={t("representativePosition")} value={party.representative_position} onChange={(v) => setField("representative_position", v)} />
          {showPrincipalExtras ? (
            <Field id={`${prefix}_registry_info`} label={t("registryInformation")} value={party.registry_information} onChange={(v) => setField("registry_information", v)} />
          ) : null}
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${prefix}_phone`} label={t("phone")} value={party.phone} onChange={(v) => setField("phone", v)} />
        <Field id={`${prefix}_email`} label={t("email")} value={party.email} onChange={(v) => setField("email", v)} />
      </div>

      {showPrincipalExtras ? (
        <>
          <Field id={`${prefix}_bank_account`} label={t("bankAccount")} value={party.bank_account} onChange={(v) => setField("bank_account", v)} />
          <Field id={`${prefix}_country`} label={t("country")} value={party.country} onChange={(v) => setField("country", v)} />
          <Field id={`${prefix}_identification_notes`} label={t("identificationNotes")} value={party.identification_notes} onChange={(v) => setField("identification_notes", v)} />
        </>
      ) : null}

      {showAuthorizedExtras ? (
        <>
          <Field id={`${prefix}_position_relationship`} label={t("positionOrRelationship")} value={party.position_or_relationship} onChange={(v) => setField("position_or_relationship", v)} />
          <Field id={`${prefix}_authorization_notes`} label={t("authorizationNotes")} value={party.authorization_notes} onChange={(v) => setField("authorization_notes", v)} />
        </>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-zinc-400">
        {label}
      </Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export function PowerOfAttorneyForm({
  templateId,
  language,
  documentName,
  initialForm,
  contextClientId,
  contextVehicleId,
  contextDealId,
  onGenerated,
  onError,
}: PowerOfAttorneyFormProps) {
  const t = useTranslations("documentGenerator.powerOfAttorney");
  const [form, setForm] = useState<PowerOfAttorneyFormInput>(
    initialForm ?? emptyPowerOfAttorneyForm()
  );
  const [step, setStep] = useState<"form" | "preview">("form");
  const [preview, setPreview] = useState<DocumentTemplateData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [clientOptions, setClientOptions] = useState<SearchOption[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<SearchOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    contextClientId ?? null
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    contextVehicleId ?? null
  );
  const [dealVehicleOptions, setDealVehicleOptions] = useState<PoaDealVehicleOption[]>([]);
  const [selectedDealVehicleSide, setSelectedDealVehicleSide] =
    useState<PoaDealVehicleSide | null>(null);
  const [copiedFromDealSide, setCopiedFromDealSide] = useState<PoaDealVehicleSide | null>(null);
  const [isDealVehiclesLoading, setIsDealVehiclesLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isAutofillPending, startAutofillTransition] = useTransition();

  const scopeLabels = useMemo(() => buildScopeLabels((key) => t(key as never)), [t]);

  useEffect(() => {
    if (!contextDealId) {
      setDealVehicleOptions([]);
      setSelectedDealVehicleSide(null);
      setCopiedFromDealSide(null);
      return;
    }

    let cancelled = false;
    setIsDealVehiclesLoading(true);

    getPowerOfAttorneyDealVehiclesAction(contextDealId)
      .then((options) => {
        if (cancelled) return;
        setDealVehicleOptions(options);
        const available = options.filter((option) => option.available);
        if (available.length === 1) {
          setSelectedDealVehicleSide(available[0].side);
        } else {
          setSelectedDealVehicleSide((current) =>
            current && available.some((option) => option.side === current) ? current : null
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsDealVehiclesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contextDealId]);

  function toggleScope(scope: (typeof POA_AUTHORIZATION_SCOPES)[number]) {
    setForm((prev) => {
      const nextScopes = prev.authorization_scopes.includes(scope)
        ? prev.authorization_scopes.filter((item) => item !== scope)
        : [...prev.authorization_scopes, scope];
      const generated = buildAuthorizationScopeText(nextScopes, scopeLabels);
      return {
        ...prev,
        authorization_scopes: nextScopes,
        authorization_scope_text: generated,
      };
    });
  }

  function copySelectedDealVehicle() {
    if (!selectedDealVehicleSide || !contextDealId) return;
    const source =
      selectedDealVehicleSide === "a" ? "deal_vehicle_a" : "deal_vehicle_b";
    startAutofillTransition(async () => {
      const result = await loadPowerOfAttorneyAutofillAction({
        source,
        dealId: contextDealId,
      });
      if (!result.success) {
        onError(result.error ?? t("autofillFailed"));
        return;
      }
      if (!result.data?.vehicle) {
        onError(t("autofillFailed"));
        return;
      }
      setForm((prev) => ({
        ...prev,
        vehicle: mergeVehicleFields(prev.vehicle, result.data!.vehicle!),
      }));
      setCopiedFromDealSide(selectedDealVehicleSide);
    });
  }

  function runAutofill(
    target: "principal" | "authorized_person" | "vehicle",
    source:
      | "remauto_company"
      | "employee"
      | "client"
      | "vehicle"
      | "deal_vehicle_a"
      | "deal_vehicle_b"
  ) {
    startAutofillTransition(async () => {
      const result = await loadPowerOfAttorneyAutofillAction({
        source,
        clientId: selectedClientId ?? contextClientId ?? undefined,
        vehicleId: selectedVehicleId ?? contextVehicleId ?? undefined,
        dealId: contextDealId ?? undefined,
      });
      if (!result.success) {
        onError(result.error ?? t("autofillFailed"));
        return;
      }
      if (!result.data) {
        onError(t("autofillFailed"));
        return;
      }
      setForm((prev) => {
        if (target === "vehicle" && result.data?.vehicle) {
          return {
            ...prev,
            vehicle: mergeVehicleFields(prev.vehicle, result.data.vehicle),
          };
        }
        if (result.data?.party) {
          const key = target === "principal" ? "principal" : "authorized_person";
          return {
            ...prev,
            [key]: mergePartyFields(prev[key], result.data.party),
          };
        }
        return prev;
      });
      if (target === "vehicle" && result.data?.vehicle) {
        setCopiedFromDealSide(null);
      }
    });
  }

  function searchClients() {
    startTransition(async () => {
      const options = await searchPowerOfAttorneyClientsAction(clientQuery);
      setClientOptions(options);
    });
  }

  function searchVehicles() {
    startTransition(async () => {
      const options = await searchPowerOfAttorneyVehiclesAction(vehicleQuery);
      setVehicleOptions(options);
    });
  }

  function openPreview() {
    const issues = collectPowerOfAttorneyValidationIssues(form);
    if (issues.length > 0) {
      setValidationErrors(issues.map((issue) => t(issue.messageKey as never)));
      return;
    }
    setValidationErrors([]);
    startTransition(async () => {
      const result = await buildPowerOfAttorneyPreviewAction({ language, form });
      if (!result.success) {
        onError(result.error ?? t("previewFailed"));
        return;
      }
      if (!result.data) {
        onError(t("previewFailed"));
        return;
      }
      setPreview(result.data.data);
      setStep("preview");
    });
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateDocumentAction({
        templateId,
        language,
        documentName: documentName || undefined,
        clientId: contextClientId ?? null,
        vehicleId: contextVehicleId ?? null,
        dealId: contextDealId ?? null,
        powerOfAttorney: form,
      });
      if (!result.success) {
        onError(result.error ?? t("generationFailed"));
        return;
      }
      if (result.data?.downloadUrl) {
        window.open(result.data.downloadUrl, "_blank", "noopener,noreferrer");
      }
      onGenerated();
    });
  }

  if (step === "preview" && preview?.power_of_attorney) {
    const poa = preview.power_of_attorney;
    return (
      <div className="space-y-4">
        <SectionCard title={t("confirmGeneration")}>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <PreviewRow label={t("principal")} value={partyDisplayName(form.principal)} />
            <PreviewRow label={t("authorizedPerson")} value={partyDisplayName(form.authorized_person)} />
            <PreviewRow label={t("vehicleSection")} value={poa.vehicle.full_name || `${poa.vehicle.make} ${poa.vehicle.model}`.trim()} />
            <PreviewRow label={t("signingDate")} value={poa.signing.date} />
            <PreviewRow label={t("authorizationScope")} value={poa.authorization.scope_text} />
          </dl>
        </SectionCard>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setStep("form")}>
            {t("backToForm")}
          </Button>
          <Button onClick={handleGenerate} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("confirmAndGenerate")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <Badge variant="outline" className="border-amber-500/40 text-amber-200">
          {t("documentOnlyValues")}
        </Badge>
        <p className="text-xs text-amber-100/90">{t("documentOnlyValuesHelp")}</p>
      </div>

      {validationErrors.length > 0 ? (
        <ul className="space-y-1 text-sm text-red-300">
          {validationErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      <SectionCard title={`A. ${t("principal")}`}>
        <PartyFields
          prefix="principal"
          party={form.principal}
          onChange={(principal) => setForm((prev) => ({ ...prev, principal }))}
          showPrincipalExtras
          t={t}
        />
        <AutofillRow
          disabled={isAutofillPending}
          onClient={() => runAutofill("principal", "client")}
          onManual={() =>
            setForm((prev) => ({ ...prev, principal: emptyPowerOfAttorneyForm().principal }))
          }
          showClient
          t={t}
        />
      </SectionCard>

      <SectionCard title={`B. ${t("authorizedPerson")}`}>
        <PartyFields
          prefix="authorized"
          party={form.authorized_person}
          onChange={(authorized_person) =>
            setForm((prev) => ({ ...prev, authorized_person }))
          }
          showAuthorizedExtras
          t={t}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={isAutofillPending} onClick={() => runAutofill("authorized_person", "remauto_company")}>
            {t("useRemautoData")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isAutofillPending} onClick={() => runAutofill("authorized_person", "employee")}>
            {t("useEmployeeData")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isAutofillPending} onClick={() => runAutofill("authorized_person", "client")}>
            {t("useClientData")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setForm((prev) => ({ ...prev, authorized_person: emptyPowerOfAttorneyForm().authorized_person }))}>
            {t("enterManually")}
          </Button>
        </div>
        <ClientSearch
          label={t("optionalClientAutofill")}
          searchLabel={t("search")}
          query={clientQuery}
          onQueryChange={setClientQuery}
          onSearch={searchClients}
          options={clientOptions}
          selectedId={selectedClientId}
          onSelect={setSelectedClientId}
        />
      </SectionCard>

      <SectionCard title={`C. ${t("vehicleSection")}`}>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={isAutofillPending} onClick={() => runAutofill("vehicle", "vehicle")}>
            {t("selectCrmVehicle")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => {
            setForm((prev) => ({ ...prev, vehicle: emptyPowerOfAttorneyForm().vehicle }));
            setCopiedFromDealSide(null);
          }}>
            {t("enterManually")}
          </Button>
        </div>
        {contextDealId ? (
          <DealVehicleCopyPanel
            options={dealVehicleOptions}
            isLoading={isDealVehiclesLoading}
            selectedSide={selectedDealVehicleSide}
            copiedFromSide={copiedFromDealSide}
            isCopyPending={isAutofillPending}
            onSelectSide={setSelectedDealVehicleSide}
            onCopy={copySelectedDealVehicle}
            t={t}
          />
        ) : null}
        <VehicleSearch
          label={t("optionalVehicleAutofill")}
          searchLabel={t("search")}
          query={vehicleQuery}
          onQueryChange={setVehicleQuery}
          onSearch={searchVehicles}
          options={vehicleOptions}
          selectedId={selectedVehicleId}
          onSelect={setSelectedVehicleId}
        />
        <VehicleFields vehicle={form.vehicle} onChange={(vehicle) => setForm((prev) => ({ ...prev, vehicle }))} t={t} />
      </SectionCard>

      <SectionCard title={`D. ${t("authorizationScope")}`}>
        <div className="grid gap-2 sm:grid-cols-2">
          {POA_AUTHORIZATION_SCOPES.map((scope) => (
            <label key={scope} className="flex items-start gap-2 text-sm text-zinc-200">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.authorization_scopes.includes(scope)}
                onChange={() => toggleScope(scope)}
              />
              <span>{t(getScopeLabelKey(scope) as never)}</span>
            </label>
          ))}
        </div>
        <Field
          id="authorization_scope_text"
          label={t("authorizationScopeText")}
          value={form.authorization_scope_text}
          onChange={(value) => setForm((prev) => ({ ...prev, authorization_scope_text: value }))}
        />
        <Field
          id="additional_authorization_text"
          label={t("additionalAuthorization")}
          value={form.additional_authorization_text}
          onChange={(value) =>
            setForm((prev) => ({ ...prev, additional_authorization_text: value }))
          }
        />
      </SectionCard>

      <SectionCard title={`E. ${t("validityAndSigning")}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="signing_place" label={t("placeOfSigning")} value={form.signing_place} onChange={(value) => setForm((prev) => ({ ...prev, signing_place: value }))} />
          <Field id="signing_date" label={t("signingDate")} type="date" value={form.signing_date} onChange={(value) => setForm((prev) => ({ ...prev, signing_date: value }))} />
          <Field id="valid_from" label={t("validFrom")} type="date" value={form.valid_from} onChange={(value) => setForm((prev) => ({ ...prev, valid_from: value }))} />
          <Field id="valid_until" label={t("validUntil")} type="date" value={form.valid_until} onChange={(value) => setForm((prev) => ({ ...prev, valid_until: value }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">{t("validityType")}</Label>
            <Select value={form.validity_type} onValueChange={(value) => setForm((prev) => ({ ...prev, validity_type: value as PowerOfAttorneyFormInput["validity_type"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POA_VALIDITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{t(type === "one_time" ? "oneTime" : type === "until_date" ? "untilDate" : type === "indefinite" ? "indefinite" : "untilRevoked")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">{t("notarizedSignature")}</Label>
            <Select value={form.notarized_signature} onValueChange={(value) => setForm((prev) => ({ ...prev, notarized_signature: value as PowerOfAttorneyFormInput["notarized_signature"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POA_NOTARIZED_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{t(option === "yes" ? "notarizedYes" : option === "no" ? "notarizedNo" : "notarizedUnknown")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Field id="original_count" label={t("numberOfOriginals")} value={form.original_count} onChange={(value) => setForm((prev) => ({ ...prev, original_count: value }))} />
      </SectionCard>

      <SectionCard title={`F. ${t("additionalText")}`}>
        <Textarea rows={3} value={form.additional_notes} onChange={(event) => setForm((prev) => ({ ...prev, additional_notes: event.target.value }))} />
      </SectionCard>

      <Button onClick={openPreview} disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("previewBeforeGenerate")}
      </Button>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-100">{value || "—"}</dd>
    </div>
  );
}

function AutofillRow({
  disabled,
  onClient,
  onManual,
  showClient,
  t,
}: {
  disabled: boolean;
  onClient: () => void;
  onManual: () => void;
  showClient?: boolean;
  t: ReturnType<typeof useTranslations<"documentGenerator.powerOfAttorney">>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {showClient ? (
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onClient}>
          {t("useClientData")}
        </Button>
      ) : null}
      <Button type="button" size="sm" variant="ghost" onClick={onManual}>
        {t("enterManually")}
      </Button>
    </div>
  );
}

function ClientSearch({
  label,
  searchLabel,
  query,
  onQueryChange,
  onSearch,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  searchLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  options: SearchOption[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-zinc-800/80 p-2">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <div className="flex gap-2">
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} />
        <Button type="button" size="sm" variant="outline" onClick={onSearch}>
          {searchLabel}
        </Button>
      </div>
      {options.length > 0 ? (
        <Select value={selectedId ? String(selectedId) : ""} onValueChange={(value) => onSelect(Number(value))}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={String(option.id)}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

function VehicleSearch(props: {
  label: string;
  searchLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  options: SearchOption[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  return <ClientSearch {...props} />;
}

function DealVehicleCopyPanel({
  options,
  isLoading,
  selectedSide,
  copiedFromSide,
  isCopyPending,
  onSelectSide,
  onCopy,
  t,
}: {
  options: PoaDealVehicleOption[];
  isLoading: boolean;
  selectedSide: PoaDealVehicleSide | null;
  copiedFromSide: PoaDealVehicleSide | null;
  isCopyPending: boolean;
  onSelectSide: (side: PoaDealVehicleSide) => void;
  onCopy: () => void;
  t: ReturnType<typeof useTranslations<"documentGenerator.powerOfAttorney">>;
}) {
  const availableOptions = options.filter((option) => option.available);

  if (isLoading) {
    return <p className="text-xs text-zinc-500">{t("loadingDealVehicles")}</p>;
  }

  if (availableOptions.length === 0) {
    return <p className="text-xs text-zinc-500">{t("noDealVehicles")}</p>;
  }

  function sideTitle(side: PoaDealVehicleSide) {
    return side === "a" ? t("dealVehicleA") : t("dealVehicleB");
  }

  function copiedLabel(side: PoaDealVehicleSide) {
    return side === "a" ? t("prefilledFromDealVehicleA") : t("prefilledFromDealVehicleB");
  }

  return (
    <div className="space-y-3 rounded-md border border-zinc-800/80 p-3">
      <p className="text-xs font-medium text-zinc-300">{t("dealVehicleSource")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.side}
            className={cn(
              "cursor-pointer space-y-2 rounded-md border p-3 text-sm transition-colors",
              !option.available && "cursor-not-allowed opacity-50",
              selectedSide === option.side
                ? "border-sky-500/60 bg-sky-500/10"
                : "border-zinc-800 hover:border-zinc-700"
            )}
          >
            <div className="flex items-start gap-2">
              <input
                type="radio"
                name="deal_vehicle_side"
                className="mt-1"
                disabled={!option.available}
                checked={selectedSide === option.side}
                onChange={() => option.available && onSelectSide(option.side)}
              />
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-white">{sideTitle(option.side)}</p>
                {option.source === "external" ? (
                  <Badge variant="outline" className="text-[10px]">
                    {t("externalVehicle")}
                  </Badge>
                ) : null}
                <p className="text-xs text-zinc-400">
                  {[option.make, option.model].filter(Boolean).join(" ") || "—"}
                </p>
                <p className="text-xs text-zinc-500">
                  {t("vin")}: {option.vin || "—"}
                </p>
                <p className="text-xs text-zinc-500">
                  {t("registrationPlate")}: {option.registration_plate || "—"}
                </p>
              </div>
            </div>
          </label>
        ))}
      </div>
      {copiedFromSide ? (
        <p className="text-xs text-sky-300/90">{copiedLabel(copiedFromSide)}</p>
      ) : selectedSide && availableOptions.length === 1 ? (
        <p className="text-xs text-zinc-500">
          {selectedSide === "a" ? t("dealVehicleAPreselected") : t("dealVehicleBPreselected")}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!selectedSide || isCopyPending}
        onClick={onCopy}
      >
        {isCopyPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {t("copySelectedDealVehicle")}
      </Button>
    </div>
  );
}

function VehicleFields({
  vehicle,
  onChange,
  t,
}: {
  vehicle: PowerOfAttorneyVehicleInput;
  onChange: (vehicle: PowerOfAttorneyVehicleInput) => void;
  t: ReturnType<typeof useTranslations<"documentGenerator.powerOfAttorney">>;
}) {
  function setField<K extends keyof PowerOfAttorneyVehicleInput>(key: K, value: PowerOfAttorneyVehicleInput[K]) {
    onChange({ ...vehicle, [key]: value });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id="vehicle_make" label={t("make")} value={vehicle.make} onChange={(v) => setField("make", v)} />
      <Field id="vehicle_model" label={t("model")} value={vehicle.model} onChange={(v) => setField("model", v)} />
      <Field id="vehicle_vin" label={t("vin")} value={vehicle.vin} onChange={(v) => setField("vin", v)} />
      <Field id="vehicle_plate" label={t("registrationPlate")} value={vehicle.registration_plate} onChange={(v) => setField("registration_plate", v)} />
      <Field id="vehicle_first_reg" label={t("firstRegistrationDate")} type="date" value={vehicle.first_registration_date} onChange={(v) => setField("first_registration_date", v)} />
      <Field id="vehicle_tech_cert" label={t("technicalCertificateNumber")} value={vehicle.technical_certificate_number} onChange={(v) => setField("technical_certificate_number", v)} />
      <Field id="vehicle_color" label={t("color")} value={vehicle.color} onChange={(v) => setField("color", v)} />
      <Field id="vehicle_mileage" label={t("mileage")} value={vehicle.mileage} onChange={(v) => setField("mileage", v)} />
      <Field id="vehicle_fuel" label={t("fuelType")} value={vehicle.fuel_type} onChange={(v) => setField("fuel_type", v)} />
      <Field id="vehicle_engine" label={t("engineCapacity")} value={vehicle.engine_capacity} onChange={(v) => setField("engine_capacity", v)} />
      <Field id="vehicle_power" label={t("powerKw")} value={vehicle.power_kw} onChange={(v) => setField("power_kw", v)} />
      <Field id="vehicle_owner_name" label={t("registeredOwnerName")} value={vehicle.registered_owner_name} onChange={(v) => setField("registered_owner_name", v)} />
      <Field id="vehicle_owner_address" label={t("registeredOwnerAddress")} value={vehicle.registered_owner_address} onChange={(v) => setField("registered_owner_address", v)} />
      <Field id="vehicle_owner_id" label={t("registeredOwnerIdentification")} value={vehicle.registered_owner_identification} onChange={(v) => setField("registered_owner_identification", v)} />
      <Field id="vehicle_reg_country" label={t("registrationCountry")} value={vehicle.registration_country} onChange={(v) => setField("registration_country", v)} />
    </div>
  );
}
