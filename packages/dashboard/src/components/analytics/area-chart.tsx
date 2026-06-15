"use client";

import type { EChartsType, TooltipComponentFormatterCallbackParams } from "echarts";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import type { DataPoint } from "./chart-utils";
import { fillDateGaps } from "./chart-utils";

interface AreaChartCardProps {
  title: string;
  data: DataPoint[];
  /** CSS color value for the stroke/fill. Defaults to accent blue. */
  color?: string;
  valueLabel?: string;
  formatValue?: (value: number) => string;
  /** Show time-range filter. */
  showTimeRange?: boolean;
  /** Extra description text. */
  description?: string;
}

const TIME_RANGE_ITEMS = {
  "90d": "Last 3 months",
  "30d": "Last 30 days",
  "7d": "Last 7 days",
} as const;

type TimeRangeKey = keyof typeof TIME_RANGE_ITEMS;

/**
 * Time-series area chart rendered with echarts (the design-system primitives have
 * no Chart component; echarts is a peer dep). Preserves the prior behavior: date-gap
 * filling, 7d/30d/90d filtering, gradient area, and a value total in the header.
 * Recolored to the AgentState token palette.
 */
export function AreaChartCard({
  title,
  data,
  color = "#3b82f6",
  valueLabel = "value",
  formatValue,
  showTimeRange = false,
  description,
}: AreaChartCardProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<EChartsType | null>(null);

  const filled = useMemo(() => fillDateGaps(data, 90), [data]);
  const total = filled.reduce((sum, d) => sum + d.value, 0);
  const totalLabel = formatValue ? formatValue(total) : total.toLocaleString();

  const filteredData = useMemo(() => {
    if (!showTimeRange) return filled;
    const refDate = filled.length > 0 ? new Date(filled[filled.length - 1].date) : new Date();
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const start = new Date(refDate);
    start.setDate(start.getDate() - days);
    return filled.filter((d) => new Date(d.date) >= start);
  }, [filled, showTimeRange, timeRange]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    const chart = chartInstance.current;

    chart.setOption({
      grid: { left: 8, right: 8, top: 8, bottom: 0, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(9,9,11,0.92)",
        borderWidth: 1,
        borderColor: "#262629",
        textStyle: { color: "#fafafa", fontSize: 12 },
        formatter: (params: TooltipComponentFormatterCallbackParams) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p) return "";
          const dateStr = String(p.name);
          const dateLabel = new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const raw = Array.isArray(p.value)
            ? Number(p.value[1] ?? 0)
            : typeof p.value === "number"
              ? p.value
              : Number(p.value) || 0;
          const valueLabelFmt = formatValue ? formatValue(raw) : raw.toLocaleString();
          return `${dateLabel}<br/><strong>${valueLabelFmt}</strong>`;
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: filteredData.map((d) => d.date),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#a1a1aa",
          fontSize: 11,
          margin: 8,
          hideOverlap: true,
          formatter: (value: string) =>
            new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        axisLabel: {
          color: "#a1a1aa",
          fontSize: 11,
          hideOverlap: true,
        },
      },
      series: [
        {
          name: valueLabel,
          type: "line",
          smooth: true,
          symbol: "none",
          stack: "a",
          lineStyle: { width: 2, color },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: withAlpha(color, 0.35) },
              { offset: 1, color: withAlpha(color, 0.02) },
            ]),
          },
          data: filteredData.map((d) => d.value),
        },
      ],
    });

    return undefined;
  }, [filteredData, color, valueLabel, formatValue]);

  // Responsive resize
  useEffect(() => {
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4">{title}</p>
          <p className="num text-[26px] font-semibold text-fg">{totalLabel}</p>
          {description && <p className="text-[12px] text-fg-3">{description}</p>}
        </div>
        {showTimeRange && (
          <select
            aria-label="Select time range"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
            className="min-h-[34px] w-[150px] rounded-[var(--radius)] border border-edge bg-panel px-2.5 text-[12px] text-fg outline-none transition-colors hover:bg-panel2 focus-visible:border-accent"
          >
            {(Object.keys(TIME_RANGE_ITEMS) as TimeRangeKey[]).map((k) => (
              <option key={k} value={k}>
                {TIME_RANGE_ITEMS[k]}
              </option>
            ))}
          </select>
        )}
      </div>
      <div ref={chartRef} className="h-[250px] w-full" />
    </Card>
  );
}

/** Converts a hex/rgb color to an rgba string with the given alpha. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
