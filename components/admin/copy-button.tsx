"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function CopyButton({
  value,
  label,
  copiedLabel,
  ...props
}: {
  value: string;
  label: string;
  copiedLabel: string;
} & Omit<ButtonProps, "onClick" | "children">) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail (permissions, insecure context). Nothing
      // destructive happened, so there's nothing to recover — the
      // button just stays in its normal state.
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleCopy} {...props}>
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}
