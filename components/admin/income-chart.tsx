"use client";

import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useIsClient } from "@/lib/hooks/use-is-client";
import type { IncomeGranularity, IncomeSeriesPoint } from "@/lib/data/income";

// Same rationale as activity-chart.tsx: recharts writes raw SVG
// presentation attributes, which don't reliably resolve the app's CSS
// custom properties, so the chart mirrors the light/dark tokens here.
const PALETTES = {
  light: {
    income: "#005CF2",
    cost: "#EF4444",
    profit: "#16A34A",
    grid: "#E4E8F0",
    text: "#5B6472",
    tooltipBg: "#FFFFFF",
  },
  dark: {
    income: "#3D82FF",
    cost: "#F87171",
    profit: "#22C55E",
    grid: "#23262F",
    text: "#9AA3B2",
    tooltipBg: "#14161F",
  },
};

function bucketFormatter(
  granularity: IncomeGranularity,
  locale: string,
): (value: string) => string {
  const options: Intl.DateTimeFormatOptions =
    granularity === "month"
      ? { month: "short", year: "2-digit", timeZone: "UTC" }
      : { month: "short", day: "numeric", timeZone: "UTC" };
  const formatter = new Intl.DateTimeFormat(locale, options);
  return (value) => formatter.format(new Date(`${value}T00:00:00Z`));
}

export function IncomeChart({
  data,
  granularity,
  locale,
  labels,
}: {
  data: IncomeSeriesPoint[];
  granularity: IncomeGranularity;
  locale: string;
  labels: { income: string; cost: string; profit: string };
}) {
  const { resolvedTheme } = useTheme();
  const isClient = useIsClient();

  if (!isClient) {
    return <div className="h-64 w-full animate-pulse rounded-xl bg-surface" />;
  }

  const palette = resolvedTheme === "dark" ? PALETTES.dark : PALETTES.light;
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  });
  const formatBucket = bucketFormatter(granularity, locale);

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
      >
        <CartesianGrid stroke={palette.grid} vertical={false} />
        <XAxis
          dataKey="bucketStart"
          tickFormatter={formatBucket}
          stroke={palette.text}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
        />
        <YAxis
          stroke={palette.text}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => money.format(value)}
        />
        <Tooltip
          cursor={{ fill: palette.grid, opacity: 0.35 }}
          labelFormatter={(value) =>
            typeof value === "string" ? formatBucket(value) : value
          }
          formatter={(value, name) => [
            typeof value === "number" ? money.format(value) : String(value ?? ""),
            String(name ?? ""),
          ]}
          contentStyle={{
            background: palette.tooltipBg,
            border: `1px solid ${palette.grid}`,
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: palette.text }} />
        <Bar
          dataKey="income"
          name={labels.income}
          fill={palette.income}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="cost"
          name={labels.cost}
          fill={palette.cost}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="profit"
          name={labels.profit}
          fill={palette.profit}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
