"use client";

import { cn } from "@/lib/utils";

const CONTROL_CLASSES =
  "w-full rounded-xl border border-voxcina-cream/70 dark:border-voxcina-blue/40 bg-white/80 dark:bg-voxcina-blue/20 px-3 py-2 text-sm text-voxcina-blue dark:text-voxcina-cream placeholder-voxcina-blue/40 dark:placeholder-voxcina-cream/40 focus:outline-none focus:border-voxcina-blue/60 dark:focus:border-voxcina-cream/50 focus:ring-2 focus:ring-voxcina-blue/10 transition disabled:opacity-60";

export function AdminField({
  label,
  htmlFor,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1.5"
      >
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}

export function AdminInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL_CLASSES, className)} />;
}

export function AdminSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(CONTROL_CLASSES, className)}>
      {children}
    </select>
  );
}

export function AdminTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(CONTROL_CLASSES, "min-h-24", className)} />;
}

/** Two-column responsive grid used by modal/filter forms. */
export function AdminFormGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>{children}</div>;
}
