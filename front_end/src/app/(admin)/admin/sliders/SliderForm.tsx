"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Slider,
  SliderStats,
  CONTENT_POSITIONS,
  OVERLAY_STRENGTHS,
  ContentPosition,
  OverlayStrength,
} from "@/types/slider";
import { useSliderStore } from "@/store/slider-store";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import SliderImagePicker from "./_components/SliderImagePicker";
import GradientDesigner from "./_components/GradientDesigner";
import LinkPicker from "./_components/LinkPicker";
import SliderPreview from "./_components/SliderPreview";
import { DEFAULT_GRADIENT } from "./_components/gradient-presets";

interface SliderFormProps {
  slider: Slider | null;
  onClose: () => void;
}

const POSITION_LABELS: Record<ContentPosition, string> = {
  right: "راست",
  left: "چپ",
  center: "وسط",
};

const OVERLAY_LABELS: Record<OverlayStrength, string> = {
  none: "بدون سایه",
  light: "کم",
  dark: "زیاد",
};

/** Trims an ISO timestamp to what <input type="datetime-local"> expects. */
function toLocalInput(value?: string | null): string {
  return value ? value.slice(0, 16) : "";
}

/** Expands a datetime-local value back to RFC3339 for the API. */
function toRfc3339(value: string): string {
  return value ? new Date(value).toISOString() : "";
}

