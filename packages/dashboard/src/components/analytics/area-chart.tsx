"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DataPoint } from "./chart-utils";
import { fillDateGaps } from "./chart-utils";

interface AreaChartCardProps {
  title: string;
  data: DataPoint[];
  /** CSS color var for the stroke/fill. Defaults to chart-1. */
  color?: string;
  valueLabel?: string;
  formatValue?: (value: number) => string;
  /** Show time-range filter. */
  showTimeRange?: boolean;
  /** Extra description text. */
  description?: string;
}

/**
 * Time-series area chart using shadcn chart primitives.
 * Follows the dashboard-01 chart-area-interactive pattern with
 * ToggleGroup (desktop) + Select (mobile) for time-range filtering.
 */
export function AreaChartCard({
  title,
  data,
  color = "var(--chart-1)",
  valueLabel = "value",
  formatValue,
  showTimeRange = false,
  description,
}: AreaChartCardProps) {
  const [timeRange, setTimeRange] = useState("30d");

  const filled = fillDateGaps(data, 90);
  const total = filled.reduce((sum, d) => sum + d.value, 0);
  const totalLabel = formatValue ? formatValue(total) : total.toLocaleString();

  // Filter data by selected time range
  const filteredData = showTimeRange
    ? (() => {
        const refDate = filled.length > 0 ? new Date(filled[filled.length - 1].date) : new Date();
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const start = new Date(refDate);
        start.setDate(start.getDate() - days);
        return filled.filter((d) => new Date(d.date) >= start);
      })()
    : filled;

  const chartConfig = {
    [valueLabel]: {
      label: title,
      color,
    },
  } satisfies ChartConfig;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {totalLabel}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {showTimeRange && (
          <CardAction>
            <ToggleGroup
              value={[timeRange]}
              onValueChange={(v) => v.length > 0 && setTimeRange(v[0])}
              variant="outline"
              className="hidden *:data-[slot=toggle-group-item]:px-3! @[767px]/card:flex"
            >
              <ToggleGroupItem value="90d">3m</ToggleGroupItem>
              <ToggleGroupItem value="30d">30d</ToggleGroupItem>
              <ToggleGroupItem value="7d">7d</ToggleGroupItem>
            </ToggleGroup>
            <Select value={timeRange} onValueChange={(v) => v && setTimeRange(v)}>
              <SelectTrigger
                className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                size="sm"
                aria-label="Select time range"
              >
                <SelectValue placeholder="Last 30 days" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="90d" className="rounded-lg">
                  Last 3 months
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  Last 30 days
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg">
                  Last 7 days
                </SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-0 sm:px-6 sm:pt-0">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id={`fill-${valueLabel}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  formatter={(value) =>
                    formatValue ? formatValue(Number(value)) : Number(value).toLocaleString()
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="value"
              type="natural"
              fill={`url(#fill-${valueLabel})`}
              stroke={color}
              strokeWidth={2}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
