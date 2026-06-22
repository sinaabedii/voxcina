"use client";

import { Check } from "lucide-react";

interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = currentStep > stepNumber;
        const isCurrent = currentStep === stepNumber;
        
        return (
          <div key={index} className="contents">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  isCompleted || isCurrent
                    ? 'bg-voxcina-blue text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{stepNumber.toLocaleString('fa-IR')}</span>
                )}
              </div>
              <span
                className={`text-sm ${
                  isCurrent ? 'text-gray-900 font-medium' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 rounded transition-all duration-300 ${
                  currentStep > stepNumber ? 'bg-voxcina-blue' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
