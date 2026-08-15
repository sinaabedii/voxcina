"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Camera,
  ImageIcon,
  PersonStanding,
  Shirt,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const GUIDE_IMAGE = "/images/asset/guide.webp";

/** Which photo suits which garment. Mirrors the two halves of the guide image. */
const RULES = [
  {
    icon: Shirt,
    title: "لباس بالاتنه",
    body: "برای پیراهن، تیشرت، بلوز و کت، یک عکس نیم‌تنه از روبه‌رو بفرستید.",
  },
  {
    icon: PersonStanding,
    title: "سایر لباس‌ها",
    body: "برای شلوار، دامن، لباس یک‌سره و ست کامل، یک عکس تمام‌قد بفرستید.",
  },
];

const TIPS = [
  "روبه‌روی دوربین بایستید و مستقیم به آن نگاه کنید.",
  "دست‌ها را آزاد و کنار بدن نگه دارید.",
  "از نور کافی و پس‌زمینه ساده استفاده کنید.",
];

/**
 * Whether the device can plausibly take the photo itself.
 *
 * Browsers only honour the `capture` attribute on devices with a camera app, so
 * the camera button is offered on coarse-pointer devices (phones, tablets) and
 * desktops keep the single "choose a file" action. Read in an effect rather than
 * during render: the page is server-rendered, and `matchMedia` would disagree
 * between the server pass and hydration.
 */
function useCoarsePointer(): boolean {
  const [isCoarse, setIsCoarse] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const sync = () => setIsCoarse(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return isCoarse;
}

interface PhotoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Opens the file system picker on desktop, the photo library on mobile. */
  onChooseFile: () => void;
  /** Opens the camera. Only offered on devices that have one. */
  onOpenCamera: () => void;
}

/**
 * Shown before the photo picker so people learn what makes a usable try-on
 * photo *before* choosing one — after the fact the only feedback is a poor
 * result. The picker itself is opened by the parent, which owns the file inputs.
 */
export default function PhotoGuideModal({
  isOpen,
  onClose,
  onChooseFile,
  onOpenCamera,
}: PhotoGuideModalProps) {
  const hasCamera = useCoarsePointer();
  const [zoomed, setZoomed] = useState(false);

  // The reference is detailed and the modal is narrow on phones, so it starts
  // fitted and can be expanded. Reset on close so it reopens fitted.
  useEffect(() => {
    if (!isOpen) setZoomed(false);
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="راهنمای عکس مناسب"
      contentClassName="max-w-2xl"
      className="p-0"
    >
      <div className="flex flex-col md:flex-row md:items-start gap-4 p-4 md:p-5">
        {/* Visual reference */}
        <div className="md:w-1/2 md:shrink-0">
          <button
            type="button"
            onClick={() => setZoomed((value) => !value)}
            aria-label={zoomed ? "کوچک کردن تصویر راهنما" : "بزرگ کردن تصویر راهنما"}
            // `w-fit` keeps the frame hugging the portrait image instead of
            // leaving letterbox bars beside it in a full-width box.
            className="relative mx-auto block w-fit overflow-hidden rounded-xl border border-border/60"
          >
            <Image
              src={GUIDE_IMAGE}
              alt="نمونه عکس‌های درست و اشتباه برای پرو مجازی، در دو حالت نیم‌تنه و تمام‌قد"
              width={1200}
              height={1800}
              sizes="(min-width: 768px) 45vw, 90vw"
              className={cn(
                "h-auto w-auto max-w-full",
                zoomed ? "max-h-none" : "max-h-[42vh] md:max-h-[58vh]"
              )}
            />
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
              {zoomed ? <ZoomOut className="h-3 w-3" /> : <ZoomIn className="h-3 w-3" />}
              {zoomed ? "کوچک کردن" : "بزرگ‌نمایی"}
            </span>
          </button>
        </div>

        {/* Written guide */}
        <div className="md:w-1/2 space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            هوش مصنوعی لباس را روی همین عکس می‌پوشاند، پس هرچه عکس صاف‌تر و
            واضح‌تر باشد نتیجه طبیعی‌تر است.
          </p>

          {RULES.map((rule) => (
            <div
              key={rule.title}
              className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-secondary/30 p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <rule.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">{rule.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {rule.body}
                </p>
              </div>
            </div>
          ))}

          <ul className="space-y-1.5 pt-0.5">
            {TIPS.map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions stay reachable without scrolling past the reference image. */}
      <div className="sticky bottom-0 border-t border-border/60 bg-card/95 p-4 backdrop-blur-sm">
        {hasCamera ? (
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="primary"
              fullWidth
              leftIcon={<ImageIcon className="h-4 w-4" />}
              onClick={onChooseFile}
            >
              انتخاب از گالری
            </Button>
            <Button
              variant="outline"
              fullWidth
              leftIcon={<Camera className="h-4 w-4" />}
              onClick={onOpenCamera}
            >
              گرفتن عکس
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            fullWidth
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={onChooseFile}
          >
            انتخاب عکس از سیستم
          </Button>
        )}
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          پس از انتخاب، می‌توانید کادر عکس را تنظیم کنید.
        </p>
      </div>
    </Modal>
  );
}
