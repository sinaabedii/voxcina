"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/input";

/** The public slider renders a wide banner, so crops are locked to 16:9. */
const SLIDE_ASPECT = 16 / 9;

interface SliderImagePickerProps {
  /** Stored image path for an existing slide, if any. */
  value?: string;
  /** Called with the cropped file to upload, or null when it's cleared. */
  onFileChange: (file: File | null) => void;
  /** Called when the admin types a path instead of uploading. */
  onPathChange: (path: string) => void;
}

/**
 * Renders a cropped area of an image to a WebP blob.
 *
 * The crop rectangle react-easy-crop reports is in natural-image pixels, so the
 * output keeps the source resolution rather than the on-screen preview size.
 */
async function cropToFile(imageSrc: string, area: Area): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.9)
  );
  if (!blob) throw new Error("Could not encode the cropped image");

  return new File([blob], `slide-${Date.now()}.webp`, { type: "image/webp" });
}

export default function SliderImagePicker({
  value,
  onFileChange,
  onPathChange,
}: SliderImagePickerProps) {
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.addEventListener("load", () => setSource(reader.result as string));
    reader.readAsDataURL(file);
  };

  const handleConfirmCrop = useCallback(async () => {
    if (!source || !area) return;
    setIsCropping(true);
    setError(null);
    try {
      const file = await cropToFile(source, area);
      onFileChange(file);
      setPreview(URL.createObjectURL(file));
      setSource(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "برش تصویر ناموفق بود");
    } finally {
      setIsCropping(false);
    }
  }, [source, area, onFileChange]);

  const handleClear = () => {
    onFileChange(null);
    setPreview(null);
    setSource(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const shownImage = preview ?? value;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">تصویر پس‌زمینه</label>

      {source ? (
        <div className="space-y-3">
          <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              aspect={SLIDE_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedAreaPixels) => setArea(croppedAreaPixels)}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs shrink-0">بزرگ‌نمایی</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleConfirmCrop} disabled={isCropping}>
              {isCropping ? "در حال برش…" : "تأیید برش"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setSource(null)}>
              لغو
            </Button>
          </div>
        </div>
      ) : (
        <>
          {shownImage && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={shownImage}
              alt="پیش‌نمایش تصویر اسلاید"
              className="w-full h-40 object-cover rounded-md border"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelected}
              className="text-sm"
            />
            {shownImage && (
              <Button type="button" variant="outline" size="sm" onClick={handleClear}>
                حذف تصویر
              </Button>
            )}
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="pt-1">
        <label className="block text-xs text-gray-600 mb-1">
          یا نشانی تصویر موجود را وارد کنید
        </label>
        <Input
          name="image"
          value={value ?? ""}
          onChange={(e) => onPathChange(e.target.value)}
          placeholder="/uploads/sliders/example.webp"
        />
      </div>
    </div>
  );
}
