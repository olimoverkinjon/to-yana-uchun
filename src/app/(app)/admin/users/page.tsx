import { Input } from "@/components/ui/input";
import { listAdminUsers, listRoles } from "@/features/admin";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminUsersTable } from "@/features/admin/components/admin-users-table";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

const ALL = "__all__";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const t = await getTranslations("adminUsers");
  const query = {
    search: params.search,
    role: params.role === ALL ? undefined : params.role,
    status: params.status === ALL ? undefined : (params.status as "active" | "disabled" | undefined),
    language: params.language === ALL ? undefined : params.language,
    sort: params.sort,
    direction: params.direction as "asc" | "desc" | undefined,
    page: params.page ? Number(params.page) : 1,
  };
  const supabase = createSupabaseServerClient();
  const [users, roles] = await Promise.all([listAdminUsers(supabase, query), listRoles(supabase)]);

  return (
    <div className="space-y-5">
      <AdminPageHeader title={t("title")} description={t("description")} />
      <form className="glass-panel grid gap-2 rounded-xl p-3 sm:grid-cols-6" action="/admin/users">
        <Input name="search" placeholder={t("searchPlaceholder")} defaultValue={params.search ?? ""} />
        <select
          name="role"
          defaultValue={params.role ?? ALL}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value={ALL}>{t("allRoles")}</option>
          {roles.map((role) => (
            <option key={role.id} value={role.name}>
              {role.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ALL}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value={ALL}>{t("allStatuses")}</option>
          <option value="active">{t("active")}</option>
          <option value="disabled">{t("disabled")}</option>
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "created_at"}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value="created_at">{t("created")}</option>
          <option value="last_seen_at">{t("lastLogin")}</option>
          <option value="first_name">{t("name")}</option>
          <option value="telegram_id">Telegram ID</option>
        </select>
        <select
          name="direction"
          defaultValue={params.direction ?? "desc"}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value="desc">{t("desc")}</option>
          <option value="asc">{t("asc")}</option>
        </select>
        <button className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium">
          {t("apply")}
        </button>
      </form>
      <AdminUsersTable users={users} roles={roles} query={params} />
    </div>
  );
}
