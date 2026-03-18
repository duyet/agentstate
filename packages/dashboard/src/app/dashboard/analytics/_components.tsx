import {
  ArrowDownIcon,
  ArrowUpIcon,
  BarChart3Icon,
  HashIcon,
  MessageSquareIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationData {
  id: string;
  title: string | null;
  message_count: number;
  token_count: number;
  updated_at: number;
}

interface TokenDataPoint {
  date: string;
  total: number;
}

// ---------------------------------------------------------------------------
// Top Conversations
// ---------------------------------------------------------------------------

interface TopConversationsProps {
  conversations: ConversationData[];
  limit?: number;
}

export function TopConversations({ conversations, limit = 5 }: TopConversationsProps) {
  const sorted = [...conversations]
    .sort((a, b) => b.message_count - a.message_count)
    .slice(0, limit);

  if (sorted.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center text-center border-dashed h-full min-h-[200px]">
        <MessageSquareIcon className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Top Conversations</h3>
        <p className="text-xs text-muted-foreground mt-1">By message count</p>
      </div>
      <div className="p-4 space-y-3">
        {sorted.map((conv, index) => (
          <div key={conv.id} className="flex items-center gap-3">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-muted text-xs font-medium">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{conv.title || "Untitled"}</p>
              <p className="text-xs text-muted-foreground">{conv.message_count} messages</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Peak Usage
// ---------------------------------------------------------------------------

interface PeakUsageProps {
  messagesPerDay: { date: string; count: number }[];
}

export function PeakUsage({ messagesPerDay }: PeakUsageProps) {
  if (messagesPerDay.length === 0) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-center border-dashed min-h-[140px]">
        <BarChart3Icon className="h-6 w-6 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No data yet</p>
      </Card>
    );
  }

  const peak = messagesPerDay.reduce((max, curr) => (curr.count > max.count ? curr : max));
  const total = messagesPerDay.reduce((sum, d) => sum + d.count, 0);
  const average = Math.round(total / messagesPerDay.length);
  const aboveAverage = Math.round(((peak.count - average) / average) * 100);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Peak Daily Messages</h3>
          <p className="text-xs text-muted-foreground mt-1">{formatDate(peak.date)}</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <TrendingUpIcon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">{peak.count.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">messages</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Average: {average.toLocaleString()}/day
        <span className="ml-2 text-rose-500">(+{aboveAverage}% above avg)</span>
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Token Trend Summary
// ---------------------------------------------------------------------------

interface TokenTrendSummaryProps {
  tokensPerDay: TokenDataPoint[];
}

export function TokenTrendSummary({ tokensPerDay }: TokenTrendSummaryProps) {
  if (tokensPerDay.length === 0) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-center border-dashed min-h-[140px]">
        <HashIcon className="h-6 w-6 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No data yet</p>
      </Card>
    );
  }

  // Compare recent half vs earlier half
  const midPoint = Math.floor(tokensPerDay.length / 2);
  const recent = tokensPerDay.slice(midPoint);
  const earlier = tokensPerDay.slice(0, midPoint);

  const recentTotal = recent.reduce((sum, d) => sum + d.total, 0);
  const earlierTotal = earlier.reduce((sum, d) => sum + d.total, 0);
  const recentAvg = Math.round(recentTotal / recent.length);
  const earlierAvg = Math.round(earlierTotal / earlier.length);

  const change = earlierAvg > 0 ? Math.round(((recentAvg - earlierAvg) / earlierAvg) * 100) : 0;
  const isUp = change >= 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Token Trend</h3>
          <p className="text-xs text-muted-foreground mt-1">Recent vs earlier period</p>
        </div>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            isUp ? "bg-green-500/10" : "bg-rose-500/10"
          }`}
        >
          {isUp ? (
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownIcon className="h-4 w-4 text-rose-500" />
          )}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">{recentAvg.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">tokens/day</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Was {earlierAvg.toLocaleString()}/day
        <span className={`ml-2 ${isUp ? "text-green-500" : "text-rose-500"}`}>
          ({isUp ? "+" : ""}
          {change}%)
        </span>
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Active Projects Summary
// ---------------------------------------------------------------------------

interface ActiveProjectsSummaryProps {
  activeApiKeys: number;
  totalMessages: number;
}

export function ActiveProjectsSummary({
  activeApiKeys,
  totalMessages,
}: ActiveProjectsSummaryProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Active Projects</h3>
          <p className="text-xs text-muted-foreground mt-1">API keys with activity</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <HashIcon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">{activeApiKeys}</span>
        <span className="text-sm text-muted-foreground">
          {activeApiKeys === 1 ? "project" : "projects"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {totalMessages.toLocaleString()} total messages
      </p>
    </Card>
  );
}
