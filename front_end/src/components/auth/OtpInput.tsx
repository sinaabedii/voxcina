"use client";

import Input from "@/components/ui/input";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  maxLength?: number;
}

// Convert Persian digits to English
const persianToEnglishDigits = (str: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), i.toString());
  }
  return result;
};

export default function OtpInput({
  value,
  onChange,
  error,
  label = "کد تأیید ارسال شده را وارد کنید",
  maxLength = 5,
}: OtpInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Only allow digits (Persian or English)
    if (/^[0-9۰-۹]*$/.test(newValue) && newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-3">
        {label}
      </label>
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        error={error}
        maxLength={maxLength}
        placeholder="— — — — —"
        autoComplete="one-time-code"
        dir="ltr"
        className="text-center tracking-[0.75em] text-xl font-semibold"
      />
    </div>
  );
}

export { persianToEnglishDigits };
