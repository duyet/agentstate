"use client";

import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DataPoint {
  date: string;
  value: number;
}

interface AreaChartCardProps {
  title: string;
  data: DataPoint[];
  color?: string;
  valueLabel?: string;
}

function fillDateGaps(data: DataPoint[], days: number): DataPoint[] {
  if (data.length === 0) {
    // Generate empty date range
    const result: DataPoint[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      result.push({ date: d.toISOString().slice(0, 10), value: 0 });
    }
    return result;
  }

  const map = new Map(data.map((d) => [d.date, d.value]));
  const result: DataPoint[] = [];

  // Parse first date and fill forward
  const start = new Date(data[0].date);
  const end = new Date(data[data.length - 1].date);

  const current = new Date(start);
  while (current <= end) {
    const key = current.toISOString().slice(0, 10);
    result.push({ date: key, value: map.get(key) ?? 0 });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AreaChartCard({ title, data, color = "#2563eb", valueLabel = "Count" }: AreaChartCardProps) {
  const filled = fillDateGaps(data, 30);

  return (
    <div className="border border-border rounded-lg p-5 bg-card">
      <h3 className="text-sm font-medium text-foreground mb-4">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={filled} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelFormatter={(label) => formatDateLabel(String(label))}
              formatter={(value) => [Number(value).toLocaleString(), valueLabel]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${title})`}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
