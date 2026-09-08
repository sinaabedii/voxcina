"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Category } from "@/types/category";
import AvatarPicker from "@/components/admin/AvatarPicker";
import {
  AdminModal,
  AdminModalActions,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/ui";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: Category | null;
  onSubmit: (formData: FormData) => Promise<void>;
  categories: Category[];
  isLoading: boolean;
}

const EMPTY = {
  name: "",
  slug: "",
  description: "",
  parentId: null as string | null,
  isActive: true,
  showInHeader: false,
  avatar: "",
};

export default function CategoryModal({
  isOpen,
  onClose,
  editingCategory,
  onSubmit,
  categories,
  isLoading,
}: CategoryModalProps) {
  const [name, setName] = useState(EMPTY.name);
  const [slug, setSlug] = useState(EMPTY.slug);
  const [description, setDescription] = useState(EMPTY.description);
  const [parentId, setParentId] = useState<string | null>(EMPTY.parentId);
  const [isActive, setIsActive] = useState(EMPTY.isActive);
  const [showInHeader, setShowInHeader] = useState(EMPTY.showInHeader);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [avatar, setAvatar] = useState(EMPTY.avatar);

  // Update state when editingCategory changes
  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name || "");
      setSlug(editingCategory.slug || "");
      setDescription(editingCategory.description || "");
      setParentId(editingCategory.parent_id || null);
      setIsActive(editingCategory.is_active ?? true);
      setShowInHeader(editingCategory.show_in_header ?? false);
      setAvatar(editingCategory.avatar || "");
      setImageFile(null); // Reset image file when switching to edit mode
    } else {
      // Reset to empty state for adding new category
      setName(EMPTY.name);
      setSlug(EMPTY.slug);
      setDescription(EMPTY.description);
      setParentId(EMPTY.parentId);
      setIsActive(EMPTY.isActive);
      setShowInHeader(EMPTY.showInHeader);
      setAvatar(EMPTY.avatar);
      setImageFile(null);
    }
  }, [editingCategory]);

  const resetAndClose = () => {
    setName(EMPTY.name);
    setSlug(EMPTY.slug);
    setDescription(EMPTY.description);
    setParentId(EMPTY.parentId);
    setIsActive(EMPTY.isActive);
    setShowInHeader(EMPTY.showInHeader);
    setAvatar(EMPTY.avatar);
    setImageFile(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name) return;

    const formData = new FormData();
    formData.append("name", name);
    if (slug) formData.append("slug", slug);
    if (description) formData.append("description", description);
    if (parentId) formData.append("parent_id", parentId);
    formData.append("is_active", String(isActive));
    formData.append("show_in_header", String(showInHeader));
    // Always send the avatar field (empty string clears it, otherwise sets it)
    formData.append("avatar", avatar || "");
    if (imageFile) {
      formData.append("image", imageFile);
    }

    await onSubmit(formData);
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={editingCategory ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pl-1">
        <AdminField label="نام دسته‌بندی" required>
          <AdminInput
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </AdminField>
        <AdminField label="نامک (Slug)">
          <AdminInput
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </AdminField>
        <AdminField label="توضیحات">
          <AdminTextarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </AdminField>
        <AdminField label="دسته‌بندی والد">
          <AdminSelect
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
          </AdminSelect>
        </AdminField>
        <AdminField label="آواتار دسته‌بندی">
          <AvatarPicker value={avatar} onChange={setAvatar} />
        </AdminField>
        <AdminField label="تصویر دسته‌بندی">
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={editingCategory.image} alt="Current category" className="w-20 h-20 rounded-xl object-cover mt-1" />
            </div>
          )}
          {imageFile && (
            <div className="mt-2">
              <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">پیش‌نمایش تصویر جدید:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(imageFile)}
                alt="New category preview"
                className="w-20 h-20 rounded-xl object-cover mt-1"
              />
            </div>
          )}
        </AdminField>
        <label className="flex items-center gap-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer">
          <input
            type="checkbox"
            className="rounded text-voxcina-blue focus:ring-voxcina-blue h-4 w-4"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          دسته‌بندی فعال است
        </label>
        <label className="flex items-center gap-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer">
          <input
            type="checkbox"
            className="rounded text-voxcina-blue focus:ring-voxcina-blue h-4 w-4"
            checked={showInHeader}
            onChange={(e) => setShowInHeader(e.target.checked)}
          />
          نمایش در هدر سایت
        </label>
      </div>
      <AdminModalActions onCancel={resetAndClose}>
        <Button
          variant="primary"
          size="sm"
          className="rounded-xl min-w-[80px]"
          onClick={handleSubmit}
          disabled={isLoading || !name}
          isLoading={isLoading}
        >
          {editingCategory ? "به‌روزرسانی" : "افزودن"}
        </Button>
      </AdminModalActions>
    </AdminModal>
  );
}
