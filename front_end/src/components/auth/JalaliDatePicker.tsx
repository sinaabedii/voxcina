"use client";

import { useState, useMemo } from "react";
import { CalendarDays } from "lucide-react";

interface JalaliDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  id?: string;
}

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند",
];

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toPersianDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d)]);
}

function isJalaliLeapYear(year: number): boolean {
  const cycle = year > 0 ? (year - 474) % 2820 + 474 : year;
  return ((cycle + 38) * 682) % 2816 < 682;
}

function getJalaliMonthDays(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

const CURRENT_JALALI_YEAR = 1405;
const MIN_YEAR = 1320;
const MAX_YEAR = CURRENT_JALALI_YEAR;

export default function JalaliDatePicker({
  value,
  onChange,
  error,
  label = "تاریخ تولد",
  id = "birthday",
}: JalaliDatePickerProps) {
  const parsed = useMemo(() => {
    if (!value) return { year: 0, month: 0, day: 0 };
    const parts = value.split("-");
    if (parts.length !== 3) return { year: 0, month: 0, day: 0 };
    return {
      year: parseInt(parts[0]) || 0,
      month: parseInt(parts[1]) || 0,
      day: parseInt(parts[2]) || 0,
    };
  }, [value]);

  const [year, setYear] = useState(parsed.year);
  const [month, setMonth] = useState(parsed.month);
  const [day, setDay] = useState(parsed.day);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = MAX_YEAR; y >= MIN_YEAR; y--) arr.push(y);
    return arr;
  }, []);

  const months = useMemo(() => {
    return PERSIAN_MONTHS.map((name, i) => ({ value: i + 1, name }));
  }, []);

  const maxDay = useMemo(() => {
    if (!year || !month) return 31;
    return getJalaliMonthDays(year, month);
  }, [year, month]);

  const days = useMemo(() => {
    const arr: number[] = [];
    for (let d = 1; d <= maxDay; d++) arr.push(d);
    return arr;
  }, [maxDay]);

  const handleYearChange = (y: number) => {
    setYear(y);
    if (y && month && day) {
      const newMaxDay = getJalaliMonthDays(y, month);
      const adjustedDay = day > newMaxDay ? newMaxDay : day;
      setDay(adjustedDay);
      onChange(`${y}-${String(month).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const handleMonthChange = (m: number) => {
    setMonth(m);
    if (year && m && day) {
      const newMaxDay = getJalaliMonthDays(year, m);
      const adjustedDay = day > newMaxDay ? newMaxDay : day;
      setDay(adjustedDay);
      onChange(`${year}-${String(m).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const handleDayChange = (d: number) => {
    setDay(d);
    if (year && month && d) {
      onChange(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const displayText = useMemo(() => {
    if (!year || !month || !day) return "";
    return `${toPersianDigits(day)} ${PERSIAN_MONTHS[month - 1]} ${toPersianDigits(year)}`;
  }, [year, month, day]);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        <span className="text-xs text-gray-400 dark:text-gray-500 font-normal mr-1">(اختیاری)</span>
      </label>

      <div className={`flex gap-2 direction-ltr ${error ? "ring-2 ring-red-300 rounded-xl" : ""}`}>
        <select
          value={day || ""}
          onChange={(e) => handleDayChange(parseInt(e.target.value))}
          className="flex-1 input text-center text-sm py-2.5 bg-white dark:bg-voxcina-blue/10"
          disabled={!year || !month}
        >
          <option value="">روز</option>
          {days.map((d) => (
            <option key={d} value={d}>{toPersianDigits(d)}</option>
          ))}
        </select>

        <select
          value={month || ""}
          onChange={(e) => handleMonthChange(parseInt(e.target.value))}
          className="flex-1 input text-center text-sm py-2.5 bg-white dark:bg-voxcina-blue/10"
          disabled={!year}
        >
          <option value="">ماه</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.name}</option>
          ))}
        </select>

        <select
          value={year || ""}
          onChange={(e) => handleYearChange(parseInt(e.target.value))}
          className="flex-1 input text-center text-sm py-2.5 bg-white dark:bg-voxcina-blue/10"
        >
          <option value="">سال</option>
          {years.map((y) => (
            <option key={y} value={y}>{toPersianDigits(y)}</option>
          ))}
        </select>
      </div>

      {displayText && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{displayText}</span>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
