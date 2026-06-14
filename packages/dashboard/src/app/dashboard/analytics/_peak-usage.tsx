import { BarChart3Icon, TrendingUpIcon } from "lucide-react";

import { EmptyCard } from "./_empty-card";
import { MetricCard } from "./_metric-card";

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
