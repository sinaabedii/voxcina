"use client";

import React, { useEffect, useRef } from "react";
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
  const contentRef = useRef<HTMLDivElement>(null);

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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (
      closeOnOverlayClick &&
      contentRef.current &&
      !contentRef.current.contains(e.target as Node)
    ) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm",
            overlayClassName
          )}
          onClick={handleOverlayClick}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            ref={contentRef}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring" as const, damping: 30, stiffness: 400 }}
            className={cn(
              "w-full max-w-md max-h-[90vh] overflow-auto bg-card rounded-xl shadow-medium border border-border/10",
              contentClassName
            )}
          >
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-5 border-b border-border/10">
                {title && (
                  <h2 className="text-lg font-bold text-primary">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 p-1.5 rounded-full hover:bg-secondary"
                    aria-label="بستن"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            <div className={cn("p-5", className)}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;