"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  size?: "sm" | "md" | "lg";
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  action,
  className,
  titleClassName,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={cn("flex justify-between items-center mb-6", className)}>
      <div>
        <h2
          className={cn(
            "font-bold text-foreground",
            sizeClasses[size],
            titleClassName
          )}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export default SectionTitle;
