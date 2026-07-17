"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setUserDisabledAction, setUserRoleAction } from "@/features/admin/api/admin-actions";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { initialsOf } from "@/shared/lib/format";
import { Users } from "lucide-react";
import Link from "next/link";

import type { AdminList, AdminUser, RoleRow } from "../types";
import { AdminActionButton } from "./admin-action-button";
import { AdminTable, type AdminColumn } from "./admin-table";

export function AdminUsersTable({
  users,
  roles,
  query,
}: {
  users: AdminList<AdminUser>;
  roles: RoleRow[];
  query: Record<string, string | number | undefined>;
}) {
  const t = useTranslations("adminUsers");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});

  const columns: AdminColumn<AdminUser>[] = [
    {
      id: "profile",
      label: t("user"),
      render: (user) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarImage src={user.photo_url ?? undefined} alt={user.first_name} />
            <AvatarFallback className="text-[10px]">
              {initialsOf(`${user.first_name} ${user.last_name ?? ""}`)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-medium">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-muted-foreground truncate text-xs">@{user.username ?? "unknown"}</p>
          </div>
        </div>
      ),
    },
    {
      id: "telegram",
      label: "Telegram ID",
      render: (user) => <span className="tabular-nums">{user.telegram_id}</span>,
    },
    {
      id: "role",
      label: t("role"),
      render: (user) => {
        const active = user.roles[0];
        const value = roleDrafts[user.id] ?? active?.id ?? "";
        return (
          <div className="flex items-center gap-2">
            <Select
              value={value}
              onValueChange={(next) => setRoleDrafts((draft) => ({ ...draft, [user.id]: next ?? "" }))}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue placeholder={t("noRole")} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AdminActionButton
              label={t("apply")}
              title={t("changeRoleTitle")}
              description={t("changeRoleDescription")}
              action={(reason) => setUserRoleAction({ userId: user.id, roleId: value, reason })}
              success={t("roleUpdated")}
            />
          </div>
        );
      },
    },
    { id: "language", label: t("language"), render: (user) => user.language_code ?? "-" },
    {
      id: "status",
      label: t("status"),
      render: (user) => (
        <Badge variant={user.deleted_at ? "destructive" : "secondary"}>
          {user.deleted_at ? t("disabled") : t("active")}
        </Badge>
      ),
    },
    { id: "created", label: t("created"), render: (user) => new Date(user.created_at).toLocaleDateString() },
    {
      id: "lastLogin",
      label: t("lastLogin"),
      render: (user) => (user.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString() : "-"),
    },
    {
      id: "actions",
      label: "",
      render: (user) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/admin/users/${user.id}`} />}>
            {t("view")}
          </Button>
          <AdminActionButton
            label={user.deleted_at ? t("restore") : t("delete")}
            title={user.deleted_at ? t("restoreTitle") : t("deleteTitle")}
            description={user.deleted_at ? t("restoreDescription") : t("deleteDescription")}
            variant={user.deleted_at ? "default" : "destructive"}
            action={(reason) => setUserDisabledAction({ userId: user.id, disabled: !user.deleted_at, reason })}
            success={user.deleted_at ? t("userRestored") : t("userDeleted")}
            undo={
              user.deleted_at
                ? () => setUserDisabledAction({ userId: user.id, disabled: true, reason: "Undo restore" })
                : () => setUserDisabledAction({ userId: user.id, disabled: false, reason: "Undo delete" })
            }
          />
        </div>
      ),
    },
  ];

  return (
    <AdminTable
      rows={users.items}
      columns={columns}
      totalCount={users.totalCount}
      page={users.page}
      pageSize={users.pageSize}
      basePath="/admin/users"
      query={query}
      empty={<EmptyState icon={Users} title={t("empty")} body={t("emptyBody")} />}
    />
  );
}
