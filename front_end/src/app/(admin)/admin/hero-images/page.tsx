"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useHeroImageStore } from "@/store/hero-image-store";
import { HeroImage, DEFAULT_GRADIENT } from "@/types/hero-image";
import Button from "@/components/ui/Button";
import { Plus, Edit, Trash2, Monitor, Smartphone, Filter } from "lucide-react";
import { motion } from "framer-motion";
import HeroImageForm from "./HeroImageForm";

type DeviceFilter = "all" | "desktop" | "mobile";

export default function HeroImagesPage() {
  const { heroImages, fetchHeroImages, deleteHeroImage, isLoading, error } = useHeroImageStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHeroImage, setSelectedHeroImage] = useState<HeroImage | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");

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

  const handleDelete = async (id: string) => {
    if (window.confirm("آیا از حذف این تصویر هیرو مطمئن هستید؟")) {
      await deleteHeroImage(id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedHeroImage(null);
  };

  // Filter and sort hero images
  const filteredHeroImages = heroImages
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
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">مدیریت تصاویر هیرو</h1>
        <div className="flex items-center gap-3">
          {/* Device Filter Dropdown */}
          <div className="relative">
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value as DeviceFilter)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              <option value="all">همه دستگاه‌ها</option>
              <option value="desktop">دسکتاپ</option>
              <option value="mobile">موبایل</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <Button onClick={handleCreate}>
            <Plus className="ml-2 w-4 h-4" />
            افزودن تصویر
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">در حال بارگذاری...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!isLoading && filteredHeroImages.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">هیچ تصویر هیرویی یافت نشد</p>
          <Button onClick={handleCreate} className="mt-4">
            <Plus className="ml-2 w-4 h-4" />
            اولین تصویر را اضافه کنید
          </Button>
        </div>
      )}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
      >
        {filteredHeroImages.map((heroImage) => (
          <motion.div
            key={heroImage.id}
            className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition-all ${
              heroImage.isActive
                ? "border-green-400 ring-2 ring-green-100"
                : "border-gray-200 opacity-70"
            }`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            {/* Image Preview */}
            <div className="relative aspect-video bg-gray-100">
              <Image
                src={heroImage.image}
                alt={`Hero ${heroImage.deviceType}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
              {/* Gradient Preview Overlay */}
              {!heroImage.noGradient && (
                <div
                  className={`absolute inset-0 opacity-50 ${
                    heroImage.gradient || DEFAULT_GRADIENT
                  }`}
                />
              )}
              {/* Device Badge */}
              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 z-10">
                {getDeviceIcon(heroImage.deviceType)}
                {getDeviceLabel(heroImage.deviceType)}
              </div>
              {/* Display Order Badge */}
              <div className="absolute top-2 left-2 bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold z-10">
                {heroImage.displayOrder}
              </div>
            </div>

            {/* Card Content */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                {/* Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    heroImage.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {heroImage.isActive ? "فعال" : "غیرفعال"}
                </span>
                {/* Gradient Status */}
                <span className="text-xs text-gray-500">
                  {heroImage.noGradient ? "بدون گرادیان" : "با گرادیان"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(heroImage)}
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(heroImage.id!)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {isModalOpen && (
        <HeroImageForm
          heroImage={selectedHeroImage}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
