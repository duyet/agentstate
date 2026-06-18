import { type TimeRange, TimeRangeSelect } from "@/components/analytics/time-range-select";
import { PageHeader } from "@/components/dashboard/page-header";

interface AnalyticsHeaderProps {
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

export function AnalyticsHeader({ range, onRangeChange }: AnalyticsHeaderProps) {
  return (
    <PageHeader
      title="Analytics"
      description="Usage metrics and activity for your project."
      actions={<TimeRangeSelect value={range} onChange={onRangeChange} />}
    />
  );
}
