"use client";

import { useEffect, useState, useRef } from "react";
import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import { useAuthStore } from "@/store/auth-store";
import { ColorVariant, SizeVariant, ProductAttribute, VariantAIMetadata } from "@/types/product";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import CategoryModal from "@/components/admin/CategoryModal";
import AddBrandModal from "@/components/admin/AddBrandModal";
import ImageUploader, { ImageItem, getNewImageFiles, getImageSources } from "@/components/admin/ImageUploader";
import PatternPicker from "@/components/ui/PatternPicker";
import VariantAIMetadataEditor, {
  VariantAIListDrafts,
  VariantAIListField,
  VARIANT_AI_LIST_FIELDS,
  emptyVariantAIListDrafts,
  listDraftsFromMetadata,
  parseVariantAIList,
} from "@/components/admin/VariantAIMetadataEditor";
import { toEnglishNumber } from "@/lib/utils";

export default function AddProductPage() {
  const router = useRouter();
  const { adminToken } = useAuthStore();
  const { brands, categories, fetchBrands, fetchCategories, createProduct, isLoading, error } = useProductStore();
  const { createCategory } = useCategoryStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [brandId, setBrandId] = useState("");
  const [mainImageItems, setMainImageItems] = useState<ImageItem[]>([]); // Main product images with ordering
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]); // Color variants with nested sizes
  const [colorImageItems, setColorImageItems] = useState<{ [key: number]: ImageItem[] }>({}); // Images per color with ordering
  const [colorTryOnFiles, setColorTryOnFiles] = useState<{ [key: number]: File }>({}); // Try-on per color
  const [colorSwatchBlobs, setColorSwatchBlobs] = useState<{ [key: number]: Blob }>({}); // Swatch blobs per color
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [inStock, setInStock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  const [gender, setGender] = useState("مردانه");
  const [collection, setCollection] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedAiModel, setSelectedAiModel] = useState("qwen3.5:9b");
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
    fitDescription: "",
    garmentPhrase: "",
    ageGroup: "بزرگسال",
  });
  const [variantAiMetadata, setVariantAiMetadata] = useState<{ [key: number]: VariantAIMetadata }>({});
  const [variantAiListDrafts, setVariantAiListDrafts] = useState<{ [key: number]: VariantAIListDrafts }>({});
  const [variantAiGenerating, setVariantAiGenerating] = useState<{ [key: number]: boolean }>({});
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

  const handleCreateCategory = async (formData: FormData) => {
    if (!adminToken) {
      toast.error("دسترسی ادمین ندارید");
      return;
    }
    const result = await createCategory(formData, adminToken);
    if (result) {
      setIsCategoryModalOpen(false);
      fetchCategories(); // Refresh categories list
      toast.success("دسته‌بندی جدید با موفقیت ایجاد شد");
    }
  };

  const canGenerateAiMetadata =
    !!name &&
    !!description &&
    price > 0 &&
    categoryIds.length > 0 &&
    !!brandId;

  const handleMainImagesChange = (newImages: ImageItem[]) => {
    setMainImageItems(newImages);
  };

  // Color Variant Handlers
  const handleAddColorVariant = () => {
    setColorVariants([...colorVariants, {
      color: "",
      colorName: "",
      images: [],
      sizes: [],
      tryOnGarmentType: "upper_body",
    }]);
  };

  const handleColorVariantChange = (colorIdx: number, field: keyof ColorVariant, value: any) => {
    setColorVariants(colorVariants.map((cv, i) => i === colorIdx ? { ...cv, [field]: value } : cv));
  };

  const removeIndexFromMap = <T,>(map: { [key: number]: T }, removedIdx: number): { [key: number]: T } => {
    const next: { [key: number]: T } = {};
    Object.keys(map).forEach(key => {
      const idx = Number(key);
      if (idx === removedIdx) return;
      next[idx > removedIdx ? idx - 1 : idx] = map[idx];
    });
    return next;
  };

  // Keeps every per-variant AI field editable by admins; list fields also
  // refresh their raw comma-separated draft so typing feels natural.
  const handleVariantAiFieldChange = (colorIdx: number, field: keyof VariantAIMetadata, value: string) => {
    if (VARIANT_AI_LIST_FIELDS.includes(field as VariantAIListField)) {
      setVariantAiListDrafts(prev => ({
        ...prev,
        [colorIdx]: { ...(prev[colorIdx] || emptyVariantAIListDrafts()), [field]: value },
      }));
      setVariantAiMetadata(prev => ({
        ...prev,
        [colorIdx]: { ...(prev[colorIdx] || {}), [field]: parseVariantAIList(value) } as VariantAIMetadata,
      }));
      return;
    }
    setVariantAiMetadata(prev => ({
      ...prev,
      [colorIdx]: { ...(prev[colorIdx] || {}), [field]: value } as VariantAIMetadata,
    }));
  };

  const handleColorImagesChange = (colorIdx: number, newImages: ImageItem[]) => {
    setColorImageItems(prev => ({ ...prev, [colorIdx]: newImages }));
    // Update preview URLs in colorVariants for display
    const imageUrls = newImages.map(img => img.url);
    setColorVariants(colorVariants.map((cv, i) => i === colorIdx ? { ...cv, images: imageUrls } : cv));
  };

  const handleColorTryOnChange = (colorIdx: number, file: File | null) => {
    if (file) {
      setColorTryOnFiles(prev => ({ ...prev, [colorIdx]: file }));
      // Update preview URL
      setColorVariants(colorVariants.map((cv, i) =>
        i === colorIdx ? { ...cv, tryOnImage: URL.createObjectURL(file) } : cv
      ));
    }
  };

  const handleRemoveColorVariant = (colorIdx: number) => {
    setColorVariants(colorVariants.filter((_, i) => i !== colorIdx));
    // Clean up file references
    const newColorImageItems = { ...colorImageItems };
    const newColorTryOnFiles = { ...colorTryOnFiles };
    delete newColorImageItems[colorIdx];
    delete newColorTryOnFiles[colorIdx];
    setColorImageItems(newColorImageItems);
    setColorTryOnFiles(newColorTryOnFiles);
    // Shift per-variant AI state so remaining colors keep their own metadata.
    setVariantAiMetadata(prev => removeIndexFromMap(prev, colorIdx));
    setVariantAiListDrafts(prev => removeIndexFromMap(prev, colorIdx));
  };

  // Size Handlers (nested within color variants)
  const handleAddSize = (colorIdx: number) => {
    const updatedVariants = [...colorVariants];
    updatedVariants[colorIdx].sizes.push({ size: "", sku: "", quantity: 0 });
    setColorVariants(updatedVariants);
  };

  const handleSizeChange = (colorIdx: number, sizeIdx: number, field: keyof SizeVariant, value: any) => {
    const updatedVariants = [...colorVariants];
    // Normalize Persian/Arabic digits in size field
    const normalizedValue = field === "size" ? toEnglishNumber(String(value)) : value;
    updatedVariants[colorIdx].sizes[sizeIdx] = {
      ...updatedVariants[colorIdx].sizes[sizeIdx],
      [field]: normalizedValue
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
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name,
          description,
          category: primaryCategory,
          brand: brandName,
          price,
          gender,
          images: await getImageSources(mainImageItems),
          // The قواره attribute is the admin's own statement of the fit; the
          // generator leans on it rather than guessing the cut from photos.
          attributes: attributes.filter(a => a.name.trim() && a.value.trim()),
          model: selectedAiModel,
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
        fitDescription: generated.fitDescription || prev.fitDescription,
        garmentPhrase: generated.garmentPhrase || prev.garmentPhrase,
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

      toast.success("فیلدهای AI با موفقیت تولید شدند. لطفاً آنها را بررسی و در صورت نیاز ویرایش کنید.");
    } catch (err) {
      toast.error("خطا در ارتباط با سرویس هوش مصنوعی");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleGenerateVariantAi = async (colorIdx: number) => {
    const cv = colorVariants[colorIdx];
    if (!cv || !cv.colorName || !name || !description || !categoryIds.length || !brandId) {
      toast.error("برای تولید اطلاعات هر رنگ، ابتدا نام رنگ و فیلدهای اصلی محصول را کامل کنید");
      return;
    }
    const primaryCategory = categories.find(c => c.id === categoryIds[0])?.name || "";
    const brandName = brands.find(b => b.id === brandId)?.name || "";
    const variantItems = colorImageItems[colorIdx] || [];
    const variantImages = variantItems.length > 0 ? await getImageSources(variantItems) : cv.images || [];
    const images = variantImages.length > 0 ? variantImages : await getImageSources(mainImageItems);

    setVariantAiGenerating(prev => ({ ...prev, [colorIdx]: true }));
    try {
      const response = await fetch("/api/admin/ai/generate-variant-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name,
          description,
          category: primaryCategory,
          brand: brandName,
          price,
          gender,
          collection,
          images,
          model: selectedAiModel,
          color: cv.color,
          colorName: cv.colorName,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        toast.error(errorData?.message || "خطا در تولید اطلاعات رنگ");
        return;
      }
      const data = await response.json();
      const gen = data?.data || data;
      const meta: VariantAIMetadata = {
        productTypePersian: gen.productTypePersian || "",
        productTypeStandard: gen.productTypeStandard || "",
        materialPersian: gen.materialPersian || "",
        stylePersian: gen.stylePersian || "",
        patternPersian: gen.patternPersian || "",
        fitType: gen.fitType || "معمولی",
        colorFamily: gen.colorFamily || "",
        season: Array.isArray(gen.season) ? gen.season : [],
        gender,
        keywords: Array.isArray(gen.keywords) ? gen.keywords : [],
        tags: Array.isArray(gen.tags) ? gen.tags : [],
        occasionTags: Array.isArray(gen.occasionTags) ? gen.occasionTags : [],
      };
      setVariantAiMetadata(prev => ({ ...prev, [colorIdx]: meta }));
      setVariantAiListDrafts(prev => ({ ...prev, [colorIdx]: listDraftsFromMetadata(meta) }));
      toast.success(`اطلاعات رنگ ${cv.colorName || colorIdx + 1} با موفقیت تولید شد`);
    } catch {
      toast.error("خطا در ارتباط با سرویس هوش مصنوعی");
    } finally {
      setVariantAiGenerating(prev => ({ ...prev, [colorIdx]: false }));
    }
  };

  const handleGenerateAllVariantAi = async () => {
    for (let i = 0; i < colorVariants.length; i++) {
      const cv = colorVariants[i];
      if (!cv.colorName) continue;
      await handleGenerateVariantAi(i);
    }
    toast.success("تولید اطلاعات همه رنگها به پایان رسید");
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
    formData.append("gender", gender);
    if (collection) {
      formData.append("collection", collection);
    }
    formData.append("description", description);
    formData.append("price", price.toString());
    formData.append("originalPrice", originalPrice ? originalPrice.toString() : price.toString());
    formData.append("categoryIds", JSON.stringify(categoryIds));
    formData.append("brandId", brandId);

    // Send color variants as JSON (without images/tryOn - those are sent as files)
    const colorVariantsData = colorVariants.map(cv => ({
      color: cv.color,
      colorName: cv.colorName,
      sizes: cv.sizes
      // images and tryOnImage will be uploaded separately
    }));
    formData.append("colorVariants", JSON.stringify(colorVariantsData));

    // Send per-variant AI metadata (for negotiator search_catalog) — indexed by variant order.
    const variantAiArr = colorVariants.map((_cv, idx) => variantAiMetadata[idx] || {});
    if (variantAiArr.some(m => m && Object.keys(m).length > 0)) {
      formData.append("variantAIMetadata", JSON.stringify(variantAiArr));
    }

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
        fitDescription: aiMetadata.fitDescription,
        garmentPhrase: aiMetadata.garmentPhrase,
        gender,
        ageGroup: aiMetadata.ageGroup,
      };
      formData.append("searchMetadata", JSON.stringify(searchMetadata));
    }
    formData.append("isFlashSale", isFlashSale ? "true" : "false");
    formData.append("isActive", isActive ? "true" : "false");
    formData.append("inStock", inStock ? "true" : "false");

    // Add main product images (in order)
    const mainImageFiles = getNewImageFiles(mainImageItems);
    mainImageFiles.forEach((file) => formData.append("mainImages", file));

    // Add color variant images and try-on images
    colorVariants.forEach((cv, idx) => {
      // Add color-specific images (in order)
      const colorImages = colorImageItems[idx] || [];
      const colorImageFiles = getNewImageFiles(colorImages);
      colorImageFiles.forEach((file: File) => formData.append(`colorImages_${idx}`, file));

      // Add color-specific try-on image
      const colorTryOnFile = colorTryOnFiles[idx];
      if (colorTryOnFile) {
        formData.append(`colorTryOn_${idx}`, colorTryOnFile);
      }

      // Add try-on garment type
      if (cv.tryOnGarmentType) {
        formData.append(`colorTryOnGarmentType_${idx}`, cv.tryOnGarmentType);
      }

      // Add color-specific swatch image
      const swatchBlob = colorSwatchBlobs[idx];
      if (swatchBlob) {
        formData.append(`colorSwatch_${idx}`, swatchBlob, `swatch_${idx}.webp`);
      }
    });

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
                    <button type="button" className="ml-1 text-blue-500 hover:text-red-500" onClick={e => { e.stopPropagation(); setCategoryIds(categoryIds.filter(cid => cid !== id)); }}>
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
          <Button
            type="button"
            variant="link"
            size="sm"
            className="text-blue-600 text-sm p-0 h-auto"
            onClick={() => setIsCategoryModalOpen(true)}
          >
            + دسته‌بندی جدید
          </Button>
        </div>
        <div>
          <label className="block mb-1">برند *</label>
          <select className="input" value={brandId} onChange={e => setBrandId(e.target.value)} required>
            <option value="">انتخاب برند</option>
            {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setIsBrandModalOpen(true)}
            className="text-blue-600 text-sm hover:text-blue-800 transition-colors mt-1"
          >
            + برند جدید
          </button>
        </div>
        {/* Main Product Images */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <ImageUploader
            images={mainImageItems}
            onChange={handleMainImagesChange}
            maxImages={10}
            label="تصاویر اصلی محصول"
            description="این تصاویر برای همه رنگ‌ها نمایش داده می‌شوند. تصویر اول به عنوان تصویر اصلی استفاده می‌شود."
          />
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
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canGenerateAiMetadata || variantAiGenerating[colorIdx] || submitting || isLoading || !colorVariant.colorName}
                    onClick={() => handleGenerateVariantAi(colorIdx)}
                  >
                    {variantAiGenerating[colorIdx] ? "در حال تولید..." : (variantAiMetadata[colorIdx]?.productTypePersian ? "تولید مجدد AI رنگ" : "تولید AI این رنگ")}
                  </Button>
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
              </div>
              {/* Per-color AI metadata — all fields shown and editable */}
              <div className="mb-4 bg-white rounded-lg p-4 border border-green-100">
                <label className="block text-sm font-medium mb-1">فیلدهای هوش مصنوعی این رنگ</label>
                <p className="text-xs text-gray-500 mb-3">
                  این فیلدها برای جستجوی هوشمند و چت‌بات استفاده می‌شوند؛ دستی پر کنید یا با دکمه «تولید AI این رنگ» بسازید و سپس ویرایش نمایید.
                </p>
                <VariantAIMetadataEditor
                  metadata={variantAiMetadata[colorIdx] || {}}
                  listDrafts={variantAiListDrafts[colorIdx] || emptyVariantAIListDrafts()}
                  disabled={submitting || isLoading}
                  onChange={(field, value) => handleVariantAiFieldChange(colorIdx, field, value)}
                />
              </div>

              {/* Color Info - Pattern Picker */}
              <div className="mb-4 bg-white rounded-lg p-4">
                <PatternPicker
                  color={colorVariant.color}
                  colorName={colorVariant.colorName}
                  swatchImage={colorVariant.swatchImage}
                  existingImages={(colorImageItems[colorIdx] || []).map(item => item.url)}
                  onColorChange={(color) => handleColorVariantChange(colorIdx, "color", color)}
                  onColorNameChange={(name) => handleColorVariantChange(colorIdx, "colorName", name)}
                  onSwatchChange={(swatch, blob) => {
                    const updated = [...colorVariants];
                    updated[colorIdx].swatchImage = swatch;
                    setColorVariants(updated);
                    if (blob) {
                      setColorSwatchBlobs(prev => ({ ...prev, [colorIdx]: blob }));
                    } else {
                      setColorSwatchBlobs(prev => {
                        const newBlobs = { ...prev };
                        delete newBlobs[colorIdx];
                        return newBlobs;
                      });
                    }
                  }}
                />
              </div>

              {/* Color Images */}
              <div className="mb-4 bg-white rounded-lg p-3">
                <ImageUploader
                  images={colorImageItems[colorIdx] || []}
                  onChange={(newImages) => handleColorImagesChange(colorIdx, newImages)}
                  maxImages={5}
                  label={`تصاویر رنگ ${colorVariant.colorName || colorIdx + 1}`}
                  description="تصاویر مختص این رنگ (زوایای مختلف)"
                />
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
                <div className="mt-2">
                  <label className="block text-xs mb-1">نوع لباس</label>
                  <select
                    className="input text-sm w-full"
                    value={colorVariant.tryOnGarmentType || "upper_body"}
                    onChange={(e) => handleColorVariantChange(colorIdx, "tryOnGarmentType", e.target.value)}
                  >
                    <option value="upper_body">بالاتنه</option>
                    <option value="lower_body">پایین تنه</option>
                    <option value="dresses">لباس</option>
                  </select>
                </div>
                {colorVariant.tryOnImage && (
                  <div className="w-12 h-12 border rounded overflow-hidden mt-2">
                    <img src={colorVariant.tryOnImage} alt={`Color ${colorIdx} try-on`} className="w-full h-full object-cover" />
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
          {colorVariants.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canGenerateAiMetadata || submitting || isLoading || Object.keys(variantAiGenerating).some(k => variantAiGenerating[Number(k)])}
              onClick={handleGenerateAllVariantAi}
              className="w-full mt-2"
            >
              تولید هوشمند همه رنگها (هر رنگ جداگانه)
            </Button>
          )}
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
            <div className="flex items-center gap-2">
              <select
                className="input text-sm w-auto"
                value={selectedAiModel}
                onChange={e => setSelectedAiModel(e.target.value)}
                disabled={aiGenerating || submitting || isLoading}
              >
                <option value="qwen/qwen3.7-plus">Qwen 3.7 Plus (OpenRouter)</option>
                <option value="minimax/minimax-m3">MiniMax M3 (OpenRouter)</option>
                <option value="stepfun/step-3.7-flash">Step 3.7 Flash (OpenRouter)</option>
                <option value="google/gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (OpenRouter)</option>
                <option value="qwen3.5:9b">Qwen 3.5 9B (Local, Fast)</option>
                <option value="gemma4:31b">Gemma 4 31B (Local, Strong)</option>
                <option value="qwen3.6.1-27b-4b">Qwen 3.6 27B MoE (Local)</option>
              </select>
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
          {/* Fed verbatim into the virtual try-on image prompt, which is
              written in English — hence the English placeholders. */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1">قواره برای پرو مجازی (انگلیسی)</label>
              <input
                className="input"
                dir="ltr"
                placeholder="loose, boxy cut with dropped shoulders"
                value={aiMetadata.fitDescription}
                onChange={e => setAiMetadata(prev => ({ ...prev, fitDescription: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1">توضیح کوتاه لباس (انگلیسی)</label>
              <input
                className="input"
                dir="ltr"
                placeholder="short-sleeve checked cotton shirt"
                value={aiMetadata.garmentPhrase}
                onChange={e => setAiMetadata(prev => ({ ...prev, garmentPhrase: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            این دو فیلد مستقیماً در پرامپت پرو مجازی استفاده می‌شوند. با تولید خودکار پر می‌شوند و در صورت نیاز قابل ویرایش هستند.
          </p>
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

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        editingCategory={null}
        onSubmit={handleCreateCategory}
        categories={categories}
        isLoading={isLoading}
      />

      {/* Brand Modal */}
      <AddBrandModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        onSuccess={() => fetchBrands()}
      />
    </div>
  );
}
