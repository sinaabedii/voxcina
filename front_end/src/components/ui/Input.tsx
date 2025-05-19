import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      helperText,
      error,
      leftElement,
      rightElement,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor={props.id}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftElement && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
              {leftElement}
            </div>
          )}

          <input
            type={type}
            className={cn(
              "voxcina-input flex h-10 w-full rounded-md border border-border/30 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
              {
                "pl-10": leftElement,
                "pr-10": rightElement,
                "border-destructive focus-visible:ring-destructive/50 shadow-soft shadow-destructive/10": error,
                "hover:border-primary/30": !error,
                "shadow-soft": !error,
              },
              className
            )}
            ref={ref}
            {...props}
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
              {rightElement}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs text-destructive animate-fadeIn">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;