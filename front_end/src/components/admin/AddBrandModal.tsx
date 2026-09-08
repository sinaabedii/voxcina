"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { useBrandStore } from "@/store/brand-store";
import toast from "react-hot-toast";
import {
  AdminModal,
  AdminModalActions,
  AdminField,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/ui";

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
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="افزودن برند جدید"
      size="md"
    >
      <div className="space-y-4">
        <AdminField label="نام برند" required>
          <AdminInput
            type="text"
            value={newBrand.name}
            onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
          />
        </AdminField>
        <AdminField label="نامک (Slug)" required>
          <AdminInput
            type="text"
            value={newBrand.slug}
            onChange={(e) => setNewBrand({ ...newBrand, slug: e.target.value })}
          />
        </AdminField>
        <AdminField label="توضیحات">
          <AdminTextarea
            rows={3}
            value={newBrand.description}
            onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
          />
        </AdminField>
        <AdminField label="وب‌سایت">
          <AdminInput
            type="url"
            placeholder="https://example.com"
            value={newBrand.website}
            onChange={(e) => setNewBrand({ ...newBrand, website: e.target.value })}
          />
        </AdminField>
        <AdminField label="لوگو">
          <AdminInput
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
          />
        </AdminField>
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
      <AdminModalActions onCancel={onClose}>
        <Button
          variant="primary"
          size="sm"
          className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
          onClick={handleAddBrand}
          disabled={!newBrand.name || !newBrand.slug || isLoading}
        >
          {isLoading ? "در حال افزودن..." : "افزودن برند"}
        </Button>
      </AdminModalActions>
    </AdminModal>
  );
}
