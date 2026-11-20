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
import type { CardTypeSummary } from "@/lib/data/income";

// Same rationale as activity-chart.tsx: recharts writes raw SVG
// presentation attributes, which don't reliably resolve the app's CSS
// custom properties, so the chart mirrors the light/dark tokens here.
const PALETTES = {
  light: {
    created: "#005CF2",
    sold: "#16A34A",
    grid: "#E4E8F0",
    text: "#5B6472",
    tooltipBg: "#FFFFFF",
  },
  dark: {
    created: "#3D82FF",
    sold: "#22C55E",
    grid: "#23262F",
    text: "#9AA3B2",
    tooltipBg: "#14161F",
  },
};

export function CardTypeChart({
  data,
  labels,
  typeLabels,
}: {
  data: CardTypeSummary[];
  labels: { created: string; sold: string };
  typeLabels: Record<CardTypeSummary["type"], string>;
}) {
  const { resolvedTheme } = useTheme();
  const isClient = useIsClient();

  if (!isClient) {
    return <div className="h-64 w-full animate-pulse rounded-xl bg-surface" />;
  }

  const palette = resolvedTheme === "dark" ? PALETTES.dark : PALETTES.light;

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
        barGap={4}
      >
        <CartesianGrid stroke={palette.grid} vertical={false} />
        <XAxis
          dataKey="type"
          tickFormatter={(value: string) =>
            typeLabels[value as CardTypeSummary["type"]] ?? value
          }
          stroke={palette.text}
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={palette.text}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: palette.grid, opacity: 0.35 }}
          formatter={(value, name) => [
            typeof value === "number" ? String(value) : String(value ?? ""),
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
          dataKey="total"
          name={labels.created}
          fill={palette.created}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="sold"
          name={labels.sold}
          fill={palette.sold}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
