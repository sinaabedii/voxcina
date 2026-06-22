"use client";

import Input from "@/components/ui/input";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  id?: string;
}

// IR phone number validation regex: 09xxxxxxxxx (11 digits starting with 09)
const irPhoneRegex = /^09[0-9]{9}$/;
const irPhoneRegexPersian = /^[۰0][۹9][۰-۹0-9]{9}$/;

// Convert Persian digits to English
const persianToEnglishDigits = (str: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), i.toString());
  }
  return result;
};

// Validate phone number
const validatePhone = (phone: string): string | undefined => {
  const normalizedPhone = persianToEnglishDigits(phone);
  
  if (!phone.trim()) {
    return "شماره تلفن الزامی است";
  }
  
  if (!irPhoneRegexPersian.test(phone) && !irPhoneRegex.test(normalizedPhone)) {
    return "شماره تلفن نامعتبر است (فرمت: 09xxxxxxxxx)";
  }
  
  return undefined;
};

export default function PhoneInput({
  value,
  onChange,
  error,
  label = "شماره موبایل",
  id = "phone",
}: PhoneInputProps) {
  return (
    <Input
      label={label}
      type="tel"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      autoComplete="tel"
      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
      dir="ltr"
      className="text-left"
    />
  );
}

export { persianToEnglishDigits, validatePhone, irPhoneRegex, irPhoneRegexPersian };
