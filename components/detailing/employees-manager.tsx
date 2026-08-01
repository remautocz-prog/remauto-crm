"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { DEFAULT_EMPLOYEE_COMMISSION_PERCENT } from "@/lib/constants/detailing";
import { upsertDetailingEmployeeAction } from "@/lib/actions/detailing";
import type {
  DetailingEmployeeMonthStats,
  DetailingEmployeeWithProfile,
} from "@/lib/types/detailing";
import type { Profile } from "@/lib/types/cars";
import {
  getDetailingEmployeeDisplayName,
  getDetailingProfileOptionLabel,
} from "@/lib/detailing/employee-display";
import { DetailingPageHeader } from "@/components/detailing/detailing-page-header";
import { DetailingSection, DetailingTable } from "@/components/detailing/detailing-section";
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
import { useFormatters } from "@/lib/hooks/use-formatters";

type DetailingEmployeesManagerProps = {
  employees: DetailingEmployeeWithProfile[];
  profiles: Profile[];
  monthStats: Record<string, DetailingEmployeeMonthStats>;
};

export function DetailingEmployeesManager({
  employees,
  profiles,
  monthStats,
}: DetailingEmployeesManagerProps) {
  const t = useTranslations("detailing");
  const { formatCurrency } = useFormatters();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [profileId, setProfileId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [commissionPercent, setCommissionPercent] = useState(
    String(DEFAULT_EMPLOYEE_COMMISSION_PERCENT)
  );

  const configuredIds = new Set(employees.map((employee) => employee.profile_id));
  const availableProfiles = profiles.filter((profile) => !configuredIds.has(profile.id));

  function saveEmployee(existingProfileId?: string) {
    const targetProfileId = existingProfileId ?? profileId;
    if (!targetProfileId) return;

    startTransition(async () => {
      const result = await upsertDetailingEmployeeAction({
        profile_id: targetProfileId,
        active: existingProfileId
          ? employees.find((employee) => employee.profile_id === existingProfileId)?.active ?? true
          : true,
        commission_percent: Number(commissionPercent) || DEFAULT_EMPLOYEE_COMMISSION_PERCENT,
        display_name: displayName,
      });
      setMessage(result.success ? t("employeeSaved") : result.error);
      if (result.success && !existingProfileId) {
        setProfileId("");
        setDisplayName("");
        setCommissionPercent(String(DEFAULT_EMPLOYEE_COMMISSION_PERCENT));
      }
    });
  }

  function toggleEmployee(employee: DetailingEmployeeWithProfile) {
    startTransition(async () => {
      const result = await upsertDetailingEmployeeAction({
        profile_id: employee.profile_id,
        active: !employee.active,
        commission_percent: employee.commission_percent,
        display_name: employee.display_name,
      });
      setMessage(result.success ? t("employeeSaved") : result.error);
    });
  }

  function updateCommission(employee: DetailingEmployeeWithProfile, value: string) {
    startTransition(async () => {
      const result = await upsertDetailingEmployeeAction({
        profile_id: employee.profile_id,
        active: employee.active,
        commission_percent: Number(value) || DEFAULT_EMPLOYEE_COMMISSION_PERCENT,
        display_name: employee.display_name,
      });
      setMessage(result.success ? t("employeeSaved") : result.error);
    });
  }

  return (
    <div className="space-y-8">
      <DetailingPageHeader title={t("employeesTitle")} description={t("employeesDescription")} />

      <DetailingSection title={t("addEmployee")}>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label>{t("fields.profile")}</Label>
            <Select value={profileId || "none"} onValueChange={(value) => setProfileId(value === "none" ? "" : value)}>
              <SelectTrigger><SelectValue placeholder={t("selectProfile")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {availableProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {getDetailingProfileOptionLabel(profile)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("fields.displayName")}</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("fields.commissionPercent")}</Label>
            <Input value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => saveEmployee()} disabled={!profileId || isPending} size="lg">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("saveEmployee")}
            </Button>
          </div>
        </div>
      </DetailingSection>

      <DetailingSection title={t("configuredEmployees")} noPadding>
        <DetailingTable
          headers={[
            t("fields.employee"),
            t("fields.status"),
            t("fields.commissionPercent"),
            t("metrics.assignedServices"),
            t("metrics.deliveredOrders"),
            t("metrics.revenue"),
            t("metrics.commissionPayable"),
            "",
          ]}
          isEmpty={!employees.length}
          emptyMessage={t("noEmployees")}
        >
          {employees.map((employee) => {
            const stats = monthStats[employee.profile_id];
            const name = getDetailingEmployeeDisplayName(employee);
            return (
              <tr key={employee.id} className="hover:bg-zinc-900/40">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{name}</p>
                  {employee.display_name && employee.profile?.full_name ? (
                    <p className="text-zinc-500">{employee.profile.full_name}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">{employee.active ? t("active") : t("inactive")}</td>
                <td className="px-4 py-3">
                  <Input
                    className="w-20"
                    defaultValue={String(employee.commission_percent)}
                    onBlur={(e) => updateCommission(employee, e.target.value)}
                  />
                </td>
                <td className="px-4 py-3">{stats?.assignedServices ?? 0}</td>
                <td className="px-4 py-3">{stats?.deliveredOrders ?? 0}</td>
                <td className="px-4 py-3">{formatCurrency(stats?.revenueGenerated ?? 0)}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(stats?.commissionPayable ?? 0)}</td>
                <td className="px-4 py-3">
                  <Button
                    variant={employee.active ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleEmployee(employee)}
                    disabled={isPending}
                  >
                    {employee.active ? t("deactivate") : t("activate")}
                  </Button>
                </td>
              </tr>
            );
          })}
        </DetailingTable>
      </DetailingSection>

      {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
    </div>
  );
}
