import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * True once the component has hydrated on the client, false during SSR
 * and the first client render. Used to defer rendering anything that
 * depends on browser-only state (next-themes' resolved theme, etc.)
 * until after hydration, without the classic
 * `useState(false) + useEffect(() => setState(true))` pattern — which
 * eslint-plugin-react-hooks v7's `set-state-in-effect` rule flags,
 * correctly: that pattern is exactly the kind of effect the React
 * Compiler can't safely reason about. `useSyncExternalStore` is the
 * primitive actually meant for "read some value that differs between
 * server and client render."
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
