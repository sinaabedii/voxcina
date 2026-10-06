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
        "flex min-w-0 flex-col items-center px-1 py-2 text-center transition-colors sm:p-4 sm:hover:bg-secondary/30",
        className
      )}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Icon
        className={cn(
          "mb-1.5 h-4 w-4 shrink-0 text-primary sm:mb-2 sm:h-6 sm:w-6",
          iconClassName
        )}
      />
      <div className="w-full min-w-0 break-words">
        <h4 className="flex min-h-8 items-center justify-center text-[11px] font-medium leading-4 text-foreground sm:block sm:min-h-0 sm:text-sm sm:leading-5">
          {title}
        </h4>
        {description && (
          <div className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">
            {description}
          </div>
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
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };
  const dividerClasses =
    columns === 3
      ? "divide-x divide-x-reverse"
      : "divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse";

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
          "grid divide-border/20",
          dividerClasses,
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
