"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input from "@/components/ui/input";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  id?: string;
  placeholder?: string;
  showStrength?: boolean;
  autoComplete?: string;
}

// Get password strength
const getPasswordStrength = (password: string) => {
  if (!password) return { strength: 0, label: "", color: "" };
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  if (strength <= 2) return { strength: 1, label: "ضعیف", color: "bg-red-500" };
  if (strength <= 3) return { strength: 2, label: "متوسط", color: "bg-yellow-500" };
  return { strength: 3, label: "قوی", color: "bg-green-500" };
};

// Validate password
const validatePassword = (password: string): string | undefined => {
  if (!password) {
    return "رمز عبور الزامی است";
  }
  if (password.length < 8) {
    return "رمز عبور باید حداقل ۸ کاراکتر باشد";
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return "رمز عبور باید شامل حروف کوچک، بزرگ و عدد باشد";
  }
  return undefined;
};

export default function PasswordInput({
  value,
  onChange,
  error,
  label = "رمز عبور",
  id = "password",
  placeholder = "رمز عبور خود را وارد کنید",
  showStrength = false,
  autoComplete = "current-password",
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordStrength = getPasswordStrength(value);

  return (
    <div>
      <Input
        label={label}
        type={showPassword ? "text" : "password"}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        }
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {/* Password strength indicator */}
      {showStrength && value && (
        <div className="mt-2">
          <div className="flex gap-1 mb-1">
            {[1, 2, 3].map((level) => (
              <div
                key={level}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  level <= passwordStrength.strength 
                    ? passwordStrength.color 
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500">
            قدرت رمز: <span className="font-medium">{passwordStrength.label}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export { getPasswordStrength, validatePassword };
