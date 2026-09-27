"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SelectableRadioCardProps {
  selected: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Leading visual: logo, icon, custom radio handled internally */
  leading?: React.ReactNode;
  /** Trailing meta: price, badge */
  meta?: React.ReactNode;
  /** Extra line under the header (e.g. SLA, address lines) */
  body?: React.ReactNode;
  /** Full-width footer (e.g. set-default button, expanded gateways) */
  footer?: React.ReactNode;
  /** Top-right action (e.g. edit) — click is isolated via stopPropagation */
  action?: React.ReactNode;
  radioId?: string;
  radioName?: string;
  className?: string;
  bodyClassName?: string;
}

/**
 * Unifies the three selectable-row patterns in checkout:
 * address cards, shipping rows, payment method rows.
 *
 * - Whole card is the hit target (min 44px), keyboard operable.
 * - No framer-motion whileHover: desktop keeps a CSS lift,
 *   touch gets none (no sticky hover lift).
 */
export default function SelectableRadioCard({
  selected,
  onSelect,
  title,
  description,
  leading,
  meta,
  body,
  footer,
  action,
  radioId,
  radioName,
  className,
  bodyClassName,
}: SelectableRadioCardProps) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "cursor-pointer rounded-xl border p-3 transition-colors duration-200 outline-none",
        "min-h-[44px]",
        "focus-visible:ring-2 focus-visible:ring-voxcina-blue/40 dark:focus-visible:ring-voxcina-cream/40",
        "md:p-4 md:hover:-translate-y-[2px] md:hover:shadow-sm md:transition-all",
        selected
          ? "border-voxcina-blue bg-voxcina-blue/5 shadow-soft dark:border-voxcina-cream dark:bg-voxcina-cream/5"
          : "border-voxcina-cream/30 hover:border-voxcina-blue/50 dark:border-voxcina-blue/30 dark:hover:border-voxcina-cream/30",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
              selected
                ? "border-voxcina-blue bg-voxcina-blue text-white dark:border-voxcina-cream dark:bg-voxcina-cream dark:text-voxcina-blue"
                : "border-voxcina-blue/30 dark:border-voxcina-cream/30"
            )}
          >
            {selected && (
              <svg viewBox="0 0 8 8" className="h-2.5 w-2.5 fill-current" aria-hidden="true">
                <circle cx="4" cy="4" r="3" />
              </svg>
            )}
          </span>
          {radioId && (
            <input
              type="radio"
              id={radioId}
              name={radioName}
              checked={selected}
              onChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="sr-only"
              tabIndex={-1}
            />
          )}
          {leading}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-voxcina-blue dark:text-voxcina-cream md:text-base">
              {title}
            </div>
            {description && (
              <div className="mt-0.5 text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                {description}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {meta}
          {action}
        </div>
      </div>
      {body && (
        <div className={cn("mt-2 text-[13px] leading-5 md:text-sm md:leading-6", bodyClassName)}>
          {body}
        </div>
      )}
      {footer && <div className="mt-2.5">{footer}</div>}
    </div>
  );
}
