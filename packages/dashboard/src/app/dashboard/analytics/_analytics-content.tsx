"use client";

import type { AnalyticsResponse } from "@agentstate/shared";
import { AreaChartCard } from "@/components/analytics/area-chart";
import { RecentActivity } from "@/components/analytics/recent-activity";
import { SummaryCards } from "@/components/analytics/summary-cards";
import { ActiveProjectsSummary, PeakUsage, TokenTrendSummary, TopConversations } from "./_components";

interface AnalyticsContentProps {
  data: AnalyticsResponse;
}

export function AnalyticsContent({ data }: AnalyticsContentProps) {
  return (
    <div className="space-y-6 mt-2">
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
  );
}
