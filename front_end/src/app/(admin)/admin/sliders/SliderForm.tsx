"use client";

import { useState, useEffect } from "react";
import { Slider, SliderStats } from "@/types/slider";
import { useSliderStore } from "@/store/slider-store";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface SliderFormProps {
  slider: Slider | null;
  onClose: () => void;
}

export default function SliderForm({ slider, onClose }: SliderFormProps) {
  const { createSlider, updateSlider } = useSliderStore();
  const [formData, setFormData] = useState<Partial<Slider>>({
    title: "",
    subtitle: "",
    description: "",
    image: "",
    buttonText: "",
    buttonLink: "",
    badge: "",
    bgColor: "",
    accentColor: "",
    discount: "",
    features: [],
    stats: { items: "", brands: "", reviews: "" },
    isActive: true,
  });

  useEffect(() => {
    if (slider) {
      setFormData(slider);
    }
  }, [slider]);

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
    setFormData(prev => ({ ...prev, features: e.target.value.split(',').map(f => f.trim()) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slider) {
      await updateSlider(slider.id!, formData);
    } else {
      await createSlider(formData as Omit<Slider, "id">);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
        >
          <h2 className="text-xl font-bold mb-4">{slider ? "ویرایش اسلاید" : "افزودن اسلاید"}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="title" value={formData.title} onChange={handleChange} placeholder="عنوان" />
            <Input name="subtitle" value={formData.subtitle} onChange={handleChange} placeholder="زیرنویس" />
            <Input name="description" value={formData.description} onChange={handleChange} placeholder="توضیحات" className="md:col-span-2" />
            <Input name="image" value={formData.image} onChange={handleChange} placeholder="آدرس تصویر" />
            <Input name="buttonText" value={formData.buttonText} onChange={handleChange} placeholder="متن دکمه" />
            <Input name="buttonLink" value={formData.buttonLink} onChange={handleChange} placeholder="لینک دکمه" />
            <Input name="badge" value={formData.badge} onChange={handleChange} placeholder="نشان (Badge)" />
            <Input name="bgColor" value={formData.bgColor} onChange={handleChange} placeholder="رنگ پس‌زمینه" />
            <Input name="accentColor" value={formData.accentColor} onChange={handleChange} placeholder="رنگ تأکید" />
            <Input name="discount" value={formData.discount} onChange={handleChange} placeholder="مقدار تخفیف" />
            <Input name="features" value={formData.features?.join(', ')} onChange={handleFeaturesChange} placeholder="ویژگی‌ها (جدا با کاما)" className="md:col-span-2" />
            <h3 className="text-md font-semibold mt-4 md:col-span-2">آمار</h3>
            <Input name="items" value={formData.stats?.items} onChange={handleStatsChange} placeholder="تعداد آیتم‌ها" />
            <Input name="brands" value={formData.stats?.brands} onChange={handleStatsChange} placeholder="تعداد برندها" />
            <Input name="reviews" value={formData.stats?.reviews} onChange={handleStatsChange} placeholder="تعداد بازخوردها" />
            <div className="md:col-span-2 flex items-center">
              <input type="checkbox" name="isActive" checked={formData.isActive} onChange={e => setFormData(prev => ({...prev, isActive: e.target.checked}))} className="ml-2" />
              <label>فعال</label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={onClose}>لغو</Button>
              <Button type="submit">{slider ? "ذخیره تغییرات" : "ایجاد"}</Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 