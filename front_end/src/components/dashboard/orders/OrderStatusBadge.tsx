"use client";

import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Package,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/order-utils";

type BadgeSize = "xs" | "sm" | "md";

const SIZES: Record<BadgeSize, { wrapper: string; icon: string }> = {
  xs: { wrapper: "gap-1 px-1.5 py-0.5 text-[10px]", icon: "h-3 w-3" },
  sm: { wrapper: "gap-1 px-2 py-0.5 text-[11px]", icon: "h-3.5 w-3.5" },
  md: { wrapper: "gap-1.5 px-2.5 py-1 text-xs", icon: "h-4 w-4" },
};

const TONES = {
  success: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  neutral: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
} as const;

type Tone = keyof typeof TONES;

const ORDER_STATUS_TONES: Record<string, Tone> = {
  pending: "warning",
  processing: "sky",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
};

const PAYMENT_STATUS_TONES: Record<string, Tone> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  cancelled: "danger",
  refunded: "danger",
  abandoned: "neutral",
  expired: "neutral",
};

function orderStatusIcon(status: string, iconClassName: string): ReactNode {
  switch (status) {
    case "pending":
      return <Clock className={iconClassName} />;
    case "processing":
      return <CheckCircle className={iconClassName} />;
    case "shipped":
      return <Truck className={iconClassName} />;
    case "cancelled":
    case "refunded":
      return <AlertCircle className={iconClassName} />;
    default:
      return <Package className={iconClassName} />;
  }
}

function paymentStatusIcon(status: string, iconClassName: string): ReactNode {
  switch (status) {
    case "paid":
      return <CreditCard className={iconClassName} />;
    case "pending":
      return <Clock className={iconClassName} />;
    default:
      return <AlertCircle className={iconClassName} />;
  }
}

interface StatusBadgeProps {
  label: string;
  tone: Tone;
  icon: ReactNode;
  size: BadgeSize;
  className?: string;
}

function StatusBadge({ label, tone, icon, size, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        TONES[tone],
        SIZES[size].wrapper,
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

interface OrderStatusBadgeProps {
  status: string;
  /** Localized override, e.g. `order.status_text` from the API. */
  label?: string;
  size?: BadgeSize;
  className?: string;
}

/** Single source of truth for how an order status is colored and labelled. */
export function OrderStatusBadge({ status, label, size = "md", className }: OrderStatusBadgeProps) {
  return (
    <StatusBadge
      label={label || ORDER_STATUS_LABELS[status] || status}
      tone={ORDER_STATUS_TONES[status] ?? "neutral"}
      icon={orderStatusIcon(status, SIZES[size].icon)}
      size={size}
      className={className}
    />
  );
}

interface PaymentStatusBadgeProps {
  status: string;
  size?: BadgeSize;
  className?: string;
}

export function PaymentStatusBadge({ status, size = "md", className }: PaymentStatusBadgeProps) {
  return (
    <StatusBadge
      label={PAYMENT_STATUS_LABELS[status] || status}
      tone={PAYMENT_STATUS_TONES[status] ?? "neutral"}
      icon={paymentStatusIcon(status, SIZES[size].icon)}
      size={size}
      className={className}
    />
  );
}
