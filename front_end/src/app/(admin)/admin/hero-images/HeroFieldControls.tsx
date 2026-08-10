"use client";

import React from "react";

/**
 * Compact form primitives for the hero editor.
 *
 * The editor packs a lot of controls into a narrow panel, so these are tuned
 * for density rather than reused from `components/ui` (which is sized for
 * customer-facing forms).
 */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  hint,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
  dir?: "rtl" | "ltr";
}) {
  const className =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent";

  return (
    <Field label={label} hint={hint}>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          dir={dir}
          className={`${className} resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          className={className}
        />
      )}
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SegmentedField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: React.ReactNode; title?: string }>;
  onChange: (value: T) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs transition-colors ${
              value === option.value
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  allowEmpty,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Lets the middle gradient stop be cleared for a two-stop gradient. */
  allowEmpty?: boolean;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          placeholder={allowEmpty ? "خالی = بدون رنگ میانی" : "#000000"}
          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {allowEmpty && value !== "" && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded border border-gray-200 px-2 py-2 text-[11px] text-gray-500 hover:bg-gray-50"
          >
            حذف
          </button>
        )}
      </div>
    </Field>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <Field label={`${label} (${value}${suffix})`} hint={hint}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </Field>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 cursor-pointer">
        <span className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
          />
          <span className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-colors" />
          <span className="absolute start-[2px] top-[2px] h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
        </span>
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </label>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

/** Two-column grid used throughout the editor panels. */
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}