export default function SliderForm({ slider, onClose }: SliderFormProps) {
  const { createSlider, updateSlider, isLoading } = useSliderStore();
  const [formData, setFormData] = useState<Partial<Slider>>({
    title: "",
    subtitle: "",
    description: "",
    image: "",
    buttonText: "",
    buttonLink: "",
    badge: "",
    bgColor: DEFAULT_GRADIENT.bgColor,
    accentColor: DEFAULT_GRADIENT.accentColor,
    discount: "",
    features: [],
    stats: { items: "", brands: "", reviews: "" },
    order: 0,
    contentPosition: "right",
    overlayStrength: "dark",
    isActive: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (slider) setFormData(slider);
  }, [slider]);

  // Revoked on change so repeated crops don't leak object URLs.
  const pendingImage = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile]
  );
  useEffect(() => {
    return () => {
      if (pendingImage) URL.revokeObjectURL(pendingImage);
    };
  }, [pendingImage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      stats: { ...(prev.stats as SliderStats), [name]: value },
    }));
  };

  const handleFeaturesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      features: e.target.value
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
    }));
  };

  /** Builds the multipart body; `publish` overrides the stored isActive. */
  const buildFormData = (publish: boolean): FormData => {
    const body = new FormData();
    body.append("title", formData.title ?? "");
    body.append("subtitle", formData.subtitle ?? "");
    body.append("description", formData.description ?? "");
    body.append("buttonText", formData.buttonText ?? "");
    body.append("buttonLink", formData.buttonLink ?? "");
    body.append("badge", formData.badge ?? "");
    body.append("bgColor", formData.bgColor ?? "");
    body.append("accentColor", formData.accentColor ?? "");
    body.append("discount", formData.discount ?? "");
    body.append("contentPosition", formData.contentPosition ?? "right");
    body.append("overlayStrength", formData.overlayStrength ?? "dark");
    body.append("order", String(formData.order ?? 0));
    body.append("isActive", String(publish));
    body.append("features", JSON.stringify(formData.features ?? []));
    body.append("stats", JSON.stringify(formData.stats ?? {}));
    body.append("startAt", toRfc3339(toLocalInput(formData.startAt)));
    body.append("endAt", toRfc3339(toLocalInput(formData.endAt)));

    if (imageFile) {
      body.append("image", imageFile);
    } else {
      // URL fallback — the server treats a plain value as an existing path.
      body.append("image", formData.image ?? "");
    }

    return body;
  };

  const submit = async (publish: boolean) => {
    setFormError(null);

    if (!formData.title?.trim()) {
      setFormError("عنوان الزامی است.");
      return;
    }
    if (!formData.buttonLink?.trim()) {
      setFormError("مقصد دکمه الزامی است.");
      return;
    }
    if (!imageFile && !formData.image?.trim()) {
      setFormError("انتخاب تصویر پس‌زمینه الزامی است.");
      return;
    }

    const body = buildFormData(publish);
    const saved = slider
      ? await updateSlider(slider.id!, body)
      : await createSlider(body);

    if (saved) onClose();
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
          className="bg-white rounded-lg shadow-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
        >
          <h2 className="text-xl font-bold mb-4">
            {slider ? "ویرایش اسلاید" : "افزودن اسلاید"}
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(Boolean(formData.isActive));
            }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="space-y-4">
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="عنوان"
              />
              <Input
                name="subtitle"
                value={formData.subtitle}
                onChange={handleChange}
                placeholder="زیرنویس"
              />
              <Input
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="توضیحات"
              />

              <SliderImagePicker
                value={formData.image}
                onFileChange={setImageFile}
                onPathChange={(path) =>
                  setFormData((prev) => ({ ...prev, image: path }))
                }
              />

              <Input
                name="buttonText"
                value={formData.buttonText}
                onChange={handleChange}
                placeholder="متن دکمه"
              />

              <LinkPicker
                value={formData.buttonLink}
                onChange={(href) =>
                  setFormData((prev) => ({ ...prev, buttonLink: href }))
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  name="badge"
                  value={formData.badge}
                  onChange={handleChange}
                  placeholder="نشان (Badge)"
                />
                <Input
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  placeholder="مقدار تخفیف"
                />
              </div>

              <Input
                name="features"
                value={formData.features?.join(", ")}
                onChange={handleFeaturesChange}
                placeholder="ویژگی‌ها (جدا با کاما)"
              />

              <div>
                <h3 className="text-sm font-medium mb-2">آمار</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    name="items"
                    value={formData.stats?.items}
                    onChange={handleStatsChange}
                    placeholder="آیتم‌ها"
                  />
                  <Input
                    name="brands"
                    value={formData.stats?.brands}
                    onChange={handleStatsChange}
                    placeholder="برندها"
                  />
                  <Input
                    name="reviews"
                    value={formData.stats?.reviews}
                    onChange={handleStatsChange}
                    placeholder="بازخوردها"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SliderPreview slider={formData} pendingImage={pendingImage} />

              <GradientDesigner
                bgColor={formData.bgColor}
                accentColor={formData.accentColor}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, ...value }))
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    جای متن
                  </label>
                  <select
                    value={formData.contentPosition ?? "right"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contentPosition: e.target.value as ContentPosition,
                      }))
                    }
                    className="w-full border rounded-md px-3 py-2 bg-white"
                  >
                    {CONTENT_POSITIONS.map((position) => (
                      <option key={position} value={position}>
                        {POSITION_LABELS[position]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    شدت سایه
                  </label>
                  <select
                    value={formData.overlayStrength ?? "dark"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        overlayStrength: e.target.value as OverlayStrength,
                      }))
                    }
                    className="w-full border rounded-md px-3 py-2 bg-white"
                  >
                    {OVERLAY_STRENGTHS.map((strength) => (
                      <option key={strength} value={strength}>
                        {OVERLAY_LABELS[strength]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    نمایش از (اختیاری)
                  </label>
                  <input
                    type="datetime-local"
                    value={toLocalInput(formData.startAt)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startAt: e.target.value || null,
                      }))
                    }
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    نمایش تا (اختیاری)
                  </label>
                  <input
                    type="datetime-local"
                    value={toLocalInput(formData.endAt)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endAt: e.target.value || null,
                      }))
                    }
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ترتیب</label>
                <Input
                  name="order"
                  type="number"
                  value={String(formData.order ?? 0)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      order: Number(e.target.value),
                    }))
                  }
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  لغو
                </Button>
                {/* Saving and publishing are separate: a slide can be stored as
                    a draft and only go live once someone opts in. */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => submit(false)}
                  disabled={isLoading}
                >
                  ذخیره پیش‌نویس
                </Button>
                <Button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={isLoading}
                >
                  ذخیره و انتشار
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
