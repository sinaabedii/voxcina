"use client";

import React, { useRef, useState } from "react";
import { AlertCircle, FileText, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { RESUME_ACCEPT, formatFileSize, validateResumeFile } from "@/lib/careers";

interface ResumeUploaderProps {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * PDF drop zone for the CV.
 *
 * The zone accepts a drag-and-drop as well as a click, but the click target is
 * a real <button> rather than the container: a bare div would leave keyboard
 * users with no way to open the file picker. The hidden <input type="file"> is
 * driven from that button, and a rejected file reports why inline instead of
 * silently doing nothing.
 */
export default function ResumeUploader({
  id,
  file,
  onChange,
  error,
  required,
  disabled,
}: ResumeUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const shownError = error || localError || undefined;

  const accept = (candidate: File | null | undefined) => {
    if (!candidate) return;
    const problem = validateResumeFile(candidate);
    if (problem) {
      setLocalError(problem);
      onChange(null);
      return;
    }
    setLocalError(null);
    onChange(candidate);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    accept(event.dataTransfer.files?.[0]);
  };

  const clearFile = () => {
    setLocalError(null);
    onChange(null);
    // Reset the input so re-picking the same file still fires a change event.
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div id={`${id}-field`}>
      <span className="mb-2 block text-sm font-medium text-voxcina-darkBlue dark:text-secondary-200">
        رزومه (PDF)
        {required ? (
          <span className="text-red-500" aria-hidden="true">
            {" *"}
          </span>
        ) : (
          <span className="mr-1 text-xs font-normal text-voxcina-blue/50 dark:text-secondary-400">
            (اختیاری)
          </span>
        )}
      </span>

      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-voxcina-blue/15 bg-white/80 p-3 dark:border-secondary-200/15 dark:bg-voxcina-blue/10">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-200">
            <FileText className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-voxcina-darkBlue dark:text-secondary-100">
              {file.name}
            </span>
            <span className="block text-xs text-voxcina-blue/60 dark:text-secondary-400">
              {formatFileSize(file.size)}
            </span>
          </span>
          <button
            type="button"
            onClick={clearFile}
            disabled={disabled}
            className="flex-shrink-0 rounded-lg p-2 text-voxcina-blue/60 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-50 dark:hover:bg-red-900/20"
            aria-label={`حذف فایل ${file.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors",
            isDragging
              ? "border-voxcina-blue bg-voxcina-blue/5"
              : shownError
              ? "border-red-300 bg-red-50/40 dark:border-red-500/50 dark:bg-red-900/10"
              : "border-voxcina-blue/20 bg-white/50 dark:border-secondary-200/15 dark:bg-voxcina-blue/5"
          )}
        >
          <UploadCloud
            className="mx-auto mb-3 h-8 w-8 text-voxcina-blue/50 dark:text-secondary-300"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            aria-describedby={`${id}-help`}
            className="rounded-lg bg-voxcina-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-voxcina-darkBlue focus:outline-none focus-visible:ring-2 focus-visible:ring-voxcina-blue/50 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            انتخاب فایل رزومه
          </button>
          <p
            id={`${id}-help`}
            className="mt-2.5 text-xs text-voxcina-blue/60 dark:text-secondary-400"
          >
            یا فایل را اینجا رها کنید — فقط PDF، حداکثر ۵ مگابایت
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        id={id}
        name={id}
        type="file"
        accept={RESUME_ACCEPT}
        className="hidden"
        disabled={disabled}
        aria-invalid={!!shownError}
        onChange={(event) => accept(event.target.files?.[0])}
      />

      {shownError && (
        <p
          role="alert"
          className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {shownError}
        </p>
      )}
    </div>
  );
}
