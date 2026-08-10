"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  HeroImage,
  HeroContent,
  HeroElement,
  HeroElementType,
  cloneHeroContent,
  createHeroElement,
  normalizeHeroContent,
} from "@/types/hero-image";
import { useHeroImageStore } from "@/store/hero-image-store";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  Monitor,
  Smartphone,
  Plus,
  Tag,
  Heading as HeadingIcon,
  Pilcrow,
  MousePointerClick,
} from "lucide-react";
import HeroPreview from "./HeroPreview";
import { PreviewDevice } from "./HeroPreviewFrame";
import HeroElementEditor from "./HeroElementEditor";
import {
  ColorField,
  FieldGrid,
  Panel,
  SegmentedField,
  SelectField,
  SliderField,
  ToggleField,
} from "./HeroFieldControls";

interface HeroImageFormProps {
  heroImage: HeroImage | null;
  onClose: () => void;
}

interface FormErrors {
  image?: string;
  deviceType?: string;
  displayOrder?: string;
}

const DIRECTION_OPTIONS = [
  { value: "to-r" as const, label: "به راست" },
  { value: "to-l" as const, label: "به چپ" },
  { value: "to-b" as const, label: "به پایین" },
  { value: "to-br" as const, label: "به پایین-راست" },
  { value: "to-bl" as const, label: "به پایین-چپ" },
  { value: "to-tr" as const, label: "به بالا-راست" },
];

const ELEMENT_TYPES: Array<{ type: HeroElementType; label: string; icon: typeof Tag }> = [
  { type: "badge", label: "نشان", icon: Tag },
  { type: "heading", label: "عنوان", icon: HeadingIcon },
  { type: "paragraph", label: "پاراگراف", icon: Pilcrow },
  { type: "button", label: "دکمه", icon: MousePointerClick },
];

