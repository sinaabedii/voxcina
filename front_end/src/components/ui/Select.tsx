import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export default function Select({
  label,
  error,
  helperText,
  options,
  placeholder,
  className,
  id,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "h-12 w-full cursor-pointer rounded-xl border-2 border-gray-200 bg-transparent px-4 text-sm text-gray-900 transition-all duration-200",
          "hover:border-gray-300 focus:border-voxcina-blue focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-600 dark:focus:border-voxcina-blue",
          error && "border-red-400 focus:border-red-500 dark:border-red-500",
          className,
        )}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-gray-400">{helperText}</p>}
    </div>
  );
}
