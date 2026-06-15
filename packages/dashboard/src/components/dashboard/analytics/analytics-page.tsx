import { DashboardShell } from "@/components/dashboard-shell";
import { AnalyticsPageContent } from "./analytics-page-content";

/**
 * Astro client:only island for /dashboard/analytics.
 *
 * Wraps the ported Next.js page body in <DashboardShell> (Clerk Providers +
 * auth gate + sidebar/header). The page uses local state only — no
 * useSearchParams — so no <Suspense> boundary is required.
 */
export function AnalyticsPage() {
  return (
    <DashboardShell>
      <AnalyticsPageContent />
    </DashboardShell>
  );
}
