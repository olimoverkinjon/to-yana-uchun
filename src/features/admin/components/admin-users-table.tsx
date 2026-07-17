"use client";

import { useState } from "react";

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
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});

  const columns: AdminColumn<AdminUser>[] = [
    {
      id: "profile",
      label: "User",
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
      label: "Role",
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
                <SelectValue placeholder="No role" />
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
              label="Apply"
              title="Change this user's role?"
              description="Role changes affect what this person can see or edit immediately."
              action={(reason) => setUserRoleAction({ userId: user.id, roleId: value, reason })}
              success="Role updated"
            />
          </div>
        );
      },
    },
    { id: "language", label: "Language", render: (user) => user.language_code ?? "-" },
    {
      id: "status",
      label: "Status",
      render: (user) => (
        <Badge variant={user.deleted_at ? "destructive" : "secondary"}>{user.deleted_at ? "Disabled" : "Active"}</Badge>
      ),
    },
    { id: "created", label: "Created", render: (user) => new Date(user.created_at).toLocaleDateString() },
    {
      id: "lastLogin",
      label: "Last login",
      render: (user) => (user.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString() : "-"),
    },
    {
      id: "actions",
      label: "",
      render: (user) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/admin/users/${user.id}`} />}>
            View
          </Button>
          <AdminActionButton
            label={user.deleted_at ? "Restore" : "Delete"}
            title={user.deleted_at ? "Restore this user?" : "Delete this user?"}
            description={
              user.deleted_at
                ? "The user will regain access according to their active role."
                : "This is a soft delete. The user is disabled and can be restored."
            }
            variant={user.deleted_at ? "default" : "destructive"}
            action={(reason) => setUserDisabledAction({ userId: user.id, disabled: !user.deleted_at, reason })}
            success={user.deleted_at ? "User restored" : "User deleted"}
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
      empty={<EmptyState icon={Users} title="No users found" body="Try changing the search, role or status filters." />}
    />
  );
}
