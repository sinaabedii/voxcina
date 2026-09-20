"use client";

import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "تایید",
  cancelLabel = "انصراف",
  tone = "danger",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const isDanger = tone === "danger";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      closeOnOverlayClick={!isLoading}
      contentClassName="max-w-sm"
    >
      <div className="text-center">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
            isDanger ? "bg-red-100 dark:bg-red-900/30" : "bg-voxcina-cream dark:bg-voxcina-blue/20"
          }`}
        >
          <AlertTriangle
            className={`h-6 w-6 ${isDanger ? "text-red-600 dark:text-red-400" : "text-voxcina-blue dark:text-voxcina-cream"}`}
          />
        </div>
        <h3 className="mb-2 text-base font-bold text-voxcina-blue dark:text-voxcina-cream">{title}</h3>
        <p className="mb-6 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">{description}</p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDanger ? "danger" : "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
