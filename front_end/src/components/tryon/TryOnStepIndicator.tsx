"use client";

import { Check, Camera, Shirt, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TryOnStep {
  label: string;
  done: boolean;
}

interface TryOnStepIndicatorProps {
  steps: TryOnStep[];
}

const STEP_ICONS = [Camera, Shirt, Sparkles];

export default function TryOnStepIndicator({ steps }: TryOnStepIndicatorProps) {
  const currentStep = steps.findIndex((step) => !step.done);
  const activeIndex = currentStep === -1 ? steps.length - 1 : currentStep;

  return (
    <div className="flex-shrink-0 mb-3 md:mb-4 bg-background/80 dark:bg-voxcina-blue/10 border border-secondary-300 dark:border-voxcina-blue/25 rounded-2xl p-2 sm:p-2.5 shadow-soft">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {steps.map((step, idx) => {
          const isDone = step.done;
          const isActive = idx === activeIndex && !isDone;
          const StepIcon = STEP_ICONS[idx] || Sparkles;

          return (
            <div key={step.label} className="flex-1 flex items-center min-w-0">
              <div
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 py-1 px-2 rounded-xl transition-all duration-200 w-full",
                  isActive
                    ? "bg-voxcina-blue/10 dark:bg-voxcina-cream/10"
                    : isDone
                    ? "bg-emerald-500/5 dark:bg-emerald-400/5"
                    : "opacity-60"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0",
                    isDone
                      ? "bg-emerald-500 text-white shadow-soft"
                      : isActive
                      ? "bg-voxcina-blue text-voxcina-cream dark:bg-voxcina-cream dark:text-voxcina-blue shadow-inset-button animate-pulse-soft"
                      : "bg-secondary-300/60 dark:bg-voxcina-blue/30 text-voxcina-blue/50 dark:text-voxcina-cream/50"
                  )}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40 hidden sm:inline">
                      گام {idx + 1}:
                    </span>
                    <span
                      className={cn(
                        "text-xs truncate font-medium transition-colors",
                        isActive
                          ? "text-voxcina-blue dark:text-voxcina-cream font-bold"
                          : isDone
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-voxcina-blue/50 dark:text-voxcina-cream/50"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "w-3 sm:w-6 h-0.5 mx-1 rounded-full transition-colors flex-shrink-0",
                    steps[idx].done
                      ? "bg-emerald-500/50"
                      : "bg-secondary-300 dark:bg-voxcina-blue/30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
