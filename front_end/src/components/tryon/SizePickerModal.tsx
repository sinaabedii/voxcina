"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import SizeSelector from "@/components/ui/SizeSelector";
import { getRecommendedSizes } from "@/lib/tryon-recommendation";
import { RecommendedProduct } from "@/types/tryon";

interface SizePickerModalProps {
  /** The recommendation being added to the cart, or null when closed. */
  product: RecommendedProduct | null;
  adding: boolean;
  onClose: () => void;
  onConfirm: (size: string) => void;
}

/** Asks for a size before the seller's recommendation goes into the cart. */
export default function SizePickerModal({ product, adding, onClose, onConfirm }: SizePickerModalProps) {
  const [size, setSize] = useState<string | undefined>(undefined);

  // Each product opens the picker on a clean slate.
  useEffect(() => {
    setSize(undefined);
  }, [product?.product_id]);

  const sizes = product ? getRecommendedSizes(product) : [];

  return (
    <Modal isOpen={!!product} onClose={onClose} title="انتخاب سایز" contentClassName="max-w-sm">
      {product && (
        <>
          <p className="text-sm text-muted-foreground mb-4">{product.product_name}</p>
          {sizes.length > 0 ? (
            <SizeSelector sizes={sizes} selectedSize={size} onSizeChange={setSize} showLabel={false} />
          ) : (
            <p className="text-sm text-muted-foreground mb-4">سایزی برای این محصول موجود نیست.</p>
          )}
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
              انصراف
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              disabled={!size || adding}
              onClick={() => size && onConfirm(size)}
            >
              {adding ? "..." : "افزودن به سبد"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
