"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useHeroImageStore } from "@/store/hero-image-store";
import { HeroImage, DEFAULT_GRADIENT, normalizeHeroContent } from "@/types/hero-image";
import { buildGradient } from "@/components/home/hero-styles";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Plus, Edit, Trash2, Monitor, Smartphone, Image as ImageIcon, Type } from "lucide-react";
import { motion } from "framer-motion";
import {
  AdminPageHeader,
  AdminBadge,
  AdminLoading,
  AdminError,
  AdminEmpty,
  AdminModal,
  AdminModalActions,
  AdminSelect,
} from "@/components/admin/ui";
import HeroImageForm from "./HeroImageForm";

type DeviceFilter = "all" | "desktop" | "mobile";

export default function HeroImagesPage() {
  const { heroImages, fetchHeroImages, deleteHeroImage, isLoading, error } = useHeroImageStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHeroImage, setSelectedHeroImage] = useState<HeroImage | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<HeroImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchHeroImages();
  }, [fetchHeroImages]);

  const handleCreate = () => {
    setSelectedHeroImage(null);
    setIsModalOpen(true);
  };

  const handleEdit = (heroImage: HeroImage) => {
    setSelectedHeroImage(heroImage);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    await deleteHeroImage(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedHeroImage(null);
  };

  // Filter and sort hero images - ensure heroImages is an array
  const filteredHeroImages = (heroImages || [])
    .filter((img) => deviceFilter === "all" || img.deviceType === deviceFilter)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const getDeviceIcon = (deviceType: "desktop" | "mobile") => {
    return deviceType === "desktop" ? (
      <Monitor className="w-4 h-4" />
    ) : (
      <Smartphone className="w-4 h-4" />
    );
  };

  const getDeviceLabel = (deviceType: "desktop" | "mobile") => {
    return deviceType === "desktop" ? "دسکتاپ" : "موبایل";
  };

  return (
    <div>
      <AdminPageHeader
        title="مدیریت تصاویر هیرو"
        actions={
          <div className="flex items-center gap-3">
            <AdminSelect
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value as DeviceFilter)}
              className="w-auto cursor-pointer"
              aria-label="فیلتر دستگاه"
            >
              <option value="all">همه دستگاه‌ها</option>
              <option value="desktop">دسکتاپ</option>
              <option value="mobile">موبایل</option>
            </AdminSelect>
            <Button variant="primary" size="sm" onClick={handleCreate} className="rounded-xl">
              <Plus className="ml-2 w-4 h-4" />
              افزودن تصویر
            </Button>
          </div>
        }
      />

      {isLoading && <AdminLoading message="در حال بارگذاری تصاویر..." />}
      {error && <AdminError message={error} onRetry={fetchHeroImages} />}

      {!isLoading && !error && filteredHeroImages.length === 0 && (
        <AdminEmpty
          icon={ImageIcon}
          title="هیچ تصویر هیرویی یافت نشد"
          action={
            <Button variant="primary" size="sm" onClick={handleCreate} className="rounded-xl">
              <Plus className="ml-2 w-4 h-4" />
              اولین تصویر را اضافه کنید
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
        {filteredHeroImages.map((heroImage) => {
          const content = heroImage.content ? normalizeHeroContent(heroImage.content) : null;
          const hasVisibleText =
            !!content && content.enabled && content.elements.some((el) => el.visible);

          return (
          <motion.div
            key={heroImage.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Card
              className={`border-2 rounded-2xl overflow-hidden bg-white/90 dark:bg-voxcina-blue/10 transition-all h-full ${
                heroImage.isActive
                  ? "border-green-400 dark:border-green-800/50 ring-2 ring-green-100 dark:ring-green-900/20"
                  : "border-voxcina-cream dark:border-voxcina-blue/20 opacity-70"
              }`}
            >
            {/* Image Preview */}
            <div className={`relative ${heroImage.deviceType === "desktop" ? "aspect-video" : "aspect-[3/4]"} bg-voxcina-cream/40 dark:bg-voxcina-blue/20`}>
              <Image
                src={heroImage.image}
                alt={`Hero ${heroImage.deviceType}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
              {/* Gradient Preview Overlay */}
              {content ? (
                content.overlay.enabled && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: buildGradient(
                        content.overlay.direction,
                        content.overlay.from,
                        content.overlay.via,
                        content.overlay.to
                      ),
                      opacity: content.overlay.opacity / 100,
                    }}
                  />
                )
              ) : (
                !heroImage.noGradient && (
                  <div
                    className={`absolute inset-0 opacity-50 ${
                      heroImage.gradient || DEFAULT_GRADIENT
                    }`}
                  />
                )
              )}
              {/* Content Badge */}
              {hasVisibleText && (
                <div className="absolute bottom-2 left-2 bg-voxcina-blue/90 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1 z-10">
                  <Type className="w-3 h-3" />
                  محتوای متنی
                </div>
              )}
              {/* Device Badge */}
              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1 z-10">
                {getDeviceIcon(heroImage.deviceType)}
                {getDeviceLabel(heroImage.deviceType)}
              </div>
              {/* Aspect Ratio Badge */}
              <div className="absolute bottom-2 right-2 bg-white/90 text-voxcina-blue px-2 py-1 rounded-lg text-xs z-10">
                {heroImage.deviceType === "desktop" ? "۱۶:۹" : "۳:۴"}
              </div>
              {/* Display Order Badge */}
              <div className="absolute top-2 left-2 bg-voxcina-blue text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold z-10">
                {heroImage.displayOrder}
              </div>
            </div>

            {/* Card Content */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                {/* Status Badge */}
                <AdminBadge tone={heroImage.isActive ? "success" : "neutral"}>
                  {heroImage.isActive ? "فعال" : "غیرفعال"}
                </AdminBadge>
                {/* Gradient Status */}
                <span className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
                  {content
                    ? content.overlay.enabled
                      ? "با گرادیان"
                      : "بدون گرادیان"
                    : heroImage.noGradient
                      ? "بدون گرادیان"
                      : "با گرادیان"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(heroImage)}
                  className="rounded-xl"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteTarget(heroImage)}
                  className="rounded-xl"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
            </Card>
          </motion.div>
          );
        })}
      </motion.div>

      {isModalOpen && (
        <HeroImageForm
          heroImage={selectedHeroImage}
          onClose={handleModalClose}
        />
      )}

      <AdminModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف تصویر هیرو"
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
          آیا از حذف این تصویر هیرو مطمئن هستید؟ این عمل قابل بازگشت نیست.
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
            حذف تصویر
          </Button>
        </AdminModalActions>
      </AdminModal>
    </div>
  );
}
