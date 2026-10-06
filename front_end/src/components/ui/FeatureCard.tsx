"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description?: string | React.ReactNode;
  className?: string;
  iconClassName?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  className,
  iconClassName,
}) => {
  return (
    <motion.div
      className={cn(
        // mobile: one compact horizontal row — icon inline, title and description
        // flowing into ~2 tight lines instead of a 3-line stacked card
        "flex items-center gap-2.5 px-3.5 py-2 transition-colors sm:hover:bg-secondary/30",
        // sm+: keeps the original centered card layout
        "sm:flex-col sm:items-center sm:gap-0 sm:p-4",
        className
      )}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 text-primary sm:mb-2 sm:h-6 sm:w-6",
          iconClassName
        )}
      />
      <div className="min-w-0 flex-1 leading-snug sm:leading-normal">
        <h4 className="inline text-[13px] font-medium text-foreground sm:block sm:text-center sm:text-sm">
          {title}
        </h4>
        {description && (
          <>
            <span
              aria-hidden="true"
              className="mx-1 align-middle text-muted-foreground/50 sm:hidden"
            >
              ·
            </span>
            <div className="inline text-[11px] text-muted-foreground sm:mt-1 sm:block sm:text-center sm:text-xs">
              {description}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

interface FeatureGridProps {
  features: Array<{
    icon: LucideIcon;
    title: string;
    description?: string | React.ReactNode;
  }>;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const FeatureGrid: React.FC<FeatureGridProps> = ({
  features,
  columns = 3,
  className,
}) => {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  return (
    <motion.div
      className={cn(
        "border border-border/20 rounded-xl overflow-hidden shadow-soft backdrop-blur-sm",
        className
      )}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={cn(
          "grid divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/20",
          gridCols[columns]
        )}
      >
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default FeatureCard;
