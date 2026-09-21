"use client";

import { Bell } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

interface StockNotifyModalProps {
  isOpen: boolean;
  productName: string;
  selectedSize?: string;
  onClose: () => void;
  onSubmit: () => void;
}

const FIELD_CLASS =
  "w-full rounded-xl border border-border/30 bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/**
 * Back-in-stock request form.
 *
 * Note: submitting only flips the button state — there is no endpoint behind
 * this yet, which is how it has always behaved here.
 */
export default function StockNotifyModal({
  isOpen,
  productName,
  selectedSize,
  onClose,
  onSubmit,
}: StockNotifyModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="اطلاع از موجود شدن کالا">
      <div className="mb-4 text-center">
        <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/50 text-primary shadow-soft">
          <Bell className="h-8 w-8" />
        </span>
        <p className="text-sm text-muted-foreground">
          به محض موجود شدن {productName} به شما اطلاع می‌دهیم.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="notify-email" className="mb-1 block text-sm font-medium text-foreground">
            ایمیل
          </label>
          <input id="notify-email" type="email" className={FIELD_CLASS} placeholder="ایمیل خود را وارد کنید" />
        </div>
        <div>
          <label htmlFor="notify-phone" className="mb-1 block text-sm font-medium text-foreground">
            شماره موبایل
          </label>
          <input id="notify-phone" type="tel" className={FIELD_CLASS} placeholder="شماره موبایل خود را وارد کنید" />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
          <input type="checkbox" className="h-4 w-4 rounded border-border/30" />
          فقط در صورت موجود شدن سایز {selectedSize || "انتخاب‌شده"} خبرم کن
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          انصراف
        </Button>
        <Button variant="primary" onClick={onSubmit}>
          ثبت درخواست
        </Button>
      </div>
    </Modal>
  );
}
