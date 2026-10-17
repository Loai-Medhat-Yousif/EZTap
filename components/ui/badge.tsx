import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "muted" | "primary";

const toneClasses: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  muted: "bg-muted/10 text-muted",
  primary: "bg-primary-tint text-primary",
};

export function Badge({
  tone = "muted",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
