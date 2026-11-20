"use client";

import { useCallback, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

/**
 * Reorderable-list state for pointer input — mouse, touch and pen — with
 * no dependency. Rows are measured once when a drag starts; the dragged
 * row then tracks the pointer while the rows it passes shift aside to
 * make room. That avoids re-measuring on every move, which is what makes
 * pointer-driven reordering jitter.
 *
 * Nothing here talks to the server. The list lives in local state and
 * `isDirty` simply compares it with the `items` prop, so the caller can
 * show an unsaved-changes indicator and persist the whole order in one
 * request — instead of one round trip per move.
 *
 * Reordering is also keyboard-driven: the handle is a focusable button
 * that takes ArrowUp/ArrowDown to move the focused row, so it isn't
 * pointer-only, and Escape abandons a drag in progress.
 */

export type SortHandleProps = {
  ref: (element: HTMLButtonElement | null) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
};

export type PointerSort<T> = {
  /** The current order, which may differ from `items` until saved. */
  order: T[];
  /** True when `order` no longer matches what the server last sent. */
  isDirty: boolean;
  /** Reverts any unsaved reordering back to `items`. */
  reset: () => void;
  /** Index of the row under the pointer, or null when nothing is dragged. */
  dragIndex: number | null;
  /** Index the dragged row would settle on. */
  overIndex: number | null;
  /** True while a drag is in flight. */
  isDragging: boolean;
  /** Pixel transform for the dragged row. */
  dragOffset: number;
  /** Pixel transform for a row that must shift to make room, by id. */
  shift: (id: string) => number;
  /** Props for the drag handle of the row with this id. */
  handleProps: (id: string) => SortHandleProps;
  /** Props for the row element itself, so it can be measured. */
  rowProps: (id: string) => {
    ref: (element: HTMLLIElement | null) => void;
  };
};

type DragState = {
  id: string;
  from: number;
  to: number;
  startY: number;
  rects: DOMRect[];
};

/**
 * Keeps a locally-ordered copy of `items` in sync when the server's copy
 * changes, without clobbering an unsaved reorder: rows the server still
 * knows about are refreshed in place, rows it dropped disappear, and rows
 * it added (which the client has never seen) are appended — which is
 * also where the server puts them.
 */
function mergeOrder<T>(
  current: T[],
  incoming: T[],
  getId: (item: T) => string,
): T[] {
  const byId = new Map(incoming.map((item) => [getId(item), item] as const));
  const kept = current
    .map((item) => byId.get(getId(item)))
    .filter((item): item is T => item !== undefined);
  const keptIds = new Set(current.map(getId));
  const appended = incoming.filter((item) => !keptIds.has(getId(item)));
  return [...kept, ...appended];
}

export function usePointerSort<T>({
  items,
  getId,
  disabled = false,
}: {
  items: T[];
  getId: (item: T) => string;
  /** Blocks starting a drag — e.g. while a row is open for editing. */
  disabled?: boolean;
}): PointerSort<T> {
  const [order, setOrder] = useState<T[]>(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragHeight, setDragHeight] = useState(0);
  const [prevItems, setPrevItems] = useState<T[]>(items);

  const drag = useRef<DragState | null>(null);
  const rowElements = useRef(new Map<string, HTMLLIElement>());
  const rowRefs = useRef(new Map<string, (element: HTMLLIElement | null) => void>());
  // The handle element itself is never needed — pointer capture works
  // off `event.currentTarget` — but React still wants a stable ref on
  // it, so one shared no-op is enough.
  const noopRef = useRef<(element: HTMLButtonElement | null) => void>(
    () => undefined,
  );

  // Adjust during render rather than in an effect: props changing means
  // the server's list changed (an add, edit or delete elsewhere), and
  // this reconciles the two without a commit-phase round trip.
  if (prevItems !== items) {
    setPrevItems(items);
    setOrder((current) => {
      const next = mergeOrder(current, items, getId);
      const unchanged =
        next.length === current.length &&
        next.every((item, index) => item === current[index]);
      return unchanged ? current : next;
    });
  }

  const isDirty =
    order.length !== items.length ||
    order.some((item, index) => getId(item) !== getId(items[index]));

  const reset = useCallback(() => setOrder(items), [items]);

  const indexById = useCallback(
    (id: string) => order.findIndex((item) => getId(item) === id),
    [order, getId],
  );

  const startDrag = useCallback(
    (id: string, event: ReactPointerEvent<HTMLButtonElement>) => {
      // Touch devices fire pointerdown with button 0; ignore secondary clicks.
      if (event.button !== 0) return;
      if (disabled) return;

      const from = indexById(id);
      // Needs at least two rows to swap between, and every row measured.
      if (from < 0 || order.length < 2) return;
      const nodes = order.map((item) => rowElements.current.get(getId(item)));
      if (nodes.some((node) => !node)) return;

      const rects = nodes.map((node) => node!.getBoundingClientRect());
      drag.current = { id, from, to: from, startY: event.clientY, rects };

      // Without this the browser would scroll the page instead of letting
      // the row follow the pointer on touch.
      event.currentTarget.setPointerCapture(event.pointerId);

      setDragIndex(from);
      setOverIndex(from);
      setDragHeight(rects[from].height);
      setDragOffset(0);
    },
    [disabled, indexById, order, getId],
  );

  const moveDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const state = drag.current;
      if (!state) return;

      const dy = event.clientY - state.startY;
      setDragOffset(dy);

      // Where the dragged row's centre now sits, then the first row whose
      // midpoint it has crossed — that's the slot it would land in.
      const origin = state.rects[state.from];
      const centre = origin.top + origin.height / 2 + dy;

      let to = state.from;
      for (let i = 0; i < state.rects.length; i++) {
        if (i === state.from) continue;
        const midpoint = state.rects[i].top + state.rects[i].height / 2;
        if (i < state.from && centre < midpoint) to = Math.min(to, i);
        else if (i > state.from && centre > midpoint) to = Math.max(to, i);
      }

      if (to !== state.to) {
        state.to = to;
        setOverIndex(to);
      }
    },
    [],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const state = drag.current;
      drag.current = null;

      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // The pointer may already be gone (tab blur mid-drag); nothing to
        // release in that case.
      }

      setDragIndex(null);
      setOverIndex(null);
      setDragOffset(0);

      if (!state || state.to === state.from) return;
      const { from, to } = state;
      setOrder((current) => {
        const next = [...current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    [],
  );

  const moveBy = useCallback(
    (id: string, delta: -1 | 1) => {
      if (disabled) return;
      const from = indexById(id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= order.length) return;
      setOrder((current) => {
        const next = [...current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    [disabled, indexById, order.length],
  );

  /** Abandons a drag without reordering — used by Escape and pointercancel. */
  const cancelDrag = useCallback(() => {
    drag.current = null;
    setDragIndex(null);
    setOverIndex(null);
    setDragOffset(0);
  }, []);

  const handleProps = useCallback(
    (id: string): SortHandleProps => ({
      ref: noopRef.current,
      onPointerDown: (event) => startDrag(id, event),
      onPointerMove: moveDrag,
      onPointerUp: (event) => endDrag(event),
      onPointerCancel: () => cancelDrag(),
      onKeyDown: (event) => {
        if (event.key === "Escape") {
          cancelDrag();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          moveBy(id, -1);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          moveBy(id, 1);
        }
      },
    }),
    [startDrag, moveDrag, endDrag, cancelDrag, moveBy],
  );

  const rowProps = useCallback(
    (id: string) => {
      let ref = rowRefs.current.get(id);
      if (!ref) {
        ref = (element: HTMLLIElement | null) => {
          if (element) rowElements.current.set(id, element);
          else rowElements.current.delete(id);
        };
        rowRefs.current.set(id, ref);
      }
      return { ref };
    },
    [],
  );

  const shift = useCallback(
    (id: string) => {
      if (dragIndex === null || overIndex === null) return 0;
      const index = indexById(id);
      if (index < 0 || index === dragIndex) return 0;
      if (dragIndex < overIndex && index > dragIndex && index <= overIndex) {
        return -dragHeight;
      }
      if (dragIndex > overIndex && index < dragIndex && index >= overIndex) {
        return dragHeight;
      }
      return 0;
    },
    [dragIndex, overIndex, dragHeight, indexById],
  );

  return {
    order,
    isDirty,
    reset,
    dragIndex,
    overIndex,
    isDragging: dragIndex !== null,
    dragOffset,
    shift,
    handleProps,
    rowProps,
  };
}
