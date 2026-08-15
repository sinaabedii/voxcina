"use client";

import { useEffect, useState } from "react";
import { useSliderStore } from "@/store/slider-store";
import { Slider } from "@/types/slider";
import Button from "@/components/ui/Button";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import SliderForm from "./SliderForm";

export default function SlidersPage() {
  const {
    sliders,
    fetchSliders,
    deleteSlider,
    reorderSliders,
    isLoading,
    error,
  } = useSliderStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlider, setSelectedSlider] = useState<Slider | null>(null);

  useEffect(() => {
    fetchSliders();
  }, [fetchSliders]);

  const handleCreate = () => {
    setSelectedSlider(null);
    setIsModalOpen(true);
  };

  const handleEdit = (slider: Slider) => {
    setSelectedSlider(slider);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("آیا از حذف این اسلاید مطمئن هستید؟")) {
      await deleteSlider(id);
    }
  };

  /**
   * Swaps a slide with its neighbour.
   *
   * Positions are recomputed from array index rather than the stored `order`
   * values, so a list that arrived with duplicate or gapped orders comes out
   * as a clean 0..n-1 sequence.
   */
  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sliders.length) return;

    const reordered = [...sliders];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    await reorderSliders(
      reordered.map((slider, position) => ({ id: slider.id!, order: position }))
    );
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">مدیریت اسلایدرها</h1>
        <Button onClick={handleCreate}>
          <Plus className="ml-2" />
          افزودن اسلاید
        </Button>
      </div>

      {isLoading && <p>در حال بارگذاری...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!isLoading && sliders.length === 0 && (
        <p className="text-gray-600">
          هنوز اسلایدی ساخته نشده است. تا زمانی که اسلاید منتشرشده‌ای وجود نداشته
          باشد، این بخش در صفحه اصلی نمایش داده نمی‌شود.
        </p>
      )}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
      >
        {sliders.map((slider, index) => (
          <motion.div
            key={slider.id}
            className="bg-white rounded-lg shadow p-4 flex flex-col justify-between"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slider.image}
                alt={slider.title}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{slider.title}</h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    slider.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {slider.isActive ? "منتشرشده" : "پیش‌نویس"}
                </span>
              </div>
              <p className="text-sm text-gray-600">{slider.subtitle}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {slider.buttonLink}
              </p>
            </div>

            <div className="flex justify-between items-center gap-2 mt-4">
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="انتقال به بالا"
                  disabled={index === 0}
                  onClick={() => handleMove(index, -1)}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="انتقال به پایین"
                  disabled={index === sliders.length - 1}
                  onClick={() => handleMove(index, 1)}
                >
                  <ArrowDown size={16} />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="ویرایش"
                  onClick={() => handleEdit(slider)}
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  aria-label="حذف"
                  onClick={() => handleDelete(slider.id!)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {isModalOpen && (
        <SliderForm
          slider={selectedSlider}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
