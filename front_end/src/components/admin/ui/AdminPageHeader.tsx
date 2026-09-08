"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard admin page header: highlighted title, optional subtitle and
 * action buttons. Replaces the copy-pasted motion.div + h1 blocks that
 * previously lived in every admin list page.
 */
export default function AdminPageHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8",
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream relative inline-block">
          <span className="relative z-10 inline-flex items-center gap-2">
            {icon}
            {title}
          </span>
          <span
            aria-hidden
            className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"
          />
        </h1>
        {subtitle && (
          <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-2">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">{actions}</div>
      )}
    </motion.div>
  );
}