export default function HeroImageForm({ heroImage, onClose }: HeroImageFormProps) {
  const { createHeroImage, updateHeroImage, fetchHeroImages, isLoading } = useHeroImageStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    deviceType: "desktop" as "desktop" | "mobile",
    isActive: false,
    displayOrder: 1,
  });
  const [content, setContent] = useState<HeroContent>(() =>
    normalizeHeroContent(heroImage?.content)
  );
  const [expandedElementId, setExpandedElementId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setImageFile(null);
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (heroImage) {
      setFormData({
        deviceType: heroImage.deviceType,
        isActive: heroImage.isActive,
        displayOrder: heroImage.displayOrder,
      });
      setContent(normalizeHeroContent(heroImage.content));
      setImagePreview(heroImage.image);
      setPreviewDevice(heroImage.deviceType);
    } else {
      setContent(cloneHeroContent(normalizeHeroContent(undefined)));
    }
  }, [heroImage]);

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!imagePreview) {
      newErrors.image = heroImage
        ? "برای ادامه، تصویر جدید انتخاب کنید"
        : "تصویر الزامی است";
    }

    if (!formData.deviceType || !["desktop", "mobile"].includes(formData.deviceType)) {
      newErrors.deviceType = "نوع دستگاه باید دسکتاپ یا موبایل باشد";
    }

    if (formData.displayOrder < 0) {
      newErrors.displayOrder = "ترتیب نمایش نمی‌تواند منفی باشد";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    setImagePreview("");
    setErrors((prev) => ({ ...prev, image: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ---------------------------------------------------------------------
  // Content mutation helpers
  // ---------------------------------------------------------------------

  const updateContent = (patch: Partial<HeroContent>) => {
    setContent((prev) => ({ ...prev, ...patch }));
  };

  const updateBackground = (patch: Partial<HeroContent["background"]>) => {
    setContent((prev) => ({ ...prev, background: { ...prev.background, ...patch } }));
  };

  const updateOverlay = (patch: Partial<HeroContent["overlay"]>) => {
    setContent((prev) => ({ ...prev, overlay: { ...prev.overlay, ...patch } }));
  };

  const updateElement = (id: string, patch: Partial<HeroElement>) => {
    setContent((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    }));
  };

  const updateElementColor = (id: string, patch: Partial<HeroElement["color"]>) => {
    setContent((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, color: { ...el.color, ...patch } } : el
      ),
    }));
  };

  const updateElementBadge = (id: string, patch: Partial<NonNullable<HeroElement["badge"]>>) => {
    setContent((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id && el.badge ? { ...el, badge: { ...el.badge, ...patch } } : el
      ),
    }));
  };

  const updateElementButton = (id: string, patch: Partial<NonNullable<HeroElement["button"]>>) => {
    setContent((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id && el.button ? { ...el, button: { ...el.button, ...patch } } : el
      ),
    }));
  };

  const updateElementSegments = (id: string, segments: HeroElement["segments"]) => {
    setContent((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, segments } : el)),
    }));
  };

  const moveElement = (id: string, direction: -1 | 1) => {
    setContent((prev) => {
      const index = prev.elements.findIndex((el) => el.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.elements.length) return prev;
      const elements = [...prev.elements];
      [elements[index], elements[target]] = [elements[target], elements[index]];
      return { ...prev, elements };
    });
  };

  const removeElement = (id: string) => {
    setContent((prev) => ({ ...prev, elements: prev.elements.filter((el) => el.id !== id) }));
    setExpandedElementId((current) => (current === id ? null : current));
  };

  const addElement = (type: HeroElementType) => {
    const element = createHeroElement(type);
    setContent((prev) => ({ ...prev, elements: [...prev.elements, element] }));
    setExpandedElementId(element.id);
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
      formDataToSend.append("displayOrder", String(formData.displayOrder));
      formDataToSend.append("content", JSON.stringify(content));

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

  const previewImageSrc = useMemo(() => imagePreview, [imagePreview]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0">
            <h2 className="text-xl font-bold">
              {heroImage ? "ویرایش هیرو" : "افزودن هیرو"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form
            id="hero-form"
            onSubmit={handleSubmit}
            className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden"
          >
            {/* Editor column */}
            <div className="w-full lg:w-3/5 overflow-y-auto p-4 sm:p-5 space-y-5 border-b lg:border-b-0 lg:border-l">
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">
                  تصویر <span className="text-red-500">*</span>
                </label>

                {imagePreview ? (
                  <div className={`relative ${formData.deviceType === "desktop" ? "aspect-video" : "aspect-[3/4]"} max-h-64 bg-gray-100 rounded-lg overflow-hidden`}>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs z-10">
                      {formData.deviceType === "desktop" ? "۱۶:۹ دسکتاپ" : "۳:۴ موبایل"}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      aria-label="حذف تصویر انتخاب‌شده"
                      title="حذف تصویر انتخاب‌شده"
                      className="absolute top-2 right-2 min-h-11 min-w-11 flex items-center justify-center bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-500"
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
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  >
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600 text-sm">برای آپلود تصویر کلیک کنید</p>
                    <p className="text-xs text-gray-400 mt-1">فرمت‌های مجاز: JPEG، PNG، WebP</p>
                    <p className="text-xs text-blue-500 mt-1 font-medium">
                      {formData.deviceType === "desktop"
                        ? "نسبت تصویر دسکتاپ: ۱۶:۹ (افقی)"
                        : "نسبت تصویر موبایل: ۳:۴ (عمودی)"}
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

                {errors.image && <p className="text-sm text-red-500">{errors.image}</p>}
              </div>

              {/* Device Type Selection */}
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">
                  نوع دستگاه <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, deviceType: "desktop" }));
                      setPreviewDevice("desktop");
                    }}
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
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, deviceType: "mobile" }));
                      setPreviewDevice("mobile");
                    }}
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
                {errors.deviceType && <p className="text-sm text-red-500">{errors.deviceType}</p>}
              </div>

              {/* Active Toggle */}
              <ToggleField
                label={formData.isActive ? "فعال" : "غیرفعال (پیش‌فرض)"}
                checked={formData.isActive}
                onChange={(isActive) => setFormData((prev) => ({ ...prev, isActive }))}
              />

              {/* Display Order */}
              <Input
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))
                }
                label="ترتیب نمایش"
                min={0}
                helperText="عدد کمتر = اولویت بالاتر"
                error={errors.displayOrder}
              />

              {/* Content enabled toggle */}
              <div className="pt-2 border-t">
                <ToggleField
                  label="نمایش محتوای متنی روی تصویر"
                  checked={content.enabled}
                  onChange={(enabled) => updateContent({ enabled })}
                  hint="در صورت غیرفعال بودن، فقط تصویر و پوشش گرادیان نمایش داده می‌شود."
                />
              </div>

              {content.enabled && (
                <>
                  {/* Background & overlay */}
                  <Panel title="پس‌زمینه بخش (زیر تصویر)">
                    <SegmentedField
                      label="جهت گرادیان"
                      value={content.background.direction}
                      options={DIRECTION_OPTIONS}
                      onChange={(direction) => updateBackground({ direction })}
                    />
                    <FieldGrid>
                      <ColorField label="رنگ شروع" value={content.background.from} onChange={(from) => updateBackground({ from })} />
                      <ColorField label="رنگ پایان" value={content.background.to} onChange={(to) => updateBackground({ to })} />
                    </FieldGrid>
                    <ColorField
                      label="رنگ میانی (اختیاری)"
                      value={content.background.via}
                      onChange={(via) => updateBackground({ via })}
                      allowEmpty
                    />
                  </Panel>

                  <Panel title="پوشش گرادیان روی تصویر">
                    <ToggleField
                      label="نمایش پوشش گرادیان"
                      checked={content.overlay.enabled}
                      onChange={(enabled) => updateOverlay({ enabled })}
                    />
                    {content.overlay.enabled && (
                      <>
                        <SegmentedField
                          label="جهت گرادیان"
                          value={content.overlay.direction}
                          options={DIRECTION_OPTIONS}
                          onChange={(direction) => updateOverlay({ direction })}
                        />
                        <FieldGrid>
                          <ColorField label="رنگ شروع" value={content.overlay.from} onChange={(from) => updateOverlay({ from })} />
                          <ColorField label="رنگ پایان" value={content.overlay.to} onChange={(to) => updateOverlay({ to })} />
                        </FieldGrid>
                        <ColorField
                          label="رنگ میانی (اختیاری)"
                          value={content.overlay.via}
                          onChange={(via) => updateOverlay({ via })}
                          allowEmpty
                        />
                        <SliderField
                          label="شفافیت پوشش"
                          value={content.overlay.opacity}
                          min={0}
                          max={100}
                          suffix="%"
                          onChange={(opacity) => updateOverlay({ opacity })}
                        />
                      </>
                    )}
                    <SliderField
                      label="شفافیت خود تصویر"
                      value={content.imageOpacity}
                      min={10}
                      max={100}
                      suffix="%"
                      onChange={(imageOpacity) => updateContent({ imageOpacity })}
                    />
                    <ToggleField
                      label="نمایش دایره‌های تزئینی گوشه‌ها"
                      checked={content.showDecorations}
                      onChange={(showDecorations) => updateContent({ showDecorations })}
                    />
                  </Panel>

                  {/* Placement */}
                  <Panel title="موقعیت و چیدمان محتوا">
                    <FieldGrid>
                      <SegmentedField
                        label="عمودی"
                        value={content.verticalPosition}
                        onChange={(verticalPosition) => updateContent({ verticalPosition })}
                        options={[
                          { value: "top", label: "بالا" },
                          { value: "center", label: "وسط" },
                          { value: "bottom", label: "پایین" },
                        ]}
                      />
                      <SegmentedField
                        label="افقی"
                        value={content.horizontalPosition}
                        onChange={(horizontalPosition) => updateContent({ horizontalPosition })}
                        options={[
                          { value: "start", label: "راست" },
                          { value: "center", label: "وسط" },
                          { value: "end", label: "چپ" },
                        ]}
                      />
                    </FieldGrid>
                    <FieldGrid>
                      <SegmentedField
                        label="چیدمان متن پیش‌فرض"
                        value={content.textAlign}
                        onChange={(textAlign) => updateContent({ textAlign })}
                        options={[
                          { value: "start", label: "راست" },
                          { value: "center", label: "وسط" },
                          { value: "end", label: "چپ" },
                        ]}
                      />
                      <SelectField
                        label="عرض جعبه محتوا"
                        value={content.maxWidth}
                        onChange={(maxWidth) => updateContent({ maxWidth })}
                        options={[
                          { value: "sm", label: "باریک" },
                          { value: "md", label: "متوسط" },
                          { value: "lg", label: "عریض" },
                          { value: "xl", label: "خیلی عریض (پیش‌فرض)" },
                          { value: "full", label: "تمام عرض" },
                        ]}
                      />
                    </FieldGrid>
                    <FieldGrid>
                      <SliderField
                        label="جابه‌جایی افقی دقیق"
                        value={content.offsetX}
                        min={-40}
                        max={40}
                        suffix="%"
                        onChange={(offsetX) => updateContent({ offsetX })}
                      />
                      <SliderField
                        label="جابه‌جایی عمودی دقیق"
                        value={content.offsetY}
                        min={-40}
                        max={40}
                        suffix="%"
                        onChange={(offsetY) => updateContent({ offsetY })}
                      />
                    </FieldGrid>
                  </Panel>

                  {/* Elements */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-700">عناصر محتوا</h3>
                    </div>

                    <div className="space-y-2">
                      {content.elements.map((element, index) => (
                        <HeroElementEditor
                          key={element.id}
                          element={element}
                          index={index}
                          total={content.elements.length}
                          expanded={expandedElementId === element.id}
                          onToggleExpand={() =>
                            setExpandedElementId((current) => (current === element.id ? null : element.id))
                          }
                          onChange={(patch) => updateElement(element.id, patch)}
                          onColorChange={(patch) => updateElementColor(element.id, patch)}
                          onBadgeChange={(patch) => updateElementBadge(element.id, patch)}
                          onButtonChange={(patch) => updateElementButton(element.id, patch)}
                          onSegmentsChange={(segments) => updateElementSegments(element.id, segments)}
                          onMove={(direction) => moveElement(element.id, direction)}
                          onRemove={() => removeElement(element.id)}
                        />
                      ))}
                      {content.elements.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4 border border-dashed rounded-lg">
                          هنوز عنصری اضافه نشده است.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {ELEMENT_TYPES.map(({ type, label, icon: Icon }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => addElement(type)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <Icon className="w-3.5 h-3.5" />
                          افزودن {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Preview column */}
            <div className="w-full lg:w-2/5 overflow-y-auto p-4 sm:p-5 bg-gray-50">
              <HeroPreview
                content={content}
                imageSrc={previewImageSrc}
                device={previewDevice}
                onDeviceChange={setPreviewDevice}
              />
            </div>
          </form>

          {/* Footer actions */}
          <div className="flex justify-end gap-3 p-4 sm:p-5 border-t shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              لغو
            </Button>
            <Button type="submit" form="hero-form" isLoading={isSubmitting || isLoading}>
              {heroImage ? "ذخیره تغییرات" : "ایجاد"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
