import { Input } from "@/components/ui/input";
import { listSettings } from "@/features/admin";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminSettingsTable } from "@/features/admin/components/admin-settings-table";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const settings = await listSettings(createSupabaseServerClient(), {
    search: params.search,
    sort: params.sort,
    direction: params.direction as "asc" | "desc" | undefined,
    page: params.page ? Number(params.page) : 1,
  });

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Settings"
        description="Manage application, localization, theme, realtime, storage and pagination settings."
      />
      <form className="glass-panel grid gap-2 rounded-xl p-3 sm:grid-cols-4" action="/admin/settings">
        <Input name="search" placeholder="Search settings" defaultValue={params.search ?? ""} />
        <select
          name="sort"
          defaultValue={params.sort ?? "key"}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value="key">Key</option>
          <option value="updated_at">Updated</option>
          <option value="created_at">Created</option>
        </select>
        <select
          name="direction"
          defaultValue={params.direction ?? "asc"}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
        <button className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium">Search</button>
      </form>
      <AdminSettingsTable settings={settings} query={params} />
    </div>
  );
}
