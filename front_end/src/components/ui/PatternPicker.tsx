"use client";

import { useState, useCallback, useRef } from "react";
import Cropper, { Area } from "react-easy-crop";
import { X, Upload, Image as ImageIcon, ZoomIn, Palette, Check } from "lucide-react";
import { getCroppedImg, createImageObjectUrl } from "@/lib/image-crop";

interface PatternPickerProps {
  color: string;
  colorName: string;
  swatchImage?: string;
  existingImages?: string[];
  onColorChange: (color: string) => void;
  onColorNameChange: (name: string) => void;
  onSwatchChange: (swatch: string | undefined, blob?: Blob) => void;
}

type Mode = "solid" | "pattern";

export default function PatternPicker({
  color,
  colorName,
  swatchImage,
  existingImages = [],
  onColorChange,
  onColorNameChange,
  onSwatchChange,
}: PatternPickerProps) {
  const [mode, setMode] = useState<Mode>(swatchImage ? "pattern" : "solid");
  const [showCropper, setShowCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(swatchImage || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleExistingImageSelect = (imgUrl: string) => {
    setImageSrc(imgUrl);
    setShowCropper(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 160, 0.85);
      const url = createImageObjectUrl(croppedBlob);
      setPreviewUrl(url);
      onSwatchChange(url, croppedBlob);
      setShowCropper(false);
      setImageSrc("");
    } catch (err) {
      console.error("Crop failed:", err);
    }
  };

  const handleClearSwatch = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    onSwatchChange(undefined);
    setMode("solid");
  };

  const handleModeSwitch = (newMode: Mode) => {
    if (newMode === "pattern" && !previewUrl) {
      setMode(newMode);
    } else if (newMode === "solid") {
      handleClearSwatch();
    } else {
      setMode(newMode);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleModeSwitch("solid")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
            mode === "solid"
              ? "border-primary bg-primary/10 text-primary"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <Palette size={16} />
          <span>رنگ ساده</span>
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("pattern")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
            mode === "pattern"
              ? "border-primary bg-primary/10 text-primary"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <ImageIcon size={16} />
          <span>طرح‌دار / پترن</span>
        </button>
      </div>

      {/* Solid Color Mode */}
      {mode === "solid" && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color || "#000000"}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
            />
            <input
              type="text"
              value={color || ""}
              onChange={(e) => onColorChange(e.target.value)}
              placeholder="#000000"
              className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              dir="ltr"
            />
          </div>
          <input
            type="text"
            value={colorName}
            onChange={(e) => onColorNameChange(e.target.value)}
            placeholder="نام رنگ (مثلاً: قرمز)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      )}

      {/* Pattern Mode */}
      {mode === "pattern" && (
        <div className="space-y-4">
          {/* Preview + Upload */}
          <div className="flex items-start gap-4">
            {/* Swatch Preview */}
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full border-2 border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center"
                style={previewUrl ? {} : { backgroundColor: color || "#ccc" }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Swatch preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={24} className="text-gray-400" />
                )}
              </div>
              {previewUrl && (
                <button
                  type="button"
                  onClick={handleClearSwatch}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Upload Options */}
            <div className="flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Upload size={16} />
                <span>آپلود تصویر جدید</span>
              </button>

              {/* Existing Product Images */}
              {existingImages.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">یا از تصاویر محصول انتخاب کنید:</p>
                  <div className="flex gap-2 flex-wrap">
                    {existingImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleExistingImageSelect(img)}
                        className="w-14 h-14 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary transition-colors"
                      >
                        <img
                          src={img}
                          alt={`Product image ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color name input for pattern mode */}
              <input
                type="text"
                value={colorName}
                onChange={(e) => onColorNameChange(e.target.value)}
                placeholder="نام رنگ/طرح (مثلاً: چهارخانه آبی)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Cropper Modal */}
      {showCropper && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold">برش تصویر</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCropper(false);
                  setImageSrc("");
                }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cropper Area */}
            <div className="relative w-full aspect-square bg-gray-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            {/* Zoom Control */}
            <div className="px-6 py-4 flex items-center gap-4">
              <ZoomIn size={18} className="text-gray-500" />
              <input
                type="range"
                min={1}
                max={5}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-sm text-gray-500 w-12 text-center" dir="ltr">
                {zoom.toFixed(1)}x
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setShowCropper(false);
                  setImageSrc("");
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Check size={16} />
                <span>تایید برش</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
