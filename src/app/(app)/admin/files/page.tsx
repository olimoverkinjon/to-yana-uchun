import { Input } from "@/components/ui/input";
import { listAttachments } from "@/features/admin";
import { AdminFilesTable } from "@/features/admin/components/admin-files-table";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALL = "__all__";

export const dynamic = "force-dynamic";

export default async function AdminFilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const files = await listAttachments(createSupabaseServerClient(), {
    search: params.search,
    status: params.status === ALL ? undefined : (params.status as "active" | "disabled" | undefined),
    sort: params.sort,
    direction: params.direction as "asc" | "desc" | undefined,
    page: params.page ? Number(params.page) : 1,
  });

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Files"
        description="Preview, delete and restore cover images, avatars, attachments and future gallery files."
      />
      <form className="glass-panel grid gap-2 rounded-xl p-3 sm:grid-cols-5" action="/admin/files">
        <Input name="search" placeholder="Search files" defaultValue={params.search ?? ""} />
        <select
          name="status"
          defaultValue={params.status ?? ALL}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value={ALL}>All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Deleted</option>
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "created_at"}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value="created_at">Created</option>
          <option value="file_name">Name</option>
          <option value="file_size">Size</option>
          <option value="deleted_at">Deleted</option>
        </select>
        <select
          name="direction"
          defaultValue={params.direction ?? "desc"}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <button className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium">Apply</button>
      </form>
      <AdminFilesTable files={files} query={params} />
    </div>
  );
}
