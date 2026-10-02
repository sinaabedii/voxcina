"use client";

import { User, MapPin, ExternalLink } from "lucide-react";
import { Order } from "@/types/order";
import { CopyButton } from "./order-detail-utils";

interface OrderCustomerInfoCardProps {
  order: Order;
}

export function OrderCustomerInfoCard({ order }: OrderCustomerInfoCardProps) {
  const shippingAddress = order.shipping_address || {};

  const customerName = (() => {
    const first = order.user_first_name || "";
    const last = order.user_last_name || "";
    const combined = `${first} ${last}`.trim();
    return combined || order.user_name || "بدون نام ثبت شده";
  })();

  const recipientName = `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim() || "نامشخص";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Registered User Profile Card */}
      <div className="rounded-3xl border border-voxcina-cream/70 dark:border-white/10 bg-white/90 dark:bg-voxcina-blue/20 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-voxcina-cream/40 dark:border-white/10">
          <div className="w-7 h-7 rounded-lg bg-voxcina-blue/10 dark:bg-white/10 flex items-center justify-center text-voxcina-blue dark:text-voxcina-cream">
            <User className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-voxcina-blue dark:text-voxcina-cream">
            حساب کاربری خریدار
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 block mb-0.5">
              نام صاحب حساب
            </span>
            <p className="font-bold text-sm text-voxcina-blue dark:text-voxcina-cream">
              {customerName}
            </p>
          </div>

          <div>
            <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 block mb-0.5">
              شماره تماس حساب
            </span>
            <div className="flex items-center gap-1 font-mono font-medium text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
              <span>{order.user_phone || "ثبت نشده"}</span>
              {order.user_phone && (
                <CopyButton text={order.user_phone} label="شماره تماس حساب" />
              )}
            </div>
          </div>

          {order.user_id && (
            <div>
              <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 block mb-0.5">
                شناسه کاربری (User ID)
              </span>
              <div className="flex items-center gap-1 font-mono text-[11px] text-voxcina-blue/70 dark:text-voxcina-cream/70" dir="ltr">
                <span>{order.user_id}</span>
                <CopyButton text={order.user_id} label="شناسه کاربر" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shipping & Recipient Card */}
      <div className="rounded-3xl border border-voxcina-cream/70 dark:border-white/10 bg-white/90 dark:bg-voxcina-blue/20 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-voxcina-cream/40 dark:border-white/10">
          <div className="w-7 h-7 rounded-lg bg-voxcina-blue/10 dark:bg-white/10 flex items-center justify-center text-voxcina-blue dark:text-voxcina-cream">
            <MapPin className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-voxcina-blue dark:text-voxcina-cream">
            تحویل‌گیرنده و نشانی پستی
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 block mb-0.5">
                نام تحویل‌گیرنده
              </span>
              <p className="font-bold text-sm text-voxcina-blue dark:text-voxcina-cream">
                {recipientName}
              </p>
            </div>
            <div>
              <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 block mb-0.5">
                تلفن گیرنده
              </span>
              <div className="flex items-center gap-1 font-mono font-medium text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
                <span>{shippingAddress.phone_number || "ثبت نشده"}</span>
                {shippingAddress.phone_number && (
                  <CopyButton text={shippingAddress.phone_number} label="تلفن گیرنده" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-voxcina-cream/30 dark:border-white/5">
            <div>
              <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 block mb-0.5">استان و شهر</span>
              <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                {shippingAddress.province || shippingAddress.state || "-"} / {shippingAddress.city || "-"}
              </p>
            </div>
            <div>
              <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 block mb-0.5">کد پستی</span>
              <div className="flex items-center gap-1 font-mono font-medium text-voxcina-blue dark:text-voxcina-cream" dir="ltr">
                <span>{shippingAddress.postal_code || "-"}</span>
                {shippingAddress.postal_code && (
                  <CopyButton text={shippingAddress.postal_code} label="کد پستی" />
                )}
              </div>
            </div>
          </div>

          <div>
            <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60 block mb-0.5">نشانی پستی دقیق</span>
            <p className="font-medium text-voxcina-blue dark:text-voxcina-cream leading-relaxed">
              {shippingAddress.address || shippingAddress.street || "نشانی ثبت نشده است"}
            </p>
          </div>

          {shippingAddress.latitude && shippingAddress.longitude ? (
            <div className="pt-1">
              <a
                href={`https://maps.google.com/?q=${shippingAddress.latitude},${shippingAddress.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>مشاهده موقعیت مکانی روی نقشه</span>
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
