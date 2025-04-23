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
          "inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none",
          {
            "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-sm hover:shadow-md":
              variant === "primary",
            "bg-secondary text-secondary-foreground hover:bg-secondary/90":
              variant === "secondary",
            "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-200":
              variant === "outline",
            "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100":
              variant === "ghost",
            "underline-offset-4 hover:underline text-primary hover:text-primary/80":
              variant === "link",
            "bg-red-600 hover:bg-red-700 text-white": variant === "danger",
            "h-9 px-3.5 text-xs": size === "sm",
            "h-11 px-5 py-2.5 text-sm": size === "md",
            "h-12 px-6 py-3 text-base": size === "lg",
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
