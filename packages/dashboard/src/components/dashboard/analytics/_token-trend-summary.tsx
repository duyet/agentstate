import { ArrowDownIcon, ArrowUpIcon, HashIcon } from "@phosphor-icons/react";

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
          <span className={`ml-2 ${isUp ? "text-pos" : "text-neg"}`}>
            ({isUp ? "+" : ""}
            {change}%)
          </span>
        </>
      }
      icon={isUp ? ArrowUpIcon : ArrowDownIcon}
      iconBg={isUp ? "bg-pos/10" : "bg-neg/10"}
      iconColor={isUp ? "text-pos" : "text-neg"}
    />
  );
}
