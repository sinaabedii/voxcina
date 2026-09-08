"use client";

import { useMemo } from "react";
import { getPasswordStrength, getPasswordStrengthColor } from "@/lib/validation/password";

export function usePasswordStrength(password: string) {
  const result = useMemo(() => getPasswordStrength(password), [password]);
  const colorClass = useMemo(() => getPasswordStrengthColor(result.strength), [result.strength]);
  return { ...result, colorClass };
}
