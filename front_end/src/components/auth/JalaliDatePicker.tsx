"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { CalendarDays, ChevronRight, ChevronLeft, X } from "lucide-react";

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

const PERSIAN_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

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

function div(a: number, b: number): number {
  return Math.floor(a / b);
}
function mod(a: number, b: number): number {
  return a - Math.floor(a / b) * b;
}

// Gregorian -> Jalali. Standard conversion used across Persian web tooling.
function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy <= 1600) { jy = 0; gy -= 621; } else { jy = 979; gy -= 1600; }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * div(days, 12053);
  days = mod(days, 12053);
  jy += 4 * div(days, 1461);
  days = mod(days, 1461);
  if (days > 365) {
    jy += div(days - 1, 365);
    days = mod(days - 1, 365);
  }
  let jm: number, jd: number;
  if (days < 186) {
    jm = 1 + div(days, 31);
    jd = 1 + mod(days, 31);
  } else {
    jm = 7 + div(days - 186, 30);
    jd = 1 + mod(days - 186, 30);
  }
  return [jy, jm, jd];
}

// Jalali -> Gregorian, used only to derive the weekday of a given Jalali day.
function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days = -355668 + 365 * jy + div(jy, 33) * 8 + div(mod(jy, 33) + 3, 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days = mod(days, 146097);
  if (days > 36524) {
    days--;
    gy += 100 * div(days, 36524);
    days = mod(days, 36524);
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days = mod(days, 1461);
  if (days > 365) {
    gy += div(days - 1, 365);
    days = mod(days - 1, 365);
  }
  let gd = days + 1;
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (; gm <= 12; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

// Column index (0 = Saturday .. 6 = Friday) of the 1st day of a Jalali month.
function firstWeekdayOffset(jy: number, jm: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
  const jsWeekday = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay(); // 0 = Sun .. 6 = Sat
  return (jsWeekday + 1) % 7;
}

const TODAY = (() => {
  const now = new Date();
  const [y, m, d] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { year: y, month: m, day: d };
})();

const MIN_YEAR = 1320;
const MAX_YEAR = TODAY.year;

type ViewMode = "days" | "months" | "years";

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

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("days");
  const [viewYear, setViewYear] = useState(parsed.year || TODAY.year);
  const [viewMonth, setViewMonth] = useState(parsed.month || TODAY.month);
  const [draft, setDraft] = useState(parsed);
  const yearListRef = useRef<HTMLDivElement>(null);

  const open = () => {
    setDraft(parsed);
    setViewYear(parsed.year || TODAY.year);
    setViewMonth(parsed.month || TODAY.month);
    setView("days");
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && view === "years" && yearListRef.current) {
      const el = yearListRef.current.querySelector('[data-active="true"]');
      el?.scrollIntoView({ block: "center" });
    }
  }, [isOpen, view]);

  const isAtMaxMonth = viewYear === MAX_YEAR && viewMonth === TODAY.month;
  const isAtMinMonth = viewYear === MIN_YEAR && viewMonth === 1;

  const goPrevMonth = () => {
    if (isAtMinMonth) return;
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewYear > MAX_YEAR || isAtMaxMonth) return;
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = useMemo(() => getJalaliMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const leadingBlanks = useMemo(() => firstWeekdayOffset(viewYear, viewMonth), [viewYear, viewMonth]);
  // Always pad the grid out to 6 full weeks (42 cells) so the calendar body
  // is the same height in every month instead of shrinking/growing the modal.
  const trailingBlanks = useMemo(() => 42 - leadingBlanks - daysInMonth, [leadingBlanks, daysInMonth]);
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = MAX_YEAR; y >= MIN_YEAR; y--) arr.push(y);
    return arr;
  }, []);

  const selectDay = (d: number) => {
    setDraft({ year: viewYear, month: viewMonth, day: d });
  };

  const selectMonth = (m: number) => {
    setViewMonth(m);
    setView("days");
  };

  const selectYear = (y: number) => {
    setViewYear(y);
    if (y === MAX_YEAR && viewMonth > TODAY.month) setViewMonth(TODAY.month);
    setView("months");
  };

  const applyDraft = () => {
    if (!draft.year || !draft.month || !draft.day) return;
    onChange(`${draft.year}-${String(draft.month).padStart(2, "0")}-${String(draft.day).padStart(2, "0")}`);
    close();
  };

  const clearDraft = () => {
    setDraft({ year: 0, month: 0, day: 0 });
    onChange("");
    close();
  };

  const displayText = useMemo(() => {
    if (!parsed.year || !parsed.month || !parsed.day) return "";
    return `${toPersianDigits(parsed.day)} ${PERSIAN_MONTHS[parsed.month - 1]} ${toPersianDigits(parsed.year)}`;
  }, [parsed]);

  const hasDraft = !!(draft.year && draft.month && draft.day);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        <span className="text-xs text-gray-400 dark:text-gray-500 font-normal mr-1">(اختیاری)</span>
      </label>

      <button
        type="button"
        id={id}
        onClick={open}
        className={`w-full flex items-center justify-between gap-2 input text-sm py-2.5 bg-white dark:bg-voxcina-blue/10 text-right ${
          error ? "ring-2 ring-red-300" : ""
        }`}
      >
        <span className={displayText ? "text-gray-800 dark:text-gray-100" : "text-muted-foreground"}>
          {displayText || "انتخاب تاریخ تولد"}
        </span>
        <CalendarDays className="w-4 h-4 shrink-0 text-voxcina-blue dark:text-voxcina-cream" />
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={close}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] bg-white dark:bg-voxcina-darkBlue rounded-3xl shadow-strong p-5 animate-scale-in"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-voxcina-blue dark:text-voxcina-cream">
                تاریخ تولد
              </div>
              <button
                type="button"
                onClick={close}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                aria-label="بستن"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={view === "days" ? goPrevMonth : () => setViewYear((y) => Math.max(MIN_YEAR, y - (view === "months" ? 1 : 12)))}
                disabled={view === "days" && isAtMinMonth}
                className="w-9 h-9 flex items-center justify-center rounded-full text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-blue/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="قبلی"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {view === "days" && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setView("months")}
                    className="px-2 py-1 rounded-lg text-sm font-semibold text-gray-800 dark:text-white hover:bg-voxcina-blue/10 transition-colors"
                  >
                    {PERSIAN_MONTHS[viewMonth - 1]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("years")}
                    className="px-2 py-1 rounded-lg text-sm font-semibold text-gray-800 dark:text-white hover:bg-voxcina-blue/10 transition-colors"
                  >
                    {toPersianDigits(viewYear)}
                  </button>
                </div>
              )}
              {view === "months" && (
                <button
                  type="button"
                  onClick={() => setView("years")}
                  className="px-2 py-1 rounded-lg text-sm font-semibold text-gray-800 dark:text-white hover:bg-voxcina-blue/10 transition-colors"
                >
                  {toPersianDigits(viewYear)}
                </button>
              )}
              {view === "years" && (
                <div className="text-sm font-semibold text-gray-800 dark:text-white">
                  انتخاب سال
                </div>
              )}

              <button
                type="button"
                onClick={view === "days" ? goNextMonth : () => setViewYear((y) => Math.min(MAX_YEAR, y + (view === "months" ? 1 : 12)))}
                disabled={view === "days" ? viewYear >= MAX_YEAR && isAtMaxMonth : viewYear >= MAX_YEAR}
                className="w-9 h-9 flex items-center justify-center rounded-full text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-blue/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="بعدی"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="h-[302px]">
              {view === "days" && (
                <>
                  <div className="grid grid-cols-7 mb-1">
                    {PERSIAN_WEEKDAYS.map((w, i) => (
                      <div key={i} className="h-8 flex items-center justify-center text-xs font-medium text-voxcina-blue/60 dark:text-voxcina-cream/60">
                        {w}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: leadingBlanks }).map((_, i) => (
                      <div key={`b${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                      const isFuture = viewYear === MAX_YEAR && viewMonth === TODAY.month && d > TODAY.day;
                      const isSelected = draft.year === viewYear && draft.month === viewMonth && draft.day === d;
                      const isToday = viewYear === TODAY.year && viewMonth === TODAY.month && d === TODAY.day;
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={isFuture}
                          onClick={() => selectDay(d)}
                          className={`relative aspect-square flex items-center justify-center rounded-full text-sm transition-colors ${
                            isFuture
                              ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                              : isSelected
                              ? "bg-voxcina-blue text-white font-semibold shadow-medium"
                              : isToday
                              ? "text-voxcina-blue dark:text-voxcina-cream font-semibold ring-1 ring-voxcina-blue/40"
                              : "text-gray-700 dark:text-gray-200 hover:bg-voxcina-blue/10"
                          }`}
                        >
                          {toPersianDigits(d)}
                          {isToday && !isSelected && (
                            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-voxcina-blue dark:bg-voxcina-cream" />
                          )}
                        </button>
                      );
                    })}
                    {Array.from({ length: trailingBlanks }).map((_, i) => (
                      <div key={`t${i}`} />
                    ))}
                  </div>
                </>
              )}

              {view === "months" && (
                <div className="h-full grid grid-cols-3 content-center gap-2">
                  {PERSIAN_MONTHS.map((name, i) => {
                    const m = i + 1;
                    const isFuture = viewYear === MAX_YEAR && m > TODAY.month;
                    const isSelected = draft.year === viewYear && draft.month === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={isFuture}
                        onClick={() => selectMonth(m)}
                        className={`py-2.5 rounded-xl text-sm transition-colors ${
                          isFuture
                            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            : isSelected
                            ? "bg-voxcina-blue text-white font-semibold shadow-medium"
                            : viewMonth === m
                            ? "text-voxcina-blue dark:text-voxcina-cream font-semibold ring-1 ring-voxcina-blue/40"
                            : "text-gray-700 dark:text-gray-200 hover:bg-voxcina-blue/10"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}

              {view === "years" && (
                <div ref={yearListRef} className="h-full grid grid-cols-3 gap-2 auto-rows-min overflow-y-auto scrollbar-thin pr-1">
                  {years.map((y) => {
                    const isSelected = draft.year === y;
                    return (
                      <button
                        key={y}
                        type="button"
                        data-active={y === viewYear}
                        onClick={() => selectYear(y)}
                        className={`py-2.5 rounded-xl text-sm transition-colors ${
                          isSelected
                            ? "bg-voxcina-blue text-white font-semibold shadow-medium"
                            : viewYear === y
                            ? "text-voxcina-blue dark:text-voxcina-cream font-semibold ring-1 ring-voxcina-blue/40"
                            : "text-gray-700 dark:text-gray-200 hover:bg-voxcina-blue/10"
                        }`}
                      >
                        {toPersianDigits(y)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-5">
              {hasDraft && (
                <button
                  type="button"
                  onClick={clearDraft}
                  className="px-4 h-11 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  پاک کردن
                </button>
              )}
              <button
                type="button"
                onClick={applyDraft}
                disabled={!hasDraft}
                className="flex-1 h-11 rounded-xl bg-voxcina-blue text-white text-sm font-semibold hover:bg-voxcina-darkBlue disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-medium"
              >
                تأیید
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
