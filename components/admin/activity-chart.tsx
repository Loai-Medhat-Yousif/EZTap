"use client";

import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useIsClient } from "@/lib/hooks/use-is-client";
import type { DailyActivity } from "@/lib/data/analytics";

// recharts renders these as raw SVG presentation attributes, which
// don't reliably resolve CSS custom properties — so the chart gets its
// own small light/dark palette mirroring app/globals.css instead of
// reading the design tokens directly.
const PALETTES = {
  light: { views: "#005CF2", clicks: "#16A34A", grid: "#E4E8F0", text: "#5B6472", tooltipBg: "#FFFFFF" },
  dark: { views: "#3D82FF", clicks: "#22C55E", grid: "#23262F", text: "#9AA3B2", tooltipBg: "#14161F" },
};

export function ActivityChart({
  data,
  labels,
}: {
  data: DailyActivity[];
  labels: { views: string; clicks: string };
}) {
  const { resolvedTheme } = useTheme();
  const locale = useLocale();
  const isClient = useIsClient();

  if (!isClient) {
    return <div className="h-56 w-full animate-pulse rounded-xl bg-surface" />;
  }

  const palette = resolvedTheme === "dark" ? PALETTES.dark : PALETTES.light;
  // Formatted in the app's locale, not the browser's — this chart sits
  // on screens whose labels all come from the same translation files.
  const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const fullFormatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });

  return (
    <ResponsiveContainer width="100%" height={224}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={palette.grid} vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={(value: string) =>
            dayFormatter.format(new Date(`${value}T00:00:00Z`))
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
          allowDecimals={false}
          width={28}
        />
        <Tooltip
          labelFormatter={(value) =>
            typeof value === "string"
              ? fullFormatter.format(new Date(`${value}T00:00:00Z`))
              : value
          }
          contentStyle={{
            background: palette.tooltipBg,
            border: `1px solid ${palette.grid}`,
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="views"
          name={labels.views}
          stroke={palette.views}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="clicks"
          name={labels.clicks}
          stroke={palette.clicks}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
