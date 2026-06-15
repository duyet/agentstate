import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { AnalyticsPageContent } from "./analytics-page-content";

/**
 * Astro client:only island for /dashboard/analytics.
 *
 * Mounts the analytics body in the new design system shell (Clerk Providers +
 * AppShell auth gate + sidebar/header). The page uses local state only — no
 * useSearchParams — so no <Suspense> boundary is required.
 */
export function AnalyticsPage() {
  return (
    <Providers>
      <AppShell>
        <AnalyticsPageContent />
      </AppShell>
    </Providers>
  );
}
