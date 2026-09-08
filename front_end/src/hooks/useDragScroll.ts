"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Lightweight drag-to-scroll hook for horizontal scrollers.
 * Handles mouse drag + touch via Pointer Events with a threshold
 * so taps still propagate to child links.
 */
export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef(0);
  const startScrollRef = useRef(0);
  const activePointerRef = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);
  const DRAG_THRESHOLD = 8;

  const pauseAutoScrollRef = useRef<(() => void) | null>(null);

  // Optional hook to pause external auto-scroll (e.g. product carousel)
  const setPauseHandler = useCallback((fn: () => void) => {
    pauseAutoScrollRef.current = fn;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !e.isPrimary) return;
    activePointerRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startScrollRef.current = el.scrollLeft;
    hasDraggedRef.current = false;
    pauseAutoScrollRef.current?.();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || activePointerRef.current !== e.pointerId) return;
    const dx = e.clientX - startXRef.current;
    if (!hasDraggedRef.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      hasDraggedRef.current = true;
      setIsDragging(true);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    el.scrollLeft = startScrollRef.current - dx * 1.5;
  }, []);

  const endDrag = useCallback(
    (e?: React.PointerEvent) => {
      if (e && activePointerRef.current !== null && e.pointerId !== activePointerRef.current) return;
      const wasPointerDown = activePointerRef.current !== null;
      const wasDrag = hasDraggedRef.current;
      activePointerRef.current = null;
      if (!wasPointerDown) return;
      if (wasDrag) {
        setIsDragging(false);
        if (ref.current && e) {
          try {
            ref.current.releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }
      }
    },
    [],
  );

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDraggedRef.current = false;
    }
  }, []);

  const scrollBy = useCallback((direction: "start" | "end", factor = 0.8) => {
    const el = ref.current;
    if (!el) return;
    const amount = el.clientWidth * factor;
    const next = direction === "end" ? el.scrollLeft + amount : el.scrollLeft - amount;
    el.scrollTo({ left: next, behavior: "smooth" });
  }, []);

  return {
    ref,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClickCapture,
    scrollBy,
    setPauseHandler,
  };
}
