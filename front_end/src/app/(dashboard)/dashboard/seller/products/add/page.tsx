"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Package,
  Upload,
  X,
  Plus,
  Loader2,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";
import { useSellerStore } from "@/store/seller-store";
import { useCategoryStore } from "@/store/category-store";
import { useBrandStore } from "@/store/brand-store";
import { useAuthStore } from "@/store/auth-store";
import { ProductVariant, ProductAttribute } from "@/types/product";

export default function AddProductPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addProduct, isLoading } = useSellerStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { brands, fetchBrands } = useBrandStore();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    categoryIds: [] as string[],
    brandId: "",
    collection: "",
    inStock: true,
  });

  const [mainImages, setMainImages] = useState<File[]>([]);
  const [mainImagePreviews, setMainImagePreviews] = useState<string[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);

  useEffect(() => {
    if (user?.role !== "seller") {
      router.push("/dashboard/become-seller");
      return;
    }
    fetchCategories();
    fetchBrands();
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + mainImages.length > 10) {
      alert("حداکثر 10 تصویر می‌توانید آپلود کنید");
      return;
    }

    setMainImages((prev) => [...prev, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMainImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setMainImages((prev) => prev.filter((_, i) => i !== index));
    setMainImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        size: "",
        color: "",
        colorName: "",
        sku: "",
        quantity: 0,
        images: [],
      },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const addAttribute = () => {
    setAttributes((prev) => [...prev, { name: "", value: "" }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAttribute = (index: number, field: keyof ProductAttribute, value: string) => {
    setAttributes((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("price", formData.price);
    formDataToSend.append("originalPrice", formData.originalPrice || formData.price);
    formDataToSend.append("categoryIds", JSON.stringify(formData.categoryIds));
    if (formData.brandId) {
      formDataToSend.append("brandId", formData.brandId);
    }
    if (formData.collection) {
      formDataToSend.append("collection", formData.collection);
    }
    formDataToSend.append("inStock", formData.inStock.toString());
    formDataToSend.append("variants", JSON.stringify(variants));
    formDataToSend.append("attributes", JSON.stringify(attributes));

    // Add images
    mainImages.forEach((image) => {
      formDataToSend.append("mainImages", image);
    });

    try {
      await addProduct(formDataToSend);
      router.push("/dashboard/seller/products");
    } catch (error) {
      console.error("Failed to add product:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-voxcina-blue/30 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream">
            افزودن محصول جدید
          </h1>
          <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
            محصول جدید به فروشگاه خود اضافه کنید
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-voxcina-blue/50 rounded-xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream mb-4">
            اطلاعات اصلی
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                نام محصول *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="نام محصول را وارد کنید"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                توضیحات
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="توضیحات محصول..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  قیمت (تومان) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  min="0"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  قیمت اصلی (تومان)
                </label>
                <input
                  type="number"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                  min="0"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="برای نمایش تخفیف"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  دسته‌بندی *
                </label>
                <select
                  multiple
                  value={formData.categoryIds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      categoryIds: Array.from(e.target.selectedOptions, (option) => option.value),
                    })
                  }
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  size={4}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1">
                  Ctrl+کلیک برای انتخاب چند دسته
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  برند
                </label>
                <select
                  value={formData.brandId}
                  onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">انتخاب برند</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                کالکشن
              </label>
              <select
                value={formData.collection}
                onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">انتخاب کالکشن</option>
                <option value="بهار">بهار</option>
                <option value="تابستان">تابستان</option>
                <option value="پاییز">پاییز</option>
                <option value="زمستان">زمستان</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inStock"
                checked={formData.inStock}
                onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                className="w-4 h-4 text-green-500 rounded focus:ring-green-500"
              />
              <label
                htmlFor="inStock"
                className="text-sm text-voxcina-blue dark:text-voxcina-cream"
              >
                موجود در انبار
              </label>
            </div>
          </div>
        </motion.div>

        {/* Images */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-voxcina-blue/50 rounded-xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream mb-4">
            تصاویر محصول
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {mainImagePreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {mainImages.length < 10 && (
                <label className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">آپلود تصویر</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
              حداکثر 10 تصویر - فرمت: JPG, PNG
            </p>
          </div>
        </motion.div>

        {/* Variants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-voxcina-blue/50 rounded-xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream">
              تنوع محصول (سایز/رنگ)
            </h2>
            <button
              type="button"
              onClick={addVariant}
              className="inline-flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              افزودن تنوع
            </button>
          </div>

          <div className="space-y-4">
            {variants.map((variant, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                    تنوع {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="سایز"
                    value={variant.size}
                    onChange={(e) => updateVariant(index, "size", e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream text-sm"
                  />
                  <input
                    type="text"
                    placeholder="رنگ"
                    value={variant.color}
                    onChange={(e) => updateVariant(index, "color", e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream text-sm"
                  />
                  <input
                    type="text"
                    placeholder="SKU"
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, "sku", e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream text-sm"
                  />
                  <input
                    type="number"
                    placeholder="تعداد"
                    value={variant.quantity}
                    onChange={(e) => updateVariant(index, "quantity", parseInt(e.target.value) || 0)}
                    min="0"
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-voxcina-blue dark:text-voxcina-cream rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-voxcina-blue/30 transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                در حال افزودن...
              </>
            ) : (
              <>
                <Package className="w-5 h-5" />
                افزودن محصول
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
