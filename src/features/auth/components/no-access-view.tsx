import { ShieldQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Shown to a verified Telegram user who has not been granted a role yet.
 *
 * This state exists because access is invite-only by design: a gift ledger
 * lists real people beside cash and gold amounts, so nobody is a Viewer until
 * a Super Admin says so. Without this, such a user would see a working app
 * where every list happens to be empty — and would reasonably conclude the
 * app was broken rather than that they were not invited.
 */
export async function NoAccessView() {
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
        <ShieldQuestion className="size-6" />
      </span>
      <div className="space-y-1.5">
        <p className="text-foreground text-lg font-semibold">{t("noAccessTitle")}</p>
        <p className="text-muted-foreground max-w-sm text-sm">{t("noAccessBody")}</p>
      </div>
    </div>
  );
}
