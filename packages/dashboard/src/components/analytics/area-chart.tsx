"use client";

import { LayerCard, Select, Text } from "@cloudflare/kumo";
import type { EChartsType, TooltipComponentFormatterCallbackParams } from "echarts";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DataPoint } from "./chart-utils";
import { fillDateGaps } from "./chart-utils";

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

interface AreaChartCardProps {
  title: string;
  data: DataPoint[];
  /** CSS color value for the stroke/fill. Defaults to a Kumo-friendly blue. */
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
 * Time-series area chart rendered with echarts (Kumo has no Chart component;
 * echarts is a peer dep). Preserves the prior recharts behavior: date-gap
 * filling, 7d/30d/90d filtering, gradient area, and a value total in the header.
 */
export function AreaChartCard({
  title,
  data,
  color = "#1a80e6",
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
        backgroundColor: cssVar("--popover", "rgba(17,17,23,0.92)"),
        borderWidth: 0,
        textStyle: { color: cssVar("--popover-foreground", "#fff"), fontSize: 12 },
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
          color: cssVar("--muted-foreground", "#71717a"),
          fontSize: 11,
          margin: 8,
          hideOverlap: true,
          formatter: (value: string) =>
            new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: cssVar("--border", "rgba(255,255,255,0.08)") } },
        axisLabel: {
          color: cssVar("--muted-foreground", "#71717a"),
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
    <LayerCard className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Text variant="secondary" as="p">
            {title}
          </Text>
          <Text variant="heading2" as="p">
            {totalLabel}
          </Text>
          {description && (
            <Text variant="secondary" as="p" size="sm">
              {description}
            </Text>
          )}
        </div>
        {showTimeRange && (
          <Select
            aria-label="Select time range"
            size="sm"
            className="w-[150px]"
            value={timeRange}
            onValueChange={(v) => {
              if (v) setTimeRange(v as TimeRangeKey);
            }}
            items={TIME_RANGE_ITEMS}
          />
        )}
      </div>
      <div ref={chartRef} className="h-[250px] w-full" />
    </LayerCard>
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
