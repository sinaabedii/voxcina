"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import { useBrandStore } from "@/store/brand-store";
import toast from "react-hot-toast";

interface AddBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddBrandModal({ isOpen, onClose, onSuccess }: AddBrandModalProps) {
  const { createBrand, isLoading } = useBrandStore();

  const [newBrand, setNewBrand] = useState({
    name: "",
    slug: "",
    description: "",
    website: "",
    logo: null as File | null,
    isActive: true,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewBrand({
        name: "",
        slug: "",
        description: "",
        website: "",
        logo: null,
        isActive: true,
      });
    }
  }, [isOpen]);

  const handleAddBrand = async () => {
    try {
      if (!newBrand.name || !newBrand.slug) {
        toast.error("نام و نامک (slug) الزامی هستند");
        return;
      }
      const formData = new FormData();
      formData.append("name", newBrand.name);
      formData.append("slug", newBrand.slug);
      formData.append("description", newBrand.description);
      formData.append("website", newBrand.website);
      formData.append("isActive", String(newBrand.isActive));

      if (newBrand.logo) {
        formData.append("logo", newBrand.logo);
      }

      const result = await createBrand(formData);

      if (result) {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          // If no onSuccess provided, the store updates automatically, 
          // but caller might want to refresh lists or select the new brand.
        }
      }
    } catch (error) {
      // Error handled by store
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewBrand({ ...newBrand, logo: file });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
      <motion.div
        className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex justify-between items-center p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
          <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
            افزودن برند جدید
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              نام برند
            </label>
            <input
              type="text"
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              value={newBrand.name}
              onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              نامک (Slug)
            </label>
            <input
              type="text"
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              value={newBrand.slug}
              onChange={(e) => setNewBrand({ ...newBrand, slug: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              توضیحات
            </label>
            <textarea
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              rows={3}
              value={newBrand.description}
              onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              وب‌سایت
            </label>
            <input
              type="url"
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              placeholder="https://example.com"
              value={newBrand.website}
              onChange={(e) => setNewBrand({ ...newBrand, website: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              لوگو
            </label>
            <input
              type="file"
              accept="image/*"
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              onChange={handleLogoChange}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActiveNewBrand"
              className="rounded text-voxcina-blue focus:ring-voxcina-blue mr-2"
              checked={newBrand.isActive}
              onChange={(e) => setNewBrand({ ...newBrand, isActive: e.target.checked })}
            />
            <label
              htmlFor="isActiveNewBrand"
              className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80"
            >
              برند فعال است
            </label>
          </div>
        </div>
        <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            onClick={onClose}
          >
            انصراف
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
            onClick={handleAddBrand}
            disabled={!newBrand.name || !newBrand.slug || isLoading}
          >
            {isLoading ? "در حال افزودن..." : "افزودن برند"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
