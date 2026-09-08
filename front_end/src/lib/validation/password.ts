export interface PasswordStrength {
  strength: number; // 0-100
  text: string;
  color: string; // tailwind bg class
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { strength: 0, text: "", color: "bg-secondary-200 dark:bg-voxcina-darkBlue/30" };
  }

  const criteria = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  const met = criteria.filter(Boolean).length;

  if (met <= 1) return { strength: 20, text: "ضعیف", color: "bg-red-500" };
  if (met === 2) return { strength: 40, text: "متوسط", color: "bg-orange-500" };
  if (met === 3) return { strength: 60, text: "خوب", color: "bg-yellow-500" };
  if (met === 4) return { strength: 80, text: "قوی", color: "bg-green-500" };
  return { strength: 100, text: "عالی", color: "bg-green-600" };
}

export function getPasswordStrengthColor(strength: number): string {
  if (strength < 40) return "text-red-500";
  if (strength < 60) return "text-orange-500";
  if (strength < 80) return "text-yellow-500";
  return "text-green-500";
}
