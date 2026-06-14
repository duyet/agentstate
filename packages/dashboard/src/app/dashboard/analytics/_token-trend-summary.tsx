import { ArrowDownIcon, ArrowUpIcon, HashIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyCard } from "./_empty-card";
import { MetricCard } from "./_metric-card";

interface TokenDataPoint {
  date: string;
  total: number;
}

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
