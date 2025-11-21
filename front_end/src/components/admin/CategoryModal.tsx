"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { Category } from "@/types/category";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: Category | null;
  onSubmit: (formData: FormData) => Promise<void>;
  categories: Category[];
  isLoading: boolean;
}

export default function CategoryModal({
  isOpen,
  onClose,
  editingCategory,
  onSubmit,
  categories,
  isLoading,
}: CategoryModalProps) {
  const [name, setName] = useState(editingCategory?.name || "");
  const [slug, setSlug] = useState(editingCategory?.slug || "");
  const [description, setDescription] = useState(editingCategory?.description || "");
  const [parentId, setParentId] = useState(editingCategory?.parent_id || null);
  const [isActive, setIsActive] = useState(editingCategory?.is_active ?? true);
  const [showInHeader, setShowInHeader] = useState(editingCategory?.show_in_header ?? false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Update state when editingCategory changes
  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name || "");
      setSlug(editingCategory.slug || "");
      setDescription(editingCategory.description || "");
      setParentId(editingCategory.parent_id || null);
      setIsActive(editingCategory.is_active ?? true);
      setShowInHeader(editingCategory.show_in_header ?? false);
      setImageFile(null); // Reset image file when switching to edit mode
    } else {
      // Reset to empty state for adding new category
      setName("");
      setSlug("");
      setDescription("");
      setParentId(null);
      setIsActive(true);
      setShowInHeader(false);
      setImageFile(null);
    }
  }, [editingCategory]);

  const handleSubmit = async () => {
    if (!name) return;

    const formData = new FormData();
    formData.append("name", name);
    if (slug) formData.append("slug", slug);
    if (description) formData.append("description", description);
    if (parentId) formData.append("parent_id", parentId);
    formData.append("is_active", String(isActive));
    formData.append("show_in_header", String(showInHeader));
    if (imageFile) {
      formData.append("image", imageFile);
    }

    await onSubmit(formData);
  };

  const handleClose = () => {
    // Reset form state
    setName("");
    setSlug("");
    setDescription("");
    setParentId(null);
    setIsActive(true);
    setShowInHeader(false);
    setImageFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
      <motion.div
        className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-md mx-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex justify-between items-center p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
          <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
            {editingCategory ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
            onClick={handleClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              نام دسته‌بندی <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              نامک (Slug)
            </label>
            <input
              type="text"
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              توضیحات
            </label>
            <textarea
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              دسته‌بندی والد
            </label>
            <select
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              value={parentId || ""}
              onChange={(e) => setParentId(e.target.value || null)}
            >
              <option value="">بدون والد (دسته‌بندی اصلی)</option>
              {isLoading ? (
                <option value="" disabled>در حال بارگذاری دسته‌بندی‌ها...</option>
              ) : (
                categories
                  .filter((cat) => !editingCategory || cat.id !== editingCategory.id)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id!}>
                      {cat.name}
                    </option>
                  ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              تصویر دسته‌بندی
            </label>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-voxcina-blue dark:text-voxcina-cream file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-voxcina-cream/50 dark:file:bg-voxcina-blue/50 file:text-voxcina-blue dark:file:text-voxcina-cream hover:file:bg-voxcina-cream dark:hover:file:bg-voxcina-blue cursor-pointer"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImageFile(e.target.files[0]);
                }
              }}
            />
            {editingCategory?.image && !imageFile && (
              <div className="mt-2">
                <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">تصویر فعلی:</p>
                <img src={editingCategory.image} alt="Current category" className="w-20 h-20 rounded-md object-cover mt-1" />
              </div>
            )}
            {imageFile && (
              <div className="mt-2">
                <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">پیش‌نمایش تصویر جدید:</p>
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="New category preview"
                  className="w-20 h-20 rounded-md object-cover mt-1"
                />
              </div>
            )}
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              className="rounded text-voxcina-blue focus:ring-voxcina-blue mr-2 h-4 w-4"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label
              htmlFor="isActive"
              className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer"
            >
              دسته‌بندی فعال است
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showInHeader"
              className="rounded text-voxcina-blue focus:ring-voxcina-blue mr-2 h-4 w-4"
              checked={showInHeader}
              onChange={(e) => setShowInHeader(e.target.checked)}
            />
            <label
              htmlFor="showInHeader"
              className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer"
            >
              نمایش در هدر سایت
            </label>
          </div>
        </div>
        <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            onClick={handleClose}
            disabled={isLoading}
          >
            انصراف
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300 min-w-[80px]"
            onClick={handleSubmit}
            disabled={isLoading || !name}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : editingCategory ? (
              "به‌روزرسانی"
            ) : (
              "افزودن"
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
