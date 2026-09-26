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
    <Modal
      isOpen={!!pair}
      onClose={onClose}
      title="مقایسه قبل و بعد از پرو"
      contentClassName="max-w-2xl"
      className="p-4"
    >
      {pair && (
        <div className="space-y-3">
          <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
            اهرم وسط تصویر را به چپ یا راست حرکت دهید تا تفاوت عکس اصلی و پرو لباس را مشاهده کنید.
          </p>
          <div className="rounded-2xl overflow-hidden border border-secondary-300 dark:border-voxcina-blue/30 shadow-medium">
            <BeforeAfterSlider
              beforeImage={pair.beforeImage}
              afterImage={pair.afterImage}
              beforeLabel="عکس اصلی شما"
              afterLabel="نتیجه پرو ووکسا"
              className="w-full max-h-[65vh]"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
