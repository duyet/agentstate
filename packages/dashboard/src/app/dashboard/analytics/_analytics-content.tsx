"use client";

import type { AnalyticsResponse } from "@agentstate/shared";
import { AreaChartCard } from "@/components/analytics/area-chart";
import { RecentActivity } from "@/components/analytics/recent-activity";
import { SummaryCards } from "@/components/analytics/summary-cards";
import { formatCostMicrodollars } from "@/lib/format-cost";
import {
  ActiveProjectsSummary,
  PeakUsage,
  TokenTrendSummary,
  TopConversations,
} from "./_components";

interface AnalyticsContentProps {
  data: AnalyticsResponse;
}

export function AnalyticsContent({ data }: AnalyticsContentProps) {
  const hasCost = data.cost_per_day && data.cost_per_day.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <SummaryCards
        totalConversations={data.summary.total_conversations}
        totalMessages={data.summary.total_messages}
        totalTokens={data.summary.total_tokens}
        totalCostMicrodollars={data.summary.total_cost_microdollars}
        activeApiKeys={data.summary.active_api_keys}
      />

      {/* Primary charts: conversations + messages side by side. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AreaChartCard
          title="Conversations"
          data={data.conversations_per_day.map((d) => ({ date: d.date, value: d.count }))}
          color="var(--chart-1)"
          valueLabel="Conversations"
        />
        <AreaChartCard
          title="Messages"
          data={data.messages_per_day.map((d) => ({ date: d.date, value: d.count }))}
          color="var(--chart-2)"
          valueLabel="Messages"
        />
      </div>

      {/* Token usage spans full width with time-range filter. */}
      <AreaChartCard
        title="Token usage"
        data={data.tokens_per_day.map((d) => ({ date: d.date, value: d.total }))}
        color="var(--chart-3)"
        valueLabel="Tokens"
        showTimeRange
      />

      {hasCost && (
        <AreaChartCard
          title="Cost"
          data={data.cost_per_day.map((d) => ({
            date: d.date,
            value: d.total_cost_microdollars / 1_000_000,
          }))}
          color="var(--chart-4)"
          valueLabel="Cost ($)"
          formatValue={(v) => formatCostMicrodollars(v * 1_000_000)}
          showTimeRange
        />
      )}

      {/* Derived insights from the same live data. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PeakUsage messagesPerDay={data.messages_per_day} />
        <TokenTrendSummary tokensPerDay={data.tokens_per_day} />
        <ActiveProjectsSummary
          activeApiKeys={data.summary.active_api_keys}
          totalMessages={data.summary.total_messages}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-base text-foreground">Recent activity</h3>
          <RecentActivity conversations={data.recent_conversations} />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-base text-foreground">Top conversations</h3>
          <TopConversations conversations={data.recent_conversations} />
        </div>
      </div>
    </div>
  );
}
