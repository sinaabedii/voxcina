"use client";

import { useEffect, useState, useRef } from "react";
import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import { useAuthStore } from "@/store/auth-store";
import { ColorVariant, SizeVariant, ProductAttribute } from "@/types/product";
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
  const [mainImages, setMainImages] = useState<FileList | null>(null);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [colorImageFiles, setColorImageFiles] = useState<{ [key: number]: File[] }>({});
  const [colorTryOnFiles, setColorTryOnFiles] = useState<{ [key: number]: File }>({});
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [inStock, setInStock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [categorySearch, setCategorySearch] = useState("");

  const [gender, setGender] = useState("مردانه");
  const [collection, setCollection] = useState("");
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
      setColorVariants(activeProduct.colorVariants || []);
      setAttributes(activeProduct.attributes || []);
      setIsFlashSale(activeProduct.is_flash_sale);
      setIsActive(activeProduct.is_active);
      setInStock(activeProduct.inStock);
      if ((activeProduct as any).collection) {
        setCollection((activeProduct as any).collection);
      }
      if ((activeProduct as any).searchMetadata) {
        const sm = (activeProduct as any).searchMetadata;
        setAiMetadata(prev => ({
          ...prev,
          namePersian: sm.namePersian || "",
          descriptionPersian: sm.descriptionPersian || "",
          keywords: Array.isArray(sm.keywords) ? sm.keywords : [],
          tags: Array.isArray(sm.tags) ? sm.tags : [],
          materialPersian: sm.materialPersian || "",
          stylePersian: sm.stylePersian || "",
          occasionTags: Array.isArray(sm.occasionTags) ? sm.occasionTags : [],
          season: Array.isArray(sm.season) ? sm.season : [],
          fitType: sm.fitType || "معمولی",
          ageGroup: sm.ageGroup || "بزرگسال",
        }));
        if (Array.isArray(sm.keywords)) {
          setKeywordsInput(sm.keywords.join(", "));
        }
        if (Array.isArray(sm.tags)) {
          setTagsInput(sm.tags.join(", "));
        }
        if (Array.isArray(sm.occasionTags)) {
          setOccasionInput(sm.occasionTags.join(", "));
        }
        if (Array.isArray(sm.season)) {
          setSeasonInput(sm.season.join(", "));
        }
        setGender(sm.gender || "مردانه");
      }
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

  const canGenerateAiMetadata =
    !!name &&
    !!description &&
    price > 0 &&
    categoryIds.length > 0 &&
    !!brandId;

  const handleMainImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMainImages(e.target.files);
  };

  // Color Variant Handlers
  const handleAddColorVariant = () => {
    setColorVariants([...colorVariants, {
      color: "",
      colorName: "",
      images: [],
      sizes: []
    }]);
  };

  const handleColorVariantChange = (colorIdx: number, field: keyof ColorVariant, value: any) => {
    setColorVariants(colorVariants.map((cv, i) => i === colorIdx ? { ...cv, [field]: value } : cv));
  };

  const handleColorImagesChange = (colorIdx: number, files: FileList | null) => {
    if (files) {
      setColorImageFiles(prev => ({ ...prev, [colorIdx]: Array.from(files) }));
      const imageUrls = Array.from(files).map(file => URL.createObjectURL(file));
      setColorVariants(colorVariants.map((cv, i) => i === colorIdx ? { ...cv, images: imageUrls } : cv));
    }
  };

  const handleColorTryOnChange = (colorIdx: number, file: File | null) => {
    if (file) {
      setColorTryOnFiles(prev => ({ ...prev, [colorIdx]: file }));
      setColorVariants(colorVariants.map((cv, i) =>
        i === colorIdx ? { ...cv, tryOnImage: URL.createObjectURL(file) } : cv
      ));
    }
  };

  const handleRemoveColorVariant = (colorIdx: number) => {
    setColorVariants(colorVariants.filter((_, i) => i !== colorIdx));
    const newColorImageFiles = { ...colorImageFiles };
    const newColorTryOnFiles = { ...colorTryOnFiles };
    delete newColorImageFiles[colorIdx];
    delete newColorTryOnFiles[colorIdx];
    setColorImageFiles(newColorImageFiles);
    setColorTryOnFiles(newColorTryOnFiles);
  };

  // Size Handlers (nested within color variants)
  const handleAddSize = (colorIdx: number) => {
    const updatedVariants = [...colorVariants];
    updatedVariants[colorIdx].sizes.push({ size: "", sku: "", quantity: 0 });
    setColorVariants(updatedVariants);
  };

  const handleSizeChange = (colorIdx: number, sizeIdx: number, field: keyof SizeVariant, value: any) => {
    const updatedVariants = [...colorVariants];
    updatedVariants[colorIdx].sizes[sizeIdx] = {
      ...updatedVariants[colorIdx].sizes[sizeIdx],
      [field]: value
    };
    setColorVariants(updatedVariants);
  };

  const handleRemoveSize = (colorIdx: number, sizeIdx: number) => {
    const updatedVariants = [...colorVariants];
    updatedVariants[colorIdx].sizes = updatedVariants[colorIdx].sizes.filter((_, i) => i !== sizeIdx);
    setColorVariants(updatedVariants);
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
    if (collection) {
      formData.append("collection", collection);
    }

    // Send color variants as JSON (without images/tryOn - those are sent as files)
    const colorVariantsData = colorVariants.map(cv => ({
      color: cv.color,
      colorName: cv.colorName,
      sizes: cv.sizes
      // images and tryOnImage will be uploaded separately
    }));
    formData.append("colorVariants", JSON.stringify(colorVariantsData));

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

    // Add main product images
    if (mainImages) {
      Array.from(mainImages).forEach((file) => formData.append("mainImages", file));
    }

    // Add color variant images and try-on images
    colorVariants.forEach((cv, idx) => {
      // Add color-specific images
      const colorImages = colorImageFiles[idx];
      if (colorImages) {
        colorImages.forEach((file: File) => formData.append(`colorImages_${idx}`, file));
      }

      // Add color-specific try-on image
      const colorTryOnFile = colorTryOnFiles[idx];
      if (colorTryOnFile) {
        formData.append(`colorTryOn_${idx}`, colorTryOnFile);
      }
    });
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
          <label className="block mb-1">جنسیت *</label>
          <select className="input" value={gender} onChange={e => setGender(e.target.value)}>
            <option value="مردانه">مردانه</option>
            <option value="زنانه">زنانه</option>
            <option value="یونیسکس">یونیسکس</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">کلکسیون</label>
          <select className="input" value={collection} onChange={e => setCollection(e.target.value)}>
            <option value="">انتخاب کلکسیون</option>
            <option value="بهار">بهار</option>
            <option value="تابستان">تابستان</option>
            <option value="پاییز">پاییز</option>
            <option value="زمستان">زمستان</option>
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
        {/* Main Product Images */}
        <div>
          <label className="block mb-1 font-medium">تصاویر اصلی محصول (برای افزودن تصاویر جدید انتخاب کنید)</label>
          <p className="text-xs text-gray-500 mb-2">این تصاویر برای همه رنگ‌ها نمایش داده می‌شوند</p>
          <input 
            className="input" 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleMainImagesChange} 
          />
          {mainImages && mainImages.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {Array.from(mainImages).map((file, idx) => (
                <div key={idx} className="w-16 h-16 border rounded overflow-hidden">
                  <img src={URL.createObjectURL(file)} alt={`Main ${idx}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
          {/* Show existing main images */}
          {activeProduct?.mainImages && activeProduct.mainImages.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">تصاویر فعلی:</p>
              <div className="flex gap-2 flex-wrap">
                {activeProduct.mainImages.map((img, idx) => (
                  <div key={idx} className="w-16 h-16 border rounded overflow-hidden">
                    <img src={img} alt={`Existing ${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Color Variants Section */}
        <div className="border-t pt-4">
          <label className="block mb-2 font-medium text-lg">تنوع رنگ‌ها</label>
          <p className="text-xs text-gray-500 mb-4">هر رنگ می‌تواند تصاویر و سایزهای مختلف داشته باشد</p>
          
          {colorVariants.map((colorVariant, colorIdx) => (
            <div key={colorIdx} className="border rounded-lg p-4 mb-4 bg-gray-50">
              {/* Color Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">رنگ {colorIdx + 1}</h3>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleRemoveColorVariant(colorIdx)}
                >
                  حذف رنگ
                </Button>
              </div>

              {/* Color Info */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm mb-1">کد رنگ (Hex)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer border"
                      value={colorVariant.color || "#000000"}
                      onChange={e => handleColorVariantChange(colorIdx, "color", e.target.value)}
                    />
                    <input
                      className="input flex-1"
                      placeholder="#FF5733"
                      value={colorVariant.color}
                      onChange={e => handleColorVariantChange(colorIdx, "color", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">نام رنگ (فارسی)</label>
                  <input
                    className="input"
                    placeholder="مثال: قرمز"
                    value={colorVariant.colorName}
                    onChange={e => handleColorVariantChange(colorIdx, "colorName", e.target.value)}
                  />
                </div>
              </div>

              {/* Color Images */}
              <div className="mb-4">
                <label className="block text-sm mb-1">تصاویر این رنگ (برای جایگزینی انتخاب کنید)</label>
                <input
                  className="input text-sm"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleColorImagesChange(colorIdx, e.target.files)}
                />
                {/* Show new uploaded images */}
                {colorImageFiles[colorIdx] && colorImageFiles[colorIdx].length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-green-600">تصاویر جدید:</span>
                    {colorImageFiles[colorIdx].map((file, imgIdx) => (
                      <div key={imgIdx} className="w-12 h-12 border rounded overflow-hidden">
                        <img src={URL.createObjectURL(file)} alt={`New ${imgIdx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                {/* Show existing color images */}
                {colorVariant.images.length > 0 && !colorImageFiles[colorIdx] && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-gray-500">تصاویر فعلی:</span>
                    {colorVariant.images.map((img, imgIdx) => (
                      <div key={imgIdx} className="w-12 h-12 border rounded overflow-hidden">
                        <img src={img} alt={`Color ${colorIdx} image ${imgIdx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Try-On Image */}
              <div className="mb-4">
                <label className="block text-sm mb-1">تصویر واقعیت افزوده (Try-On)</label>
                <input
                  className="input text-sm"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleColorTryOnChange(colorIdx, e.target.files?.[0] || null)}
                />
                {colorTryOnFiles[colorIdx] && (
                  <div className="w-12 h-12 border rounded overflow-hidden mt-2">
                    <img src={URL.createObjectURL(colorTryOnFiles[colorIdx])} alt={`New try-on`} className="w-full h-full object-cover" />
                  </div>
                )}
                {colorVariant.tryOnImage && !colorTryOnFiles[colorIdx] && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">تصویر فعلی:</span>
                    <div className="w-12 h-12 border rounded overflow-hidden mt-1">
                      <img src={colorVariant.tryOnImage} alt={`Color ${colorIdx} try-on`} className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              {/* Sizes for this Color */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-2">سایزها و موجودی</label>
                {colorVariant.sizes.map((sizeVariant, sizeIdx) => (
                  <div key={sizeIdx} className="flex gap-2 mb-2 items-center bg-white p-2 rounded">
                    <input
                      className="input w-20"
                      placeholder="سایز"
                      value={sizeVariant.size}
                      onChange={e => handleSizeChange(colorIdx, sizeIdx, "size", e.target.value)}
                    />
                    <input
                      className="input w-32"
                      placeholder="SKU"
                      value={sizeVariant.sku}
                      onChange={e => handleSizeChange(colorIdx, sizeIdx, "sku", e.target.value)}
                    />
                    <input
                      className="input w-24"
                      type="number"
                      placeholder="موجودی"
                      min="0"
                      value={sizeVariant.quantity}
                      onChange={e => handleSizeChange(colorIdx, sizeIdx, "quantity", Number(e.target.value))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => handleRemoveSize(colorIdx, sizeIdx)}
                    >
                      حذف
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddSize(colorIdx)}
                >
                  + افزودن سایز
                </Button>
              </div>
            </div>
          ))}
          
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleAddColorVariant}
            className="w-full border-dashed"
          >
            + افزودن رنگ جدید
          </Button>
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
        <Button type="submit" variant="primary" disabled={submitting || isLoading}>{submitting ? "در حال ثبت..." : "ثبت تغییرات"}</Button>
        {error && <div className="text-red-500">{error}</div>}
      </form>
    </div>
  );
} 