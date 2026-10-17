import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-xl border border-border bg-surface-raised px-4 text-sm text-ink",
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
Input.displayName = "Input";
