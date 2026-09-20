"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import Input from "./input";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  icon?: React.ReactNode;
}

export default function PasswordInput({ label, icon, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      label={label}
      type={visible ? "text" : "password"}
      leftElement={icon ?? <Lock className="h-4 w-4 text-voxcina-blue/60 dark:text-voxcina-cream/60" />}
      rightElement={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
          className="text-voxcina-blue/60 transition-colors hover:text-voxcina-blue dark:text-voxcina-cream/60 dark:hover:text-voxcina-cream"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  );
}
