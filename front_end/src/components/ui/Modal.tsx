"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  overlayClassName,
  contentClassName,
  showCloseButton = true,
  closeOnOverlayClick = true,
}) => {
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const mouseDownInsideRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    mouseDownInsideRef.current =
      !!contentRef.current?.contains(e.target as Node);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!closeOnOverlayClick) return;
    // If the drag started inside the modal (e.g. selecting text in a
    // textarea and scrolling), ignore the subsequent overlay click even
    // when mouseup lands outside the modal.
    if (mouseDownInsideRef.current) return;
    if (
      contentRef.current &&
      !contentRef.current.contains(e.target as Node)
    ) {
      onClose();
    }
  };

  if (!mounted) return null;

  const modalNode = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:p-4",
            overlayClassName
          )}
          onMouseDown={handleOverlayMouseDown}
          onClick={handleOverlayClick}
          aria-modal="true"
          role="dialog"
          dir="rtl"
        >
          <motion.div
            ref={contentRef}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring" as const, damping: 30, stiffness: 400 }}
            className={cn(
              "flex flex-col w-full max-w-md max-h-[88dvh] sm:max-h-[85vh] bg-card rounded-2xl shadow-strong border border-border/20 overflow-hidden",
              contentClassName
            )}
          >
            {(title || showCloseButton) && (
              <div className="flex shrink-0 items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 border-b border-border/10 bg-card">
                {title && (
                  <h2 className="text-sm sm:text-base font-bold text-primary line-clamp-1 pr-1">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 p-1.5 rounded-full hover:bg-secondary shrink-0 mr-auto"
                    aria-label="بستن"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5", className)}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalNode, document.body);
};

export default Modal;