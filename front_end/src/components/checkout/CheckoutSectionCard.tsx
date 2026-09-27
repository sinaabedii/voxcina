"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface CheckoutSectionCardProps {
  title: string;
  icon?: React.ReactNode;
  /** Small step badge, mobile-only (md:hidden) */
  step?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  id?: string;
}

/**
 * Single source for the checkout card chrome.
 * Collapses the repeated
 * `border voxcina-cream/30 ... rounded-2xl shadow-sm backdrop-blur-sm`
 * block in checkout/page.tsx into one place.
 *
 * Desktop output matches the original cards (same border/bg/radius,
 * same header rhythm); only <md> gets tighter padding + step badge.
 */
export default function CheckoutSectionCard({
  title,
  icon,
  step,
  action,
  children,
  className,
  contentClassName,
  headerClassName,
  id,
}: CheckoutSectionCardProps) {
  return (
    <Card
      id={id}
      className={cn(
        "border border-voxcina-cream/30 dark:border-voxcina-blue/30",
        "bg-white/90 dark:bg-voxcina-blue/10",
        "shadow-sm rounded-2xl backdrop-blur-sm",
        className
      )}
    >
      <CardHeader className={cn("px-4 pt-4 md:px-6 md:pt-6 pb-2", headerClassName)}>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center text-base md:text-lg text-voxcina-blue dark:text-voxcina-cream">
            {step && (
              <span
                aria-hidden="true"
                className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-voxcina-blue text-[11px] font-bold text-white md:hidden dark:bg-voxcina-cream dark:text-voxcina-blue"
              >
                {step}
              </span>
            )}
            {icon && <span className="ml-2 inline-flex [&_svg]:h-5 [&_svg]:w-5">{icon}</span>}
            {title}
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent className={cn("p-4 md:px-6 md:py-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
