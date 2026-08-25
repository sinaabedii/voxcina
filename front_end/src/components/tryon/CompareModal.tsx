"use client";

import BeforeAfterSlider from "@/components/ui/BeforeAfterSlider";
import Modal from "@/components/ui/Modal";

export interface ComparePair {
  beforeImage: string;
  afterImage: string;
}

interface CompareModalProps {
  /** The try-on being inspected, or null when closed. */
  pair: ComparePair | null;
  onClose: () => void;
}

/** The photo and its try-on result side by side, full size. */
export default function CompareModal({ pair, onClose }: CompareModalProps) {
  return (
    <Modal isOpen={!!pair} onClose={onClose} title="مقایسه تصاویر" contentClassName="max-w-2xl" className="p-3">
      {pair && (
        <BeforeAfterSlider
          beforeImage={pair.beforeImage}
          afterImage={pair.afterImage}
          beforeLabel="اصلی"
          afterLabel="پرو"
          className="w-full max-h-[70vh]"
        />
      )}
    </Modal>
  );
}
