"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = "md",
  className,
}) => {
  const handleDecrement = () => {
    if (value > min && !disabled) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max && !disabled) {
      onChange(value + 1);
    }
  };

  const sizeClasses = {
    sm: {
      button: "px-2 py-1.5",
      icon: "h-3 w-3",
      value: "px-3 py-1.5 text-sm min-w-[40px]",
    },
    md: {
      button: "px-3 py-2",
      icon: "h-4 w-4",
      value: "px-4 py-2 text-base min-w-[50px]",
    },
    lg: {
      button: "px-4 py-3",
      icon: "h-5 w-5",
      value: "px-5 py-3 text-lg min-w-[60px]",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex items-center border border-border/30 rounded-xl overflow-hidden bg-card shadow-soft",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <motion.button
        type="button"
        className={cn(
          classes.button,
          "text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors",
          (value <= min || disabled) && "opacity-40 cursor-not-allowed"
        )}
        onClick={handleDecrement}
        disabled={value <= min || disabled}
        whileHover={{ scale: value > min && !disabled ? 1.1 : 1 }}
        whileTap={{ scale: value > min && !disabled ? 0.9 : 1 }}
      >
        <Minus className={classes.icon} />
      </motion.button>
      
      <span
        className={cn(
          classes.value,
          "border-x border-border/30 text-center font-medium text-foreground"
        )}
      >
        {value}
      </span>
      
      <motion.button
        type="button"
        className={cn(
          classes.button,
          "text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors",
          (value >= max || disabled) && "opacity-40 cursor-not-allowed"
        )}
        onClick={handleIncrement}
        disabled={value >= max || disabled}
        whileHover={{ scale: value < max && !disabled ? 1.1 : 1 }}
        whileTap={{ scale: value < max && !disabled ? 0.9 : 1 }}
      >
        <Plus className={classes.icon} />
      </motion.button>
    </div>
  );
};

export default QuantitySelector;
