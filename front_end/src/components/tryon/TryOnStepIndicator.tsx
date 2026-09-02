"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TryOnStep {
  label: string;
  done: boolean;
}

interface TryOnStepIndicatorProps {
  steps: TryOnStep[];
}

/** Upload → pick a garment → chat with Voxa, with the first unfinished step lit. */
export default function TryOnStepIndicator({ steps }: TryOnStepIndicatorProps) {
  const currentStep = steps.findIndex((step) => !step.done);

  return (
    <div className="flex items-center gap-1 md:gap-2 mb-3 md:mb-4 flex-shrink-0">
      {steps.map((step, idx) => {
        const highlighted = step.done || idx === currentStep;
        return (
          <div key={step.label} className="flex items-center gap-1 md:gap-2">
            {idx > 0 && (
              <div className={cn(
                "w-4 md:w-8 h-0.5 rounded-full transition-colors",
                step.done ? "bg-voxcina-blue/15" : idx === currentStep ? "bg-voxcina-blue/30" : "bg-secondary-300/50 dark:bg-voxcina-blue/20"
              )} />
            )}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                highlighted
                  ? "bg-voxcina-blue text-voxcina-cream shadow-inset-button"
                  : "bg-voxcina-blue/10 dark:bg-voxcina-blue/20 text-voxcina-blue/40 dark:text-voxcina-cream/40",
                !step.done && idx === currentStep && "animate-pulse-soft"
              )}>
                {step.done ? <Check className="h-3 w-3" /> : idx + 1}
              </div>
              <span className={cn(
                "text-[10px] md:text-xs transition-colors hidden sm:inline",
                highlighted
                  ? "text-voxcina-blue dark:text-voxcina-cream font-medium"
                  : "text-voxcina-blue/40 dark:text-voxcina-cream/40"
              )}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
