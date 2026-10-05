"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import ProductSizeGuide from "./ProductSizeGuide";
import { Product } from "@/types/product";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
}

export default function SizeGuideModal({
  isOpen,
  onClose,
  product,
  selectedSize,
  onSelectSize,
}: SizeGuideModalProps) {
  const handleSelectSize = (size: string) => {
    onSelectSize?.(size);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="راهنمای جامع سایزبندی و اندازه‌گیری"
      overlayClassName="items-end sm:items-center sm:p-4"
      contentClassName="max-w-4xl max-h-[94vh] sm:max-h-[92vh] overflow-y-auto rounded-t-3xl rounded-b-none sm:rounded-3xl border border-border/30 bg-background/95 backdrop-blur-md shadow-2xl p-0"
      className="p-0"
    >
      {/* Bottom sheet under `sm` (matches SizeRecommendationModal), centred
          dialog above. `className="p-0"` removes the shared Modal's extra
          wrapper padding — the panel owns its spacing here. */}
      <div className="p-4 sm:p-6" dir="rtl">
        <ProductSizeGuide
          product={product}
          selectedSize={selectedSize}
          onSelectSize={handleSelectSize}
          allowZoom={false}
        />
      </div>
    </Modal>
  );
}
