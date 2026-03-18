import {
  ArrowDownIcon,
  ArrowUpIcon,
  BarChart3Icon,
  HashIcon,
  type LucideIcon,
  MessageSquareIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
// Shared Components
// ---------------------------------------------------------------------------

interface EmptyCardProps {
  icon: LucideIcon;
  message: string;
  minHeight?: string;
}

function EmptyCard({ icon: Icon, message, minHeight = "min-h-[140px]" }: EmptyCardProps) {
  return (
    <Card
      className={cn(
        "p-6 flex flex-col items-center justify-center text-center border-dashed",
        minHeight,
      )}
    >
      <Icon className="h-6 w-6 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  subtitle: string;
  value: string | number;
  unit: string;
  footnote?: React.ReactNode;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}

function MetricCard({
  title,
  subtitle,
  value,
  unit,
  footnote,
  icon: Icon,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
}: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      {footnote && <p className="text-xs text-muted-foreground mt-2">{footnote}</p>}
    </Card>
  );
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
    return <EmptyCard icon={BarChart3Icon} message="No data yet" />;
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
    <MetricCard
      title="Peak Daily Messages"
      subtitle={formatDate(peak.date)}
      value={peak.count}
      unit="messages"
      footnote={
        <>
          Average: {average.toLocaleString()}/day
          <span className="ml-2 text-rose-500">(+{aboveAverage}% above avg)</span>
        </>
      }
      icon={TrendingUpIcon}
    />
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
    return <EmptyCard icon={HashIcon} message="No data yet" />;
  }

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
    <MetricCard
      title="Token Trend"
      subtitle="Recent vs earlier period"
      value={recentAvg}
      unit="tokens/day"
      footnote={
        <>
          Was {earlierAvg.toLocaleString()}/day
          <span className={cn("ml-2", isUp ? "text-green-500" : "text-rose-500")}>
            ({isUp ? "+" : ""}
            {change}%)
          </span>
        </>
      }
      icon={isUp ? ArrowUpIcon : ArrowDownIcon}
      iconBg={isUp ? "bg-green-500/10" : "bg-rose-500/10"}
      iconColor={isUp ? "text-green-500" : "text-rose-500"}
    />
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
    <MetricCard
      title="Active Projects"
      subtitle="API keys with activity"
      value={activeApiKeys}
      unit={activeApiKeys === 1 ? "project" : "projects"}
      footnote={`${totalMessages.toLocaleString()} total messages`}
      icon={HashIcon}
    />
  );
}
