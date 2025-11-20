"use client";

import { useEffect, useState, useRef } from "react";
import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import { useAuthStore } from "@/store/auth-store";
import { ProductVariant, ProductAttribute } from "@/types/product";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function AddProductPage() {
  const router = useRouter();
  const { adminToken } = useAuthStore();
  const { brands, categories, fetchBrands, fetchCategories, createProduct, isLoading, error } = useProductStore();
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
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [categorySearch, setCategorySearch] = useState("");

  const [gender, setGender] = useState("مردانه");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiMetadata, setAiMetadata] = useState({
    namePersian: "",
    descriptionPersian: "",
    keywords: [] as string[],
    tags: [] as string[],
    materialPersian: "",
    stylePersian: "",
    occasionTags: [] as string[],
    season: [] as string[],
    fitType: "معمولی",
    ageGroup: "بزرگسال",
  });
  const [keywordsInput, setKeywordsInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [occasionInput, setOccasionInput] = useState("");
  const [seasonInput, setSeasonInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [originalPriceInput, setOriginalPriceInput] = useState("");

  const hasDiscount = originalPrice > 0 && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  const hasInvalidDiscount = originalPrice > 0 && originalPrice < price;

  useEffect(() => {
    fetchBrands();
    fetchCategories();
  }, [fetchBrands, fetchCategories]);

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

  const canGenerateAiMetadata =
    !!name &&
    !!description &&
    price > 0 &&
    categoryIds.length > 0 &&
    !!brandId;

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

  const handleKeywordsChange = (value: string) => {
    setKeywordsInput(value);
    const parts = value.split(",").map(k => k.trim()).filter(k => k);
    setAiMetadata(prev => ({ ...prev, keywords: parts }));
  };

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    const parts = value.split(",").map(t => t.trim()).filter(t => t);
    setAiMetadata(prev => ({ ...prev, tags: parts }));
  };

  const handleOccasionChange = (value: string) => {
    setOccasionInput(value);
    const parts = value.split(",").map(t => t.trim()).filter(t => t);
    setAiMetadata(prev => ({ ...prev, occasionTags: parts }));
  };

  const handleSeasonChange = (value: string) => {
    setSeasonInput(value);
    const parts = value.split(",").map(t => t.trim()).filter(t => t);
    setAiMetadata(prev => ({ ...prev, season: parts }));
  };

  const formatPrice = (value: number) => {
    if (!value) return "";
    try {
      return value.toLocaleString("en-US");
    } catch {
      return String(value);
    }
  };

  const handlePriceInputChange = (e: any) => {
    const raw = String(e.target.value)
      .replace(/,/g, "")
      .replace(/[^0-9]/g, "");

    if (raw === "") {
      setPrice(0);
      setPriceInput("");
      return;
    }

    const numeric = Number(raw);
    if (Number.isNaN(numeric)) {
      return;
    }

    setPrice(numeric);
    setPriceInput(formatPrice(numeric));
  };

  const handleOriginalPriceInputChange = (e: any) => {
    const raw = String(e.target.value)
      .replace(/,/g, "")
      .replace(/[^0-9]/g, "");

    if (raw === "") {
      setOriginalPrice(0);
      setOriginalPriceInput("");
      return;
    }

    const numeric = Number(raw);
    if (Number.isNaN(numeric)) {
      return;
    }

    setOriginalPrice(numeric);
    setOriginalPriceInput(formatPrice(numeric));
  };

  const handleGenerateAiMetadata = async () => {
    if (!canGenerateAiMetadata || aiGenerating) return;

    const primaryCategory = categories.find(c => c.id === categoryIds[0])?.name || "";
    const brandName = brands.find(b => b.id === brandId)?.name || "";

    setAiGenerating(true);
    try {
      const response = await fetch("/api/admin/ai/generate-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          category: primaryCategory,
          brand: brandName,
          price,
          gender,
          images: [] as string[],
          model: "",
        }),
      });

      if (!response.ok) {
        let message = "خطا در تولید خودکار اطلاعات محصول";
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            message = errorData.message;
          }
        } catch {
          // ignore JSON parse errors
        }
        toast.error(message);
        return;
      }

      const data = await response.json();
      const generated = data?.data || data;

      setAiMetadata(prev => ({
        ...prev,
        namePersian: generated.namePersian || prev.namePersian,
        descriptionPersian: generated.descriptionPersian || prev.descriptionPersian,
        keywords: Array.isArray(generated.keywords) ? generated.keywords : prev.keywords,
        tags: Array.isArray(generated.tags) ? generated.tags : prev.tags,
        materialPersian: generated.materialPersian || prev.materialPersian,
        stylePersian: generated.stylePersian || prev.stylePersian,
        occasionTags: Array.isArray(generated.occasionTags) ? generated.occasionTags : prev.occasionTags,
        season: Array.isArray(generated.season) ? generated.season : prev.season,
        fitType: generated.fitType || prev.fitType,
        ageGroup: generated.ageGroup || prev.ageGroup,
      }));

      if (Array.isArray(generated.keywords)) {
        setKeywordsInput(generated.keywords.join(", "));
      }
      if (Array.isArray(generated.tags)) {
        setTagsInput(generated.tags.join(", "));
      }
      if (Array.isArray(generated.occasionTags)) {
        setOccasionInput(generated.occasionTags.join(", "));
      }
      if (Array.isArray(generated.season)) {
        setSeasonInput(generated.season.join(", "));
      }

      toast.success("فیلدهای AI با موفقیت تولید شدند. لطفاً آن‌ها را بررسی و در صورت نیاز ویرایش کنید.");
    } catch (err) {
      toast.error("خطا در ارتباط با سرویس هوش مصنوعی");
    } finally {
      setAiGenerating(false);
    }
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
    if (aiMetadata.namePersian || aiMetadata.descriptionPersian || aiMetadata.keywords.length || aiMetadata.tags.length) {
      const searchMetadata = {
        namePersian: aiMetadata.namePersian,
        descriptionPersian: aiMetadata.descriptionPersian,
        keywords: aiMetadata.keywords,
        tags: aiMetadata.tags,
        materialPersian: aiMetadata.materialPersian,
        materialEnglish: "",
        materialTags: [] as string[],
        stylePersian: aiMetadata.stylePersian,
        styleEnglish: "",
        occasionTags: aiMetadata.occasionTags,
        season: aiMetadata.season,
        sizeSystem: "",
        fitType: aiMetadata.fitType,
        gender,
        ageGroup: aiMetadata.ageGroup,
      };
      formData.append("searchMetadata", JSON.stringify(searchMetadata));
    }
    formData.append("isFlashSale", isFlashSale ? "true" : "false");
    formData.append("isActive", isActive ? "true" : "false");
    formData.append("inStock", inStock ? "true" : "false");
    if (tryOnImageFile) {
      formData.append("tryOnImage", tryOnImageFile);
    }
    if (images) {
      Array.from(images).forEach((file) => formData.append("mainImages", file));
    }
    const result = await createProduct(formData, adminToken);
    setSubmitting(false);
    if (result) {
      toast.success("محصول با موفقیت ایجاد شد");
      router.push("/admin/products");
    } else {
      toast.error(error || "خطا در ایجاد محصول");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">افزودن محصول جدید</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-1">نام محصول *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1">توضیحات</label>
          <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1">قیمت نهایی (تومان) *</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                placeholder="مثال: 450000"
                value={priceInput}
                onChange={handlePriceInputChange}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                قیمتی که خریدار در سایت مشاهده و پرداخت می‌کند.
              </p>
            </div>
            <div className="flex-1">
              <label className="block mb-1">قیمت اصلی (تومان)</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                placeholder="مثال: 550000"
                value={originalPriceInput}
                onChange={handleOriginalPriceInputChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                در صورت ثبت تخفیف، قیمت اصلی قبل از تخفیف را اینجا وارد کنید.
              </p>
            </div>
          </div>
          {hasDiscount && (
            <p className="text-xs text-green-600">
              تخفیف فعلی: {discountPercent}%
            </p>
          )}
          {!hasDiscount && hasInvalidDiscount && (
            <p className="text-xs text-red-600">
              هشدار: قیمت اصلی کمتر از قیمت نهایی است. در صورت نداشتن تخفیف، قیمت اصلی را خالی بگذارید یا بزرگ‌تر از قیمت نهایی تنظیم کنید.
            </p>
          )}
        </div>
        <div>
          <label className="block mb-1">جنسیت *</label>
          <select className="input" value={gender} onChange={e => setGender(e.target.value)}>
            <option value="مردانه">مردانه</option>
            <option value="زنانه">زنانه</option>
            <option value="یونیسکس">یونیسکس</option>
          </select>
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
          <label className="block mb-1">تصاویر محصول</label>
          <input className="input" type="file" multiple accept="image/*" onChange={handleImageChange} />
        </div>
        <div>
          <label className="block mb-1">تصویر واقعیت افزوده (اختیاری)</label>
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
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold">فیلدهای هوش مصنوعی برای جستجوی بهتر</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canGenerateAiMetadata || aiGenerating || submitting || isLoading}
              onClick={handleGenerateAiMetadata}
            >
              {aiGenerating ? "در حال تولید..." : "تکمیل خودکار با AI"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            پس از پر کردن نام، توضیحات، قیمت، دسته‌بندی و برند، می‌توانید با دکمه بالا فیلدهای کمکی برای چت‌بات و جستجوی هوشمند را به صورت خودکار تولید کنید و در صورت نیاز ویرایش نمایید.
          </p>
          <div>
            <label className="block mb-1">نام فارسی محصول</label>
            <input
              className="input"
              dir="rtl"
              value={aiMetadata.namePersian}
              onChange={e => setAiMetadata(prev => ({ ...prev, namePersian: e.target.value }))}
            />
          </div>
          <div>
            <label className="block mb-1">توضیحات فارسی محصول</label>
            <textarea
              className="input"
              dir="rtl"
              value={aiMetadata.descriptionPersian}
              onChange={e => setAiMetadata(prev => ({ ...prev, descriptionPersian: e.target.value }))}
            />
          </div>
          <div>
            <label className="block mb-1">کلمات کلیدی (با کاما جدا شوند)</label>
            <input
              className="input"
              dir="rtl"
              value={keywordsInput}
              onChange={e => handleKeywordsChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">برچسب‌ها (با کاما جدا شوند)</label>
            <input
              className="input"
              dir="rtl"
              value={tagsInput}
              onChange={e => handleTagsChange(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1">جنس (فارسی)</label>
              <input
                className="input"
                dir="rtl"
                value={aiMetadata.materialPersian}
                onChange={e => setAiMetadata(prev => ({ ...prev, materialPersian: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1">استایل (فارسی)</label>
              <input
                className="input"
                dir="rtl"
                value={aiMetadata.stylePersian}
                onChange={e => setAiMetadata(prev => ({ ...prev, stylePersian: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block mb-1">موقعیت‌های استفاده (با کاما جدا شوند)</label>
            <input
              className="input"
              dir="rtl"
              value={occasionInput}
              onChange={e => handleOccasionChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">فصل‌های مناسب (با کاما جدا شوند)</label>
            <input
              className="input"
              dir="rtl"
              value={seasonInput}
              onChange={e => handleSeasonChange(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1">نوع برازش</label>
              <select
                className="input"
                value={aiMetadata.fitType}
                onChange={e => setAiMetadata(prev => ({ ...prev, fitType: e.target.value }))}
              >
                <option value="معمولی">معمولی (Regular)</option>
                <option value="تنگ">تنگ (Slim)</option>
                <option value="گشاد">گشاد (Oversized)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block mb-1">گروه سنی</label>
              <select
                className="input"
                value={aiMetadata.ageGroup}
                onChange={e => setAiMetadata(prev => ({ ...prev, ageGroup: e.target.value }))}
              >
                <option value="بزرگسال">بزرگسال</option>
                <option value="نوجوان">نوجوان</option>
                <option value="کودک">کودک</option>
              </select>
            </div>
          </div>
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
        <Button type="submit" variant="primary" disabled={submitting || isLoading}>{submitting ? "در حال ثبت..." : "ثبت محصول"}</Button>
        {error && <div className="text-red-500">{error}</div>}
      </form>
    </div>
  );
} 