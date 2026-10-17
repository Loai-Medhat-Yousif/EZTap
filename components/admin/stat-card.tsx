import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "success" | "muted";
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "success" ? "text-success" : "text-muted",
          )}
          aria-hidden
        />
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}
