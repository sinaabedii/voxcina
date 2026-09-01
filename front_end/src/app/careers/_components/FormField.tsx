"use client";

import React from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Field primitives for the careers forms.
 *
 * Every control here is wired for screen readers the same way: the label points
 * at the control, `aria-invalid` marks a failed field, and `aria-describedby`
 * links whichever of the hint or the error is currently shown, so an assistive
 * technology announces the reason a field was rejected instead of just "invalid".
 */

const controlBase =
  "w-full rounded-xl border bg-white/80 px-4 py-3 text-sm text-voxcina-darkBlue transition-colors placeholder:text-voxcina-blue/40 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-voxcina-blue/10 dark:text-secondary-100 dark:placeholder:text-secondary-400/60";

const controlState = (hasError: boolean) =>
  hasError
    ? "border-red-400 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500/60"
    : "border-voxcina-blue/15 focus:border-voxcina-blue focus:ring-voxcina-blue/25 dark:border-secondary-200/15";

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function FieldShell({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-voxcina-darkBlue dark:text-secondary-200"
      >
        {label}
        {required && (
          <span className="text-red-500" aria-hidden="true">
            {" *"}
          </span>
        )}
        {!required && (
          <span className="mr-1 text-xs font-normal text-voxcina-blue/50 dark:text-secondary-400">
            (اختیاری)
          </span>
        )}
      </label>

      {children}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className="mt-1.5 text-xs text-voxcina-blue/60 dark:text-secondary-400"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Which element describes the control right now — the error wins over the hint. */
function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export function TextField({
  id,
  label,
  error,
  hint,
  required,
  containerClassName,
  className,
  ...props
}: TextFieldProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={containerClassName}
    >
      <input
        id={id}
        name={id}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(controlBase, controlState(!!error), className)}
        {...props}
      />
    </FieldShell>
  );
}

interface SelectFieldProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  containerClassName?: string;
}

export function SelectField({
  id,
  label,
  error,
  hint,
  required,
  placeholder = "انتخاب کنید",
  options,
  containerClassName,
  className,
  ...props
}: SelectFieldProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={containerClassName}
    >
      <div className="relative">
        <select
          id={id}
          name={id}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(
            controlBase,
            controlState(!!error),
            "appearance-none pl-10",
            className
          )}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* RTL layout: the chevron sits on the left, where the control ends. */}
        <ChevronDown
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-voxcina-blue/50 dark:text-secondary-400"
          aria-hidden="true"
        />
      </div>
    </FieldShell>
  );
}

interface TextAreaFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  maxLength: number;
  containerClassName?: string;
}

export function TextAreaField({
  id,
  label,
  error,
  hint,
  required,
  maxLength,
  value,
  containerClassName,
  className,
  ...props
}: TextAreaFieldProps) {
  const used = typeof value === "string" ? value.length : 0;

  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={containerClassName}
    >
      <div className="relative">
        <textarea
          id={id}
          name={id}
          value={value}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(controlBase, controlState(!!error), "resize-y", className)}
          {...props}
        />
        <span
          className="pointer-events-none absolute bottom-3 left-3 text-[11px] tabular-nums text-voxcina-blue/40 dark:text-secondary-400/70"
          aria-hidden="true"
        >
          {used}/{maxLength}
        </span>
      </div>
    </FieldShell>
  );
}
