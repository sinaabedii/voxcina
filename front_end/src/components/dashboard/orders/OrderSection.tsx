import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OrderSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Titled section used by the order detail page and the return-request panel. */
export default function OrderSection({ title, icon, children, className }: OrderSectionProps) {
  return (
    <section className={className}>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-voxcina-blue dark:text-voxcina-cream md:text-sm">
        {icon && (
          <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">{icon}</span>
        )}
        {title}
      </h3>
      {children}
    </section>
  );
}
