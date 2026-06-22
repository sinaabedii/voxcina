"use client";

import { useState, useEffect, useRef } from "react";
import { HeroImage, DEFAULT_OVERLAY_GRADIENT } from "@/types/hero-image";
import { useHeroImageStore } from "@/store/hero-image-store";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Monitor, Smartphone } from "lucide-react";

interface HeroImageFormProps {
  heroImage: HeroImage | null;
  onClose: () => void;
}

interface FormErrors {
  image?: string;
  deviceType?: string;
  displayOrder?: string;
  gradient?: string;
}

export default function HeroImageForm({ heroImage, onClose }: HeroImageFormProps) {
  const { createHeroImage, updateHeroImage, fetchHeroImages, isLoading } = useHeroImageStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    deviceType: "desktop" as "desktop" | "mobile",
    isActive: false,
    gradient: "",
    noGradient: false,
    displayOrder: 1,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (heroImage) {
      setFormData({
        deviceType: heroImage.deviceType,
        isActive: heroImage.isActive,
        gradient: heroImage.gradient || "",
        noGradient: heroImage.noGradient,
        displayOrder: heroImage.displayOrder,
      });
      setImagePreview(heroImage.image);
    }
  }, [heroImage]);

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Image validation - required for new hero images
    if (!heroImage && !imageFile) {
      newErrors.image = "تصویر الزامی است";
    }

    // Device type validation
    if (!formData.deviceType || !["desktop", "mobile"].includes(formData.deviceType)) {
      newErrors.deviceType = "نوع دستگاه باید دسکتاپ یا موبایل باشد";
    }

    // Display order validation
    if (formData.displayOrder < 0) {
      newErrors.displayOrder = "ترتیب نمایش نمی‌تواند منفی باشد";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          image: "فرمت تصویر باید JPEG، PNG یا WebP باشد",
        }));
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, image: undefined }));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (!heroImage) {
      setImagePreview("");
    } else {
      setImagePreview(heroImage.image);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      
      if (imageFile) {
        formDataToSend.append("image", imageFile);
      }
      formDataToSend.append("deviceType", formData.deviceType);
      formDataToSend.append("isActive", String(formData.isActive));
      formDataToSend.append("gradient", formData.gradient);
      formDataToSend.append("noGradient", String(formData.noGradient));
      formDataToSend.append("displayOrder", String(formData.displayOrder));

      let result;
      if (heroImage) {
        result = await updateHeroImage(heroImage.id!, formDataToSend);
      } else {
        result = await createHeroImage(formDataToSend);
      }

      if (result) {
        await fetchHeroImages();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="text-xl font-bold">
              {heroImage ? "ویرایش تصویر هیرو" : "افزودن تصویر هیرو"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="block font-medium text-gray-700">
                تصویر <span className="text-red-500">*</span>
              </label>
              
              {imagePreview ? (
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-white/90 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-white transition-colors"
                  >
                    تغییر تصویر
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                >
                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">برای آپلود تصویر کلیک کنید</p>
                  <p className="text-xs text-gray-400 mt-1">
                    فرمت‌های مجاز: JPEG، PNG، WebP
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {errors.image && (
                <p className="text-sm text-red-500">{errors.image}</p>
              )}
            </div>

            {/* Device Type Selection */}
            <div className="space-y-2">
              <label className="block font-medium text-gray-700">
                نوع دستگاه <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, deviceType: "desktop" }))}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    formData.deviceType === "desktop"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Monitor className="w-5 h-5" />
                  <span>دسکتاپ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, deviceType: "mobile" }))}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    formData.deviceType === "mobile"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span>موبایل</span>
                </button>
              </div>
              {errors.deviceType && (
                <p className="text-sm text-red-500">{errors.deviceType}</p>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
              <span className="text-gray-700">
                {formData.isActive ? "فعال" : "غیرفعال"}
              </span>
              <span className="text-xs text-gray-400">
                (پیش‌فرض: غیرفعال)
              </span>
            </div>

            {/* Gradient Settings */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-700">تنظیمات گرادیان</h3>
              
              {/* No Gradient Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="noGradient"
                  checked={formData.noGradient}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, noGradient: e.target.checked }))
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="noGradient" className="text-gray-600">
                  بدون گرادیان (تصویر بدون پوشش نمایش داده شود)
                </label>
              </div>

              {/* Gradient Input */}
              {!formData.noGradient && (
                <div className="space-y-2">
                  <Input
                    value={formData.gradient}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, gradient: e.target.value }))
                    }
                    placeholder={DEFAULT_OVERLAY_GRADIENT}
                    label="کلاس گرادیان (اختیاری)"
                    helperText={`پیش‌فرض: ${DEFAULT_OVERLAY_GRADIENT}`}
                  />
                  {/* Gradient Preview */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">پیش‌نمایش:</span>
                    <div
                      className={`w-full h-8 rounded ${
                        formData.gradient || DEFAULT_OVERLAY_GRADIENT
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Display Order */}
            <div>
              <Input
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    displayOrder: parseInt(e.target.value) || 0,
                  }))
                }
                label="ترتیب نمایش"
                min={0}
                helperText="عدد کمتر = اولویت بالاتر"
                error={errors.displayOrder}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                لغو
              </Button>
              <Button type="submit" isLoading={isSubmitting || isLoading}>
                {heroImage ? "ذخیره تغییرات" : "ایجاد"}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
