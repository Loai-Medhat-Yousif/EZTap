import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-ink",
          "placeholder:text-muted",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
          "disabled:pointer-events-none disabled:opacity-50",
          "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/30",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
