"use client";

import { useEffect, useState, useRef } from "react";
import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import { useAuthStore } from "@/store/auth-store";
import { ProductVariant, ProductAttribute, Product } from "@/types/product";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const { adminToken } = useAuthStore();
  const { brands, categories, fetchBrands, fetchCategories, fetchProductById, updateProduct, activeProduct, isLoading, error } = useProductStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [brandId, setBrandId] = useState("");
  const [images, setImages] = useState<FileList | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [inStock, setInStock] = useState(true);
  const [tryOnImageFile, setTryOnImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [categorySearch, setCategorySearch] = useState("");

  useEffect(() => {
    fetchBrands();
    fetchCategories();
    if (productId) {
      fetchProductById(productId);
    }
  }, [fetchBrands, fetchCategories, fetchProductById, productId]);

  useEffect(() => {
    if (activeProduct && !loaded) {
      setName(activeProduct.name);
      setDescription(activeProduct.description);
      setPrice(activeProduct.price);
      setOriginalPrice(activeProduct.originalPrice);
      setCategoryIds(activeProduct.category_ids || []);
      setBrandId(activeProduct.brand_id || "");
      setVariants(activeProduct.variants || []);
      setAttributes(activeProduct.attributes || []);
      setIsFlashSale(activeProduct.is_flash_sale);
      setIsActive(activeProduct.is_active);
      setInStock(activeProduct.inStock);
      setLoaded(true);
    }
  }, [activeProduct, loaded]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = categories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImages(e.target.files);
  };

  const handleAddVariant = () => {
    setVariants([...variants, { size: "", color: "", sku: "", quantity: 0, images: [] }]);
  };
  const handleVariantChange = (idx: number, field: keyof ProductVariant, value: any) => {
    setVariants(variants.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };
  const handleRemoveVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleAddAttribute = () => {
    setAttributes([...attributes, { name: "", value: "" }]);
  };
  const handleAttributeChange = (idx: number, field: keyof ProductAttribute, value: any) => {
    setAttributes(attributes.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };
  const handleRemoveAttribute = (idx: number) => {
    setAttributes(attributes.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) {
      toast.error("دسترسی ادمین ندارید");
      return;
    }
    if (!name || !price || !categoryIds.length || !brandId) {
      toast.error("لطفا همه فیلدهای ضروری را پر کنید");
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price.toString());
    formData.append("originalPrice", originalPrice ? originalPrice.toString() : price.toString());
    formData.append("categoryIds", JSON.stringify(categoryIds));
    formData.append("brandId", brandId);
    formData.append("variants", JSON.stringify(variants));
    formData.append("attributes", JSON.stringify(attributes));
    formData.append("isFlashSale", isFlashSale ? "true" : "false");
    formData.append("isActive", isActive ? "true" : "false");
    formData.append("inStock", inStock ? "true" : "false");
    if (images) {
      Array.from(images).forEach((file) => formData.append("images", file));
    }
    if (tryOnImageFile) {
      formData.append("tryOnImage", tryOnImageFile);
    }
    const result = await updateProduct(productId, formData, adminToken);
    setSubmitting(false);
    if (result) {
      toast.success("محصول با موفقیت ویرایش شد");
      router.push("/admin/products");
    } else {
      toast.error(error || "خطا در ویرایش محصول");
    }
  };

  if (!activeProduct && isLoading) {
    return <div className="text-center py-8">در حال بارگذاری...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">ویرایش محصول</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-1">نام محصول *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1">توضیحات</label>
          <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block mb-1">قیمت *</label>
            <input className="input" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} required />
          </div>
          <div className="flex-1">
            <label className="block mb-1">قیمت اصلی</label>
            <input className="input" type="number" value={originalPrice} onChange={e => setOriginalPrice(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="block mb-1">دسته‌بندی *</label>
          <div className="relative" ref={categoryDropdownRef}>
            <div
              className="input flex flex-wrap gap-1 min-h-[40px] cursor-pointer bg-white border border-gray-300 rounded px-2 py-1"
              onClick={() => setCategoryDropdownOpen(v => !v)}
              tabIndex={0}
            >
              {categoryIds.filter(Boolean).map(id => {
                const cat = categories.find(c => c.id === id);
                return cat && cat.id ? (
                  <span key={cat.id} className="bg-blue-100 text-blue-700 rounded px-2 py-0.5 flex items-center gap-1 text-xs">
                    {cat.name}
                    <button type="button" className="ml-1 text-blue-500 hover:text-red-500" onClick={e => {e.stopPropagation(); setCategoryIds(categoryIds.filter(cid => cid !== id));}}>
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
            {categoryDropdownOpen && (
              <div className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full max-h-60 overflow-y-auto">
                <input
                  className="w-full px-2 py-1 border-b border-gray-200 focus:outline-none"
                  placeholder="جستجو..."
                  value={categorySearch}
                  onChange={e => setCategorySearch(e.target.value)}
                />
                {filteredCategories.length === 0 && <div className="p-2 text-gray-400">دسته‌بندی یافت نشد</div>}
                {filteredCategories.map(cat => (
                  cat.id ? (
                    <div
                      key={cat.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center gap-2 ${categoryIds.includes(cat.id!) ? "bg-blue-100" : ""}`}
                      onClick={() => {
                        if (!categoryIds.includes(cat.id!)) setCategoryIds([...categoryIds, cat.id!]);
                        else setCategoryIds(categoryIds.filter(cid => cid !== cat.id!));
                      }}
                    >
                      <input type="checkbox" checked={categoryIds.includes(cat.id!)} readOnly className="mr-2" />
                      {cat.name}
                    </div>
                  ) : null
                ))}
              </div>
            )}
          </div>
          <Link href="/admin/categories/add" className="text-blue-600 text-sm">+ دسته‌بندی جدید</Link>
        </div>
        <div>
          <label className="block mb-1">برند *</label>
          <select className="input" value={brandId} onChange={e => setBrandId(e.target.value)} required>
            <option value="">انتخاب برند</option>
            {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
          <Link href="/admin/brands/add" className="text-blue-600 text-sm">+ برند جدید</Link>
        </div>
        <div>
          <label className="block mb-1">تصاویر محصول (برای افزودن تصاویر جدید انتخاب کنید)</label>
          <input className="input" type="file" multiple accept="image/*" onChange={handleImageChange} />
        </div>
        <div>
          <label className="block mb-1">تصویر واقعیت افزوده جدید (اختیاری)</label>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => setTryOnImageFile(e.target.files?.[0] || null)}
          />
          {tryOnImageFile && (
            <span className="text-xs text-voxcina-blue/60">{tryOnImageFile.name}</span>
          )}
        </div>
        <div>
          <label className="block mb-1">تنوع‌ها (سایز/رنگ/موجودی)</label>
          {variants.map((variant, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-center">
              <input className="input w-16" placeholder="سایز" value={variant.size} onChange={e => handleVariantChange(idx, "size", e.target.value)} />
              <input className="input w-16" placeholder="رنگ" value={variant.color} onChange={e => handleVariantChange(idx, "color", e.target.value)} />
              <input className="input w-24" placeholder="SKU" value={variant.sku} onChange={e => handleVariantChange(idx, "sku", e.target.value)} />
              <input className="input w-20" type="number" placeholder="موجودی" value={variant.quantity} onChange={e => handleVariantChange(idx, "quantity", Number(e.target.value))} />
              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveVariant(idx)}>حذف</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={handleAddVariant}>+ تنوع جدید</Button>
        </div>
        <div>
          <label className="block mb-1">ویژگی‌ها</label>
          {attributes.map((attr, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-center">
              <input className="input w-32" placeholder="نام ویژگی" value={attr.name} onChange={e => handleAttributeChange(idx, "name", e.target.value)} />
              <input className="input w-32" placeholder="مقدار" value={attr.value} onChange={e => handleAttributeChange(idx, "value", e.target.value)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAttribute(idx)}>حذف</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={handleAddAttribute}>+ ویژگی جدید</Button>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isFlashSale} onChange={e => setIsFlashSale(e.target.checked)} />
            فروش ویژه
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            فعال
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} />
            موجود
          </label>
        </div>
        <Button type="submit" variant="primary" disabled={submitting || isLoading}>{submitting ? "در حال ثبت..." : "ثبت تغییرات"}</Button>
        {error && <div className="text-red-500">{error}</div>}
      </form>
    </div>
  );
} 