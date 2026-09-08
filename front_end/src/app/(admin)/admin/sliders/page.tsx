"use client";

import { useEffect, useState } from "react";
import { useSliderStore } from "@/store/slider-store";
import { Slider } from "@/types/slider";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  AdminPageHeader,
  AdminBadge,
  AdminLoading,
  AdminError,
  AdminEmpty,
  AdminModal,
  AdminModalActions,
} from "@/components/admin/ui";
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
  const [deleteTarget, setDeleteTarget] = useState<Slider | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    await deleteSlider(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
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
    <div>
      <AdminPageHeader
        title="مدیریت اسلایدرها"
        actions={
          <Button variant="primary" size="sm" onClick={handleCreate} className="rounded-xl">
            <Plus className="w-4 h-4 ml-2" />
            افزودن اسلاید
          </Button>
        }
      />

      {isLoading && <AdminLoading message="در حال بارگذاری اسلایدها..." />}
      {error && <AdminError message={error} onRetry={fetchSliders} />}

      {!isLoading && !error && sliders.length === 0 && (
        <AdminEmpty
          icon={ImageIcon}
          title="هنوز اسلایدی ساخته نشده است"
          description="تا زمانی که اسلاید منتشرشده‌ای وجود نداشته باشد، این بخش در صفحه اصلی نمایش داده نمی‌شود."
          action={
            <Button variant="primary" size="sm" onClick={handleCreate} className="rounded-xl">
              <Plus className="w-4 h-4 ml-2" />
              افزودن اسلاید
            </Button>
          }
        />
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
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10 overflow-hidden h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slider.image}
                    alt={slider.title}
                    className="w-full h-40 object-cover rounded-xl mb-4"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-voxcina-blue dark:text-voxcina-cream">
                      {slider.title}
                    </h2>
                    <AdminBadge tone={slider.isActive ? "success" : "neutral"}>
                      {slider.isActive ? "منتشرشده" : "پیش‌نویس"}
                    </AdminBadge>
                  </div>
                  <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1">
                    {slider.subtitle}
                  </p>
                  <p className="text-xs text-voxcina-blue/40 dark:text-voxcina-cream/40 mt-1 truncate">
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
                      className="rounded-xl"
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="انتقال به پایین"
                      disabled={index === sliders.length - 1}
                      onClick={() => handleMove(index, 1)}
                      className="rounded-xl"
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
                      className="rounded-xl"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label="حذف"
                      onClick={() => setDeleteTarget(slider)}
                      className="rounded-xl"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {isModalOpen && (
        <SliderForm
          slider={selectedSlider}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <AdminModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف اسلاید"
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
          آیا از حذف اسلاید «{deleteTarget?.title}» مطمئن هستید؟ این عمل قابل
          بازگشت نیست.
        </p>
        <AdminModalActions onCancel={() => setDeleteTarget(null)}>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            isLoading={isDeleting}
            className="rounded-xl"
          >
            حذف اسلاید
          </Button>
        </AdminModalActions>
      </AdminModal>
    </div>
  );
}
