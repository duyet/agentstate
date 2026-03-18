"use client";

import type { AnalyticsResponse, ProjectResponse } from "@agentstate/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AreaChartCard } from "@/components/analytics/area-chart";
import { RecentActivity } from "@/components/analytics/recent-activity";
import { SummaryCards } from "@/components/analytics/summary-cards";
import { type TimeRange, TimeRangeSelect } from "@/components/analytics/time-range-select";
import { ChartCardSkeleton, StatsCardsSkeleton } from "@/components/dashboard/loading-states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import {
  ActiveProjectsSummary,
  PeakUsage,
  TokenTrendSummary,
  TopConversations,
} from "./_components";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [range, setRange] = useState<TimeRange>("30d");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch projects
  useEffect(() => {
    api<{ data: ProjectResponse[] }>("/v1/projects")
      .then((res) => {
        setProjects(res.data);
        if (res.data.length > 0) {
          setSelectedProjectId(res.data[0].id);
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  // Fetch analytics when project or range changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    api<AnalyticsResponse>(`/v1/projects/${selectedProjectId}/analytics?range=${range}`)
      .then(setData)
      .catch((e) => {
        setData(null);
        toast.error(e instanceof Error ? e.message : "Failed to load analytics");
      })
      .finally(() => setLoading(false));
  }, [selectedProjectId, range]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Usage metrics and activity for your project.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {projects.length > 1 && (
            <Select value={selectedProjectId} onValueChange={(v) => setSelectedProjectId(v ?? "")}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <TimeRangeSelect value={range} onChange={setRange} />
        </div>
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="space-y-4">
          <StatsCardsSkeleton count={4} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCardSkeleton height="h-64" />
            <ChartCardSkeleton height="h-64" />
          </div>
          <ChartCardSkeleton height="h-64" />
          <ChartCardSkeleton height="h-48" />
        </div>
      )}

      {/* Content */}
      {data && (
        <div className="space-y-6">
          <SummaryCards
            totalConversations={data.summary.total_conversations}
            totalMessages={data.summary.total_messages}
            totalTokens={data.summary.total_tokens}
            activeApiKeys={data.summary.active_api_keys}
          />

          {/* Quick insights row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PeakUsage messagesPerDay={data.messages_per_day} />
            <TokenTrendSummary tokensPerDay={data.tokens_per_day} />
            <ActiveProjectsSummary
              activeApiKeys={data.summary.active_api_keys}
              totalMessages={data.summary.total_messages}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AreaChartCard
              title="Conversations"
              data={data.conversations_per_day.map((d) => ({ date: d.date, value: d.count }))}
              color="#2563eb"
              valueLabel="Conversations"
            />
            <AreaChartCard
              title="Messages"
              data={data.messages_per_day.map((d) => ({ date: d.date, value: d.count }))}
              color="#16a34a"
              valueLabel="Messages"
            />
          </div>

          <AreaChartCard
            title="Token Usage"
            data={data.tokens_per_day.map((d) => ({ date: d.date, value: d.total }))}
            color="#9333ea"
            valueLabel="Tokens"
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Recent activity</h3>
              <RecentActivity conversations={data.recent_conversations} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Top conversations</h3>
              <TopConversations conversations={data.recent_conversations} />
            </div>
          </div>
        </div>
      )}

      {/* No projects */}
      {!loading && projects.length === 0 && (
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/60 mb-4">
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <title>Chart icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No projects yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mb-4">
            Create a project to start tracking conversations, messages, and token usage.
          </p>
          <Button size="sm" variant="outline" onClick={() => router.push("/dashboard")}>
            Create your first project
          </Button>
        </Card>
      )}
    </div>
  );
}
