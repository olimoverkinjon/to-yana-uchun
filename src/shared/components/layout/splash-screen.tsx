"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

/**
 * First-paint branded experience shown while the Telegram SDK mounts and
 * the auth session resolves (typically well under a second). Distinct
 * from LoadingScreen, which is the generic per-route Suspense fallback.
 */
export function SplashScreen() {
  const t = useTranslations();

  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <div className="bg-primary text-primary-foreground shadow-primary/20 flex size-16 items-center justify-center rounded-2xl text-2xl font-semibold shadow-lg">
          WR
        </div>
        <div className="space-y-1.5">
          <p className="text-foreground text-lg font-semibold tracking-tight">{t("common.appName")}</p>
          <p className="text-muted-foreground text-sm">{t("splash.tagline")}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="text-muted-foreground flex items-center gap-2 text-xs"
      >
        <span className="bg-primary size-1.5 animate-pulse rounded-full" aria-hidden />
        {t("common.loading")}
      </motion.div>
    </div>
  );
}
