"use client";

import {
  Clock,
  MessageSquare,
  Send,
  RefreshCw,
  Truck,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Order } from "@/types/order";
import { CopyButton, getStatusMeta, formatTimelineDate } from "./order-detail-utils";

interface OrderTimelineAndNotesProps {
  order: Order;
  trackingCode: string;
  setTrackingCode: (code: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  showStatusConfirm: boolean;
  setShowStatusConfirm: (show: boolean) => void;
  isUpdatingStatus: boolean;
  onStatusUpdate: () => Promise<void>;
  onTrackingUpdate: () => Promise<void>;
  newNote: string;
  setNewNote: (note: string) => void;
  isAddingNote: boolean;
  onAddNote: () => Promise<void>;
}

export function OrderTimelineAndNotes({
  order,
  trackingCode,
  setTrackingCode,
  selectedStatus,
  setSelectedStatus,
  showStatusConfirm,
  setShowStatusConfirm,
  isUpdatingStatus,
  onStatusUpdate,
  onTrackingUpdate,
  newNote,
  setNewNote,
  isAddingNote,
  onAddNote,
}: OrderTimelineAndNotesProps) {
  return (
    <>
      {/* 1. Postal Tracking Code Card */}
      <div className="rounded-3xl border border-voxcina-cream/70 dark:border-white/10 bg-white/90 dark:bg-voxcina-blue/20 p-5 space-y-4 shadow-xs print:hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-voxcina-cream/40 dark:border-white/10">
          <div className="w-7 h-7 rounded-lg bg-voxcina-blue/10 dark:bg-white/10 flex items-center justify-center text-voxcina-blue dark:text-voxcina-cream">
            <Truck className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-voxcina-blue dark:text-voxcina-cream">
            کد رهگیری مرسوله پستی
          </h3>
        </div>

        {order.tracking_code ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-voxcina-cream/40 dark:bg-white/5 border border-voxcina-cream/70 dark:border-white/10">
              <div className="font-mono text-sm font-bold text-voxcina-blue dark:text-voxcina-cream tracking-wider" dir="ltr">
                {order.tracking_code}
              </div>
              <CopyButton text={order.tracking_code} label="کد رهگیری" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <a
                href={`https://tracking.post.ir/?id=${order.tracking_code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                <span>رهگیری در سامانه شرکت پست</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="کد ۲۴ رقمی پست یا شناسه پستکس..."
              dir="ltr"
              className="w-full rounded-2xl bg-white dark:bg-voxcina-blue/40 border border-voxcina-cream/80 dark:border-white/10 p-2.5 text-xs text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:border-voxcina-blue/60"
            />
            <Button
              onClick={onTrackingUpdate}
              disabled={isUpdatingStatus || !trackingCode.trim()}
              className="w-full rounded-xl text-xs py-2.5 font-bold"
              size="sm"
              variant="primary"
            >
              {isUpdatingStatus ? (
                <RefreshCw className="w-4 h-4 animate-spin ml-1.5" />
              ) : (
                <Truck className="w-4 h-4 ml-1.5" />
              )}
              ثبت و ذخیره کد رهگیری
            </Button>
          </div>
        )}
      </div>

      {/* 2. Order Status Transition Card */}
      <div className="rounded-3xl border border-voxcina-cream/70 dark:border-white/10 bg-white/90 dark:bg-voxcina-blue/20 p-5 space-y-4 shadow-xs print:hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-voxcina-cream/40 dark:border-white/10">
          <div className="w-7 h-7 rounded-lg bg-voxcina-blue/10 dark:bg-white/10 flex items-center justify-center text-voxcina-blue dark:text-voxcina-cream">
            <RefreshCw className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-voxcina-blue dark:text-voxcina-cream">
            تغییر وضعیت مرحله‌ای سفارش
          </h3>
        </div>

        {!showStatusConfirm ? (
          <div className="space-y-2">
            {order.status === "pending" && order.payment_status === "paid" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-500/10 justify-center py-2.5"
                onClick={() => {
                  setSelectedStatus("processing");
                  setShowStatusConfirm(true);
                }}
              >
                <CheckCircle className="w-4 h-4 ml-1.5 text-amber-600" />
                تایید سفارش و شروع پردازش
              </Button>
            )}

            {order.status === "processing" && order.payment_status === "paid" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs font-bold text-sky-700 border-sky-300 hover:bg-sky-500/10 justify-center py-2.5"
                onClick={() => {
                  setSelectedStatus("shipped");
                  setShowStatusConfirm(true);
                }}
              >
                <Truck className="w-4 h-4 ml-1.5 text-sky-600" />
                ارسال مرسوله به خریدار
              </Button>
            )}

            {order.status === "shipped" && order.payment_status === "paid" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-500/10 justify-center py-2.5"
                onClick={() => {
                  setSelectedStatus("delivered");
                  setShowStatusConfirm(true);
                }}
              >
                <CheckCircle className="w-4 h-4 ml-1.5 text-emerald-600" />
                ثبت تحویل نهایی به خریدار
              </Button>
            )}

            {order.status !== "cancelled" &&
              order.status !== "delivered" &&
              order.gateway_name !== "snappay" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 justify-center py-2.5"
                  onClick={() => {
                    setSelectedStatus("cancelled");
                    setShowStatusConfirm(true);
                  }}
                >
                  <XCircle className="w-4 h-4 ml-1.5 text-rose-600" />
                  لغو کامل سفارش
                </Button>
              )}
          </div>
        ) : (
          <div className="space-y-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/60">
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-semibold">
              آیا از تغییر وضعیت این سفارش به «{getStatusMeta(selectedStatus).label}» اطمینان دارید؟
            </p>

            {selectedStatus === "shipped" && !order.tracking_code && (
              <div className="space-y-1">
                <label className="text-[11px] text-amber-800 dark:text-amber-300 block">
                  کد رهگیری پستی (الزامی):
                </label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="کد رهگیری را وارد کنید..."
                  dir="ltr"
                  className="w-full rounded-xl bg-white dark:bg-voxcina-blue/40 border border-amber-300 dark:border-amber-700 p-2 text-xs text-voxcina-blue dark:text-voxcina-cream focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl text-xs"
                onClick={() => {
                  setShowStatusConfirm(false);
                  setSelectedStatus("");
                }}
              >
                انصراف
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="flex-1 rounded-xl text-xs font-bold"
                onClick={onStatusUpdate}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin ml-1" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 ml-1" />
                )}
                تایید تغییر وضعیت
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Vertical Order Timeline Card */}
      <div className="rounded-3xl border border-voxcina-cream/70 dark:border-white/10 bg-white/90 dark:bg-voxcina-blue/20 p-5 space-y-4 shadow-xs print:break-inside-avoid">
        <div className="flex items-center gap-2 pb-3 border-b border-voxcina-cream/40 dark:border-white/10">
          <div className="w-7 h-7 rounded-lg bg-voxcina-blue/10 dark:bg-white/10 flex items-center justify-center text-voxcina-blue dark:text-voxcina-cream">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-voxcina-blue dark:text-voxcina-cream">
            تاریخچه و رویدادهای سفارش
          </h3>
        </div>

        {order.timeline && order.timeline.length > 0 ? (
          <div className="relative pr-6 space-y-5 before:absolute before:right-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-voxcina-cream dark:before:bg-white/10">
            {order.timeline.map((entry, index) => {
              const meta = getStatusMeta(entry.status);
              const isLatest = index === order.timeline!.length - 1;

              return (
                <div key={index} className="relative">
                  <div
                    className={`absolute -right-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-2xs ${
                      isLatest ? "bg-voxcina-blue text-white" : "bg-voxcina-cream text-voxcina-blue"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isLatest ? "bg-white" : "bg-voxcina-blue"}`} />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-voxcina-cream/20 dark:bg-white/5 border border-voxcina-cream/60 dark:border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${meta.className}`}>
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-voxcina-blue/60 dark:text-voxcina-cream/60 font-mono">
                        {formatTimelineDate(entry.timestamp)}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-xs text-voxcina-blue/80 dark:text-voxcina-cream/80 leading-relaxed">
                        {entry.note}
                      </p>
                    )}
                    {entry.admin_name && (
                      <div className="text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50 pt-1">
                        ثبت شده توسط: <span className="font-medium">{entry.admin_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 py-4">
            تاریخچه‌ای برای این سفارش ثبت نشده است.
          </p>
        )}
      </div>

      {/* 4. Internal Admin Notes Card */}
      <div className="rounded-3xl border border-voxcina-cream/70 dark:border-white/10 bg-white/90 dark:bg-voxcina-blue/20 p-5 space-y-4 shadow-xs print:hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-voxcina-cream/40 dark:border-white/10">
          <div className="w-7 h-7 rounded-lg bg-voxcina-blue/10 dark:bg-white/10 flex items-center justify-center text-voxcina-blue dark:text-voxcina-cream">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-voxcina-blue dark:text-voxcina-cream">
            یادداشت‌های داخلی ادمین
          </h3>
        </div>

        {order.notes && order.notes.length > 0 ? (
          <div className="space-y-2.5">
            {order.notes.map((note, idx) => (
              <div
                key={note.id || idx}
                className="p-3.5 rounded-2xl bg-voxcina-cream/30 dark:bg-white/5 border border-voxcina-cream/60 dark:border-white/5 space-y-1.5"
              >
                <p className="text-xs text-voxcina-blue dark:text-voxcina-cream leading-relaxed">
                  {note.content}
                </p>
                <div className="flex items-center justify-between text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50 pt-1 border-t border-voxcina-cream/30 dark:border-white/5">
                  <span>ثبت شده توسط {note.admin_name}</span>
                  <span>{note.jalali_created_at || formatTimelineDate(note.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 py-2">
            هنوز یادداشت داخلی برای این سفارش درج نشده است.
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="افزودن یادداشت جدید برای بررسی تیم پشتیبانی یا انبار..."
            rows={2}
            className="flex-grow rounded-2xl bg-white dark:bg-voxcina-blue/40 border border-voxcina-cream/80 dark:border-white/10 p-3 text-xs text-voxcina-blue dark:text-voxcina-cream placeholder-voxcina-blue/40 dark:placeholder-voxcina-cream/40 focus:outline-none focus:border-voxcina-blue/60 resize-none shadow-2xs"
          />
          <Button
            onClick={onAddNote}
            disabled={isAddingNote || !newNote.trim()}
            className="self-end rounded-xl py-3 px-4"
            size="sm"
            variant="primary"
          >
            {isAddingNote ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
