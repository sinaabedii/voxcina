"use client";

import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface ConfirmRemoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  willInvalidate: boolean;
  voucherCode?: string;
}

export default function ConfirmRemoveModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  willInvalidate,
  voucherCode,
}: ConfirmRemoveModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      closeOnOverlayClick={false}
      contentClassName="max-w-sm"
    >
      <div className="text-center">
        {willInvalidate ? (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
              حذف محصول و غیرفعال‌سازی تخفیف
            </h3>
            <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
              با حذف{" "}
              <span className="font-semibold text-voxcina-blue dark:text-voxcina-cream">
                {productName}
              </span>
              {voucherCode && (
                <>
                  {" "}، کد تخفیف{" "}
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {voucherCode}
                  </span>{" "}
                  غیرفعال خواهد شد
                </>
              )}
              . آیا مطمئن هستید؟
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-base font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
              حذف محصول
            </h3>
            <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
              آیا از حذف{" "}
              <span className="font-semibold text-voxcina-blue dark:text-voxcina-cream">
                {productName}
              </span>{" "}
              مطمئن هستید؟
            </p>
          </>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-secondary-400 dark:border-voxcina-blue/30 text-sm font-medium text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:bg-voxcina-blue/[0.04] dark:hover:bg-voxcina-cream/[0.04] transition-colors"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${
              willInvalidate
                ? "bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
                : "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
            }`}
          >
            بله، حذف شود
          </button>
        </div>
      </div>
    </Modal>
  );
}
