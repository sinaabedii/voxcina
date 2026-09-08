"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE_CLASSES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

/**
 * Standard admin dialog built on the shared ui Modal with admin-theme
 * chrome. Replaces the hand-rolled fixed-overlay divs (and the
 * window.confirm calls) scattered across admin pages.
 */
export default function AdminModal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: AdminModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      contentClassName={cn(
        "bg-white dark:bg-voxcina-blue/95 border border-voxcina-cream dark:border-voxcina-blue/40 rounded-2xl shadow-lg mx-4",
        SIZE_CLASSES[size]
      )}
    >
      {children}
    </Modal>
  );
}

export function AdminModalActions({
  onCancel,
  cancelLabel = "انصراف",
  children,
  className,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-end gap-2 mt-6", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCancel}
        className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream"
      >
        {cancelLabel}
      </Button>
      {children}
    </div>
  );
}
