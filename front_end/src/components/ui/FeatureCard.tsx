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
        "flex flex-col items-center p-4 hover:bg-secondary/30 transition-colors",
        className
      )}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Icon className={cn("h-6 w-6 text-primary mb-2", iconClassName)} />
      <h4 className="font-medium text-sm text-foreground">{title}</h4>
      {description && (
        <div className="text-xs text-muted-foreground text-center mt-1">
          {description}
        </div>
      )}
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
