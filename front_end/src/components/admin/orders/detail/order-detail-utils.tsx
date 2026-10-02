"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  AlertCircle,
  LucideIcon,
} from "lucide-react";
import { toast } from "react-toastify";

/**
 * Reusable 1-click copy button with visual checkmark feedback and toast.
 */
export function CopyButton({
  text,
  label = "مقدار",
  className = "",
}: {
  text?: string | number | null;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!text) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(text));
    setCopied(true);
    toast.success(`${label} کپی شد`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`کپی ${label}`}
      className={`inline-flex items-center justify-center p-1.5 rounded-lg text-voxcina-blue/60 hover:text-voxcina-blue hover:bg-voxcina-cream/40 dark:text-voxcina-cream/60 dark:hover:text-voxcina-cream dark:hover:bg-white/10 transition-colors ${className}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export interface StatusMeta {
  label: string;
  className: string;
  dot: string;
}

/**
 * Maps order status to boutique tone, label, and indicator dot.
 */
export const getStatusMeta = (status: string): StatusMeta => {
  switch (status) {
    case "delivered":
      return {
        label: "تحویل شده",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-500",
      };
    case "shipped":
      return {
        label: "ارسال شده",
        className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30",
        dot: "bg-sky-500",
      };
    case "processing":
      return {
        label: "در حال پردازش",
        className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
        dot: "bg-indigo-500 animate-pulse",
      };
    case "pending":
      return {
        label: "در انتظار پرداخت / تایید",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
        dot: "bg-amber-500 animate-pulse",
      };
    case "cancelled":
      return {
        label: "لغو شده",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
        dot: "bg-rose-500",
      };
    case "refunded":
      return {
        label: "مرجوع شده / استرداد",
        className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
        dot: "bg-purple-500",
      };
    default:
      return {
        label: status || "نامشخص",
        className: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30",
        dot: "bg-slate-400",
      };
  }
};

export interface PaymentStatusMeta {
  label: string;
  className: string;
  icon: LucideIcon;
}

/**
 * Maps payment status to boutique badge style.
 */
export const getPaymentStatusMeta = (status: string): PaymentStatusMeta => {
  switch (status) {
    case "paid":
      return {
        label: "پرداخت موفق",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        icon: CheckCircle,
      };
    case "pending":
      return {
        label: "در انتظار پرداخت",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
        icon: Clock,
      };
    case "failed":
      return {
        label: "پرداخت ناموفق",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
        icon: XCircle,
      };
    case "refunded":
      return {
        label: "استرداد وجه",
        className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
        icon: RotateCcw,
      };
    case "abandoned":
    case "expired":
      return {
        label: "منقضی / ناتمام",
        className: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30",
        icon: AlertCircle,
      };
    case "cancelled":
      return {
        label: "لغو شده",
        className: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30",
        icon: XCircle,
      };
    default:
      return {
        label: status || "نامشخص",
        className: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30",
        icon: AlertCircle,
      };
  }
};

/**
 * Formats ISO timestamp to Persian date and time.
 */
export function formatTimelineDate(timestamp: string): string {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
}
