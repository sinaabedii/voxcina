import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-medium":
              variant === "primary",
            "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-soft":
              variant === "secondary",
            "border border-border bg-background hover:bg-secondary hover:border-primary/20 text-foreground shadow-soft":
              variant === "outline",
            "bg-transparent text-foreground hover:bg-secondary hover:text-primary":
              variant === "ghost",
            "underline-offset-4 hover:underline text-primary hover:text-primary/80":
              variant === "link",
            "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-soft":
              variant === "danger",
            "h-9 px-3.5 text-xs rounded-lg": size === "sm",
            "h-11 px-5 py-2.5 text-sm rounded-xl": size === "md",
            "h-12 px-6 py-3 text-base rounded-xl": size === "lg",
            "w-full": fullWidth,
          },
          className
        )}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading && (
          <span className="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent">
            <span className="sr-only">در حال بارگذاری...</span>
          </span>
        )}

        {leftIcon && (
          <span className={cn("ml-2.5", { "mr-2": isLoading })}>
            {leftIcon}
          </span>
        )}
        {children}
        {rightIcon && <span className="mr-2.5">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;