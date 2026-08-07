"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Mail,
  MoreHorizontal,
  Pencil,
  Search,
  Shield,
  UserPlus,
} from "lucide-react";
import {
  inviteManagedUserAction,
  resendManagedUserInvitationAction,
  updateUserActiveAction,
  updateUserProfileAction,
  updateUserRoleAction,
} from "@/lib/actions/users";
import type { AppRole } from "@/lib/auth/roles";
import type { ManagedUserRow } from "@/lib/auth/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useFormatters } from "@/lib/hooks/use-formatters";
import { normalizeActionError } from "@/lib/utils/action-error-message";
import { cn } from "@/lib/utils";

type UsersManagerProps = {
  users: ManagedUserRow[];
  assignableRoles: AppRole[];
  canManageRoles: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDeactivate: boolean;
  hasServiceRole: boolean;
  currentUserId: string;
};

const ROLE_BADGE_CLASSES: Record<AppRole, string> = {
  owner: "bg-amber-500/15 text-amber-200 border-amber-500/20",
  admin: "bg-blue-500/15 text-blue-200 border-blue-500/20",
  detailing: "bg-violet-500/15 text-violet-200 border-violet-500/20",
  documents: "bg-cyan-500/15 text-cyan-200 border-cyan-500/20",
  accountant: "bg-emerald-500/15 text-emerald-200 border-emerald-500/20",
  lawyer: "bg-indigo-500/15 text-indigo-200 border-indigo-500/20",
  inactive: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

function ServiceRoleWarning({ className }: { className?: string }) {
  const t = useTranslations("access");

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100",
        className
      )}
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium text-amber-200">{t("serviceRoleWarningTitle")}</p>
        <p className="text-amber-100/90">{t("serviceRoleWarningDescription")}</p>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  const tRoles = useTranslations("roles");

  return (
    <Badge variant="outline" className={cn("border font-normal", ROLE_BADGE_CLASSES[role])}>
      {tRoles(role)}
    </Badge>
  );
}

