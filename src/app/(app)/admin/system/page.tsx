import { getAdminHomeStats } from "@/features/admin";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const stats = await getAdminHomeStats(createSupabaseServerClient());
  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="System"
        description="Operational status for database, realtime, storage, authentication and API."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(stats.system).map(([key, value]) => (
          <div key={key} className="glass-panel rounded-xl p-5">
            <p className="text-muted-foreground text-sm capitalize">{key}</p>
            <p className="text-foreground mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
