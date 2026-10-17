import Image from "next/image";

/** One branded full-screen message (404, inactive card, error), so
 * every dead-end a visitor can reach looks like EZTab, not a framework
 * default. The logo sits on a white chip because its wordmark is
 * near-black and would vanish on the dark theme. */
export function StatusScreen({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#15171F] p-3 shadow-sm ring-1 ring-black/5">
        <Image src="/brand/logo.svg" alt="EZTab" width={56} height={38} />
      </div>
      <h1 className="text-lg font-semibold text-ink">{title}</h1>
      <p className="mt-2 max-w-xs text-sm text-muted">{message}</p>
      {children}
    </main>
  );
}