export function UsersManager({
  users,
  assignableRoles,
  canManageRoles,
  canCreate,
  canUpdate,
  canDeactivate,
  hasServiceRole,
  currentUserId,
}: UsersManagerProps) {
  const t = useTranslations("access");
  const tRoles = useTranslations("roles");
  const tFields = useTranslations("fields");
  const tActions = useTranslations("actions");
  const tCommon = useTranslations("common");
  const { formatDate, formatDateTime } = useFormatters();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );
  const [addOpen, setAddOpen] = useState(false);
  const [addDialogMessage, setAddDialogMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [editUser, setEditUser] = useState<ManagedUserRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ManagedUserRow | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("detailing");

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("detailing");

  const roleOptions = useMemo(
    () => assignableRoles.filter((role) => role !== "owner"),
    [assignableRoles]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      const haystack = [user.full_name, user.email, user.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, users]);

  const inviteSubmitDisabledReason = useMemo(() => {
    if (!hasServiceRole) return t("inviteRequiresServiceRole");
    if (!inviteEmail.trim()) return t("inviteEmailRequired");
    if (roleOptions.length === 0) return t("invalidRole");
    if (isPending) return t("inviteSending");
    return null;
  }, [hasServiceRole, inviteEmail, isPending, roleOptions.length, t]);

  const emptyMessage =
    users.length === 0 ? t("noEmployeesEmpty") : t("noEmployeesFound");

  function showPageMessage(next: { type: "error" | "success"; text: string } | null) {
    setMessage(next);
  }

  function showAddDialogMessage(next: { type: "error" | "success"; text: string } | null) {
    setAddDialogMessage(next);
  }

  function runAction(
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage?: string
  ) {
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? t("permissionDenied") });
        return;
      }
      if (successMessage) {
        setMessage({ type: "success", text: successMessage });
      }
      router.refresh();
    });
  }

  function openEditDialog(user: ManagedUserRow) {
    setEditUser(user);
    setEditName(user.full_name ?? "");
    setEditPhone(user.phone ?? "");
    setEditRole(user.role);
    setMessage(null);
  }

  function closeAddDialog() {
    setAddOpen(false);
    setAddDialogMessage(null);
    setInviteEmail("");
    setInviteName("");
    setInvitePhone("");
    setInviteRole("detailing");
  }

  function handleInviteSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (inviteSubmitDisabledReason) {
      showAddDialogMessage({ type: "error", text: inviteSubmitDisabledReason });
      return;
    }

    startTransition(async () => {
      showPageMessage(null);
      showAddDialogMessage(null);

      try {
        const result = await inviteManagedUserAction({
          email: inviteEmail.trim(),
          fullName: inviteName.trim(),
          phone: invitePhone.trim() || null,
          role: inviteRole,
        });

        if (!result || typeof result !== "object" || !("success" in result)) {
          showAddDialogMessage({
            type: "error",
            text: normalizeActionError(result, t("inviteFailed")),
          });
          return;
        }

        if (!result.success) {
          showAddDialogMessage({
            type: "error",
            text: normalizeActionError(result.error, t("inviteFailed")),
          });
          return;
        }

        showPageMessage({ type: "success", text: t("inviteSentSuccess") });
        closeAddDialog();
        router.refresh();
      } catch (error) {
        showAddDialogMessage({
          type: "error",
          text: normalizeActionError(error, t("inviteFailed")),
        });
      }
    });
  }

  function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editUser) return;

    startTransition(async () => {
      setMessage(null);
      const profileResult = await updateUserProfileAction({
        userId: editUser.id,
        fullName: editName,
        ...(hasServiceRole ? { phone: editPhone } : {}),
      });
      if (!profileResult.success) {
        setMessage({ type: "error", text: profileResult.error ?? t("permissionDenied") });
        return;
      }

      if (canManageRoles && editRole !== editUser.role) {
        const roleResult = await updateUserRoleAction({
          userId: editUser.id,
          role: editRole,
        });
        if (!roleResult.success) {
          setMessage({ type: "error", text: roleResult.error ?? t("permissionDenied") });
          return;
        }
      }

      setMessage({ type: "success", text: t("employeeUpdated") });
      setEditUser(null);
      router.refresh();
    });
  }

  function confirmDeactivate() {
    if (!deactivateTarget) return;
    const target = deactivateTarget;
    setDeactivateTarget(null);
    runAction(() =>
      updateUserActiveAction({
        userId: target.id,
        isActive: false,
      })
    );
  }

  return (
    <div className="space-y-4">
      {!hasServiceRole && canCreate ? <ServiceRoleWarning /> : null}

      {message ? (
        <p
          className={cn(
            "rounded-md px-3 py-2 text-sm",
            message.type === "error"
              ? "border border-red-600/30 bg-red-600/10 text-red-400"
              : "border border-emerald-600/30 bg-emerald-600/10 text-emerald-300"
          )}
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchEmployees")}
            className="h-10 border-zinc-800 bg-zinc-950/70 pl-9"
            aria-label={t("searchEmployees")}
          />
        </div>

        {canCreate ? (
          <Button
            type="button"
            onClick={() => {
              showPageMessage(null);
              showAddDialogMessage(null);
              setAddOpen(true);
            }}
            className="shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            {t("addEmployee")}
          </Button>
        ) : null}
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead>{t("fullName")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead className="hidden md:table-cell">{tFields("phone")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("created")}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t("lastSignIn")}</TableHead>
                  <TableHead className="w-12 text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableCell colSpan={8} className="py-12 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-sm text-zinc-500">
                        <Shield className="h-8 w-8 text-zinc-600" aria-hidden />
                        <p>{emptyMessage}</p>
                        {canCreate && users.length === 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="mt-2"
                            onClick={() => setAddOpen(true)}
                          >
                            <UserPlus className="h-4 w-4" />
                            {t("addEmployee")}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const canEdit =
                      !isSelf && user.role !== "owner" && (canUpdate || canManageRoles);
                    const canToggle = canDeactivate && canEdit;
                    const canResend =
                      hasServiceRole &&
                      canCreate &&
                      canEdit &&
                      !user.last_sign_in_at &&
                      Boolean(user.email);
                    const hasActions = canEdit || canToggle || canResend;

                    return (
                      <TableRow key={user.id} className="border-zinc-800">
                        <TableCell className="max-w-[160px] truncate font-medium text-white">
                          {user.full_name ?? tCommon("dash")}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-zinc-300">
                          {user.email ?? tCommon("dash")}
                        </TableCell>
                        <TableCell className="hidden max-w-[120px] truncate text-zinc-400 md:table-cell">
                          {user.phone ?? tCommon("dash")}
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-transparent font-normal",
                              user.is_active
                                ? "bg-emerald-500/15 text-emerald-200"
                                : "bg-zinc-800 text-zinc-400"
                            )}
                          >
                            {user.is_active ? t("active") : t("inactiveStatus")}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-zinc-400 lg:table-cell">
                          {user.created_at ? formatDate(user.created_at) : tCommon("dash")}
                        </TableCell>
                        <TableCell className="hidden text-zinc-400 xl:table-cell">
                          {user.last_sign_in_at
                            ? formatDateTime(user.last_sign_in_at)
                            : t("neverSignedIn")}
                        </TableCell>
                        <TableCell className="text-right">
                          {hasActions ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-zinc-400 hover:text-white"
                                  disabled={isPending}
                                  aria-label={t("actions")}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {canEdit ? (
                                  <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                    <Pencil className="h-4 w-4" />
                                    {tActions("edit")}
                                  </DropdownMenuItem>
                                ) : null}
                                {canManageRoles && canEdit ? (
                                  <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                    <Shield className="h-4 w-4" />
                                    {t("changeRole")}
                                  </DropdownMenuItem>
                                ) : null}
                                {canResend ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      runAction(
                                        () =>
                                          resendManagedUserInvitationAction({ userId: user.id }),
                                        t("invitationSent")
                                      )
                                    }
                                  >
                                    <Mail className="h-4 w-4" />
                                    {t("resendInvitation")}
                                  </DropdownMenuItem>
                                ) : null}
                                {canToggle ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-400 focus:bg-red-950/40 focus:text-red-300"
                                      onClick={() => {
                                        if (user.is_active) {
                                          setDeactivateTarget(user);
                                          return;
                                        }
                                        runAction(() =>
                                          updateUserActiveAction({
                                            userId: user.id,
                                            isActive: true,
                                          })
                                        );
                                      }}
                                    >
                                      {user.is_active ? t("deactivate") : t("activate")}
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-zinc-600">{tCommon("dash")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={(open) => (open ? setAddOpen(true) : closeAddDialog())}>
        <DialogContent className="max-w-lg border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>{t("addEmployee")}</DialogTitle>
            <DialogDescription>{t("addEmployeeDescription")}</DialogDescription>
          </DialogHeader>

          {!hasServiceRole ? <ServiceRoleWarning /> : null}

          {addDialogMessage ? (
            <p
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                addDialogMessage.type === "error"
                  ? "border border-red-600/30 bg-red-600/10 text-red-400"
                  : "border border-emerald-600/30 bg-emerald-600/10 text-emerald-300"
              )}
              role="alert"
            >
              {addDialogMessage.text}
            </p>
          ) : null}

          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">{t("fullName")}</Label>
              <Input
                id="add-name"
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                disabled={!hasServiceRole || isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">{t("email")}</Label>
              <Input
                id="add-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                disabled={!hasServiceRole || isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">{tFields("phone")}</Label>
              <Input
                id="add-phone"
                type="tel"
                value={invitePhone}
                onChange={(event) => setInvitePhone(event.target.value)}
                disabled={!hasServiceRole || isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("role")}</Label>
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as AppRole)}
                disabled={!hasServiceRole || isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {tRoles(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col items-end gap-2 pt-2 sm:flex-row sm:justify-end">
              {inviteSubmitDisabledReason ? (
                <p className="mr-auto text-xs text-zinc-500 sm:max-w-[55%]">
                  {inviteSubmitDisabledReason}
                </p>
              ) : null}
              <Button type="button" variant="ghost" onClick={closeAddDialog} disabled={isPending}>
                {tActions("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={Boolean(inviteSubmitDisabledReason)}
                title={inviteSubmitDisabledReason ?? undefined}
              >
                {isPending ? t("inviteSending") : t("sendInvitation")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editUser)} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-lg border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>{t("editEmployee")}</DialogTitle>
            <DialogDescription>{editUser?.email ?? tCommon("dash")}</DialogDescription>
          </DialogHeader>

          {!hasServiceRole ? (
            <p className="text-sm text-zinc-500">{t("phoneEditRequiresServiceRole")}</p>
          ) : null}

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("fullName")}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">{tFields("phone")}</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editPhone}
                onChange={(event) => setEditPhone(event.target.value)}
                disabled={!hasServiceRole || isPending}
              />
            </div>
            {canManageRoles && editUser && editUser.role !== "owner" ? (
              <div className="space-y-2">
                <Label>{t("changeRole")}</Label>
                <Select
                  value={editRole}
                  onValueChange={(value) => setEditRole(value as AppRole)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {tRoles(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditUser(null)}
                disabled={isPending}
              >
                {tActions("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {tActions("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent className="border-zinc-800 bg-zinc-950">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deactivateConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget?.full_name
                ? `${deactivateTarget.full_name} — ${t("deactivateConfirmDescription")}`
                : t("deactivateConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{tActions("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={confirmDeactivate}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
