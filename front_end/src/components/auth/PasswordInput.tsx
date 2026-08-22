"use client";

import { useState } from "react";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import Input from "@/components/ui/input";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  id?: string;
  placeholder?: string;
  showStrength?: boolean;
  showValidTick?: boolean;
  validMessage?: string;
  autoComplete?: string;
}

const validatePassword = (password: string): string | undefined => {
  if (!password) {
    return "رمز عبور الزامی است";
  }
  if (password.length < 6) {
    return "رمز عبور باید حداقل ۶ کاراکتر باشد";
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
  showValidTick = false,
  validMessage,
  autoComplete = "current-password",
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isValid = !validatePassword(value);

  return (
    <div>
      <Input
        label={label}
        type={showPassword ? "text" : "password"}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        leftElement={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        }
        rightElement={
          showValidTick && isValid ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : undefined
        }
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {/* Valid message */}
      {showValidTick && isValid && validMessage && (
        <p className="text-xs text-green-600 mt-1">{validMessage}</p>
      )}
    </div>
  );
}

export { validatePassword };
