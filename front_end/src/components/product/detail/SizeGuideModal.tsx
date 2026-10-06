"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Ruler, X } from "lucide-react";
import ProductSizeGuide from "./ProductSizeGuide";
import { Product } from "@/types/product";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
}

/**
 * The size guide is a full-page reading surface rather than a small generic
 * dialog. It intentionally shares the recommendation wizard's shell so both
 * buttons beside the size selector open the same predictable experience.
 */
export default function SizeGuideModal({
  isOpen,
  onClose,
  product,
  selectedSize,
  onSelectSize,
}: SizeGuideModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const reduceMotion = useReducedMotion();

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
    mainRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  // Keep the reading surface above the visible viewport when the mobile
  // keyboard or browser chrome changes the visual viewport height.
  useEffect(() => {
    if (!isOpen || !window.visualViewport) return;

    const viewport = window.visualViewport;
    const updateViewport = () => {
      if (!overlayRef.current) return;
      const visibleHeight = Math.min(viewport.height, window.innerHeight);
      overlayRef.current.style.setProperty("--size-dialog-viewport-height", `${visibleHeight}px`);
      overlayRef.current.style.top = `${viewport.offsetTop}px`;
    };

    updateViewport();
    viewport.addEventListener("resize", updateViewport);
    viewport.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      viewport.removeEventListener("resize", updateViewport);
      viewport.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && activeIndex <= 0) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeIndex === -1 || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        key="size-guide-overlay"
        className="fixed inset-x-0 top-0 z-[60] flex h-[var(--size-dialog-viewport-height,100dvh)] items-center justify-center overflow-hidden bg-black/60 p-0 backdrop-blur-sm sm:p-6"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0 }}
        transition={{ duration: 0.2 }}
        onPointerDown={(event) => event.target === event.currentTarget && onClose()}
        dir="rtl"
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="size-guide-title"
          aria-describedby="size-guide-description"
          initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: "spring" as const, damping: 30, stiffness: 400 }}
          className="relative flex h-full max-h-full w-full shrink-0 flex-col overflow-hidden bg-background shadow-2xl sm:h-[min(860px,calc(100dvh-3rem))] sm:max-w-[72rem] sm:rounded-3xl sm:border sm:border-border/30"
        >
          <header className="shrink-0 border-b border-border/20 bg-card/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-6 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Ruler className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 id="size-guide-title" className="text-lg font-bold text-foreground sm:text-xl">
                    جدول سایز
                  </h2>
                  <p id="size-guide-description" className="mt-1 truncate text-xs leading-5 text-muted-foreground">
                    راهنمای اندازه‌گیری و انتخاب سایز برای {product.name}
                  </p>
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none"
                aria-label="بستن جدول سایز"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-primary" aria-hidden="true" />
          </header>

          <main
            ref={mainRef}
            tabIndex={-1}
            aria-label="راهنمای جدول سایز"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-8 [WebkitOverflowScrolling:touch] sm:px-7 sm:py-6 sm:pb-10"
          >
            <div className="mx-auto w-full max-w-6xl">
              <ProductSizeGuide
                product={product}
                selectedSize={selectedSize}
                onSelectSize={onSelectSize}
                allowZoom={false}
              />
            </div>
          </main>

          <footer className="flex shrink-0 flex-col gap-2.5 border-t border-border/20 bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
            <p className="text-center text-[11px] text-muted-foreground sm:text-right">
              برای انتخاب سایز، روی ردیف موردنظر در جدول بزنید.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 w-full rounded-xl border border-border/40 px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:w-auto motion-reduce:transition-none"
            >
              بستن جدول
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
