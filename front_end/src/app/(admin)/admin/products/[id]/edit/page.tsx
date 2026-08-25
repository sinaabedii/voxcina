"use client";

import { useEffect, useState, useRef } from "react";
import { useProductStore } from "@/store/product-store";
import { useCategoryStore } from "@/store/category-store";
import { useAuthStore } from "@/store/auth-store";
import { ColorVariant, SizeVariant, ProductAttribute, VariantAIMetadata } from "@/types/product";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import ImageUploader, { ImageItem, getNewImageFiles, getExistingImagePaths, getImageOrderInfo, createImageItemFromUrl, getImageSources } from "@/components/admin/ImageUploader";
import PatternPicker from "@/components/ui/PatternPicker";
import VariantAIMetadataEditor, {
  VariantAIListDrafts,
  VariantAIListField,
  VARIANT_AI_LIST_FIELDS,
  emptyVariantAIListDrafts,
  listDraftsFromMetadata,
  parseVariantAIList,
} from "@/components/admin/VariantAIMetadataEditor";
import { formatPrice, toDigitsOnly, toEnglishNumber } from "@/lib/utils";

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
  const [mainImageItems, setMainImageItems] = useState<ImageItem[]>([]);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [colorImageItems, setColorImageItems] = useState<{ [key: number]: ImageItem[] }>({});
  const [colorTryOnFiles, setColorTryOnFiles] = useState<{ [key: number]: File }>({});
  const [colorSwatchBlobs, setColorSwatchBlobs] = useState<{ [key: number]: Blob }>({});
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [inStock, setInStock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Id of the product currently mirrored into the form fields below, so a
  // route change re-hydrates instead of keeping the previous product's values.
  const [loadedProductId, setLoadedProductId] = useState<string | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [categorySearch, setCategorySearch] = useState("");

  const [gender, setGender] = useState("مردانه");
  const [collection, setCollection] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [productAiModel, setProductAiModel] = useState("google/gemini-3.7-flash");
  const [variantAiModel, setVariantAiModel] = useState("google/gemini-3.7-flash");
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
  // Number of active shopping carts that still hold this product. Editing is
  // blocked while it is greater than zero so a shopper's cart cannot change
  // under them between adding the product and paying for it.
  const [cartsHoldingProduct, setCartsHoldingProduct] = useState(0);

  useEffect(() => {
    fetchBrands();
    fetchCategories();
    if (productId) {
      fetchProductById(productId);
    }
  }, [fetchBrands, fetchCategories, fetchProductById, productId]);

  useEffect(() => {
    if (!productId || !adminToken) return;
    let cancelled = false;
    fetch(`/api/admin/products/${productId}/cart-usage`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((usage) => {
        if (!cancelled) setCartsHoldingProduct(Number(usage?.carts) || 0);
      })
      .catch(() => {
        if (!cancelled) setCartsHoldingProduct(0);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, adminToken]);

  // Hydrate the form from the fetched product. `activeProduct` is shared store
  // state that outlives this page, so on the first render after mount it can
  // still hold the product edited earlier in the session; hydrating from that
  // would fill (and then save) the form with the wrong product. Only the
  // product whose id matches the route may hydrate, and every field is
  // assigned so nothing carries over when the id changes.
  useEffect(() => {
    if (!activeProduct || activeProduct.id !== productId || loadedProductId === productId) {
      return;
    }
    const variants = activeProduct.colorVariants || [];
    setName(activeProduct.name);
    setDescription(activeProduct.description);
    setPrice(activeProduct.price);
    setOriginalPrice(activeProduct.originalPrice);
    setCategoryIds(activeProduct.category_ids || []);
    setBrandId(activeProduct.brand_id || "");
    setColorVariants(variants);

    // Load existing per-variant AI metadata into local state
    const vMeta: { [key: number]: VariantAIMetadata } = {};
    const vDrafts: { [key: number]: VariantAIListDrafts } = {};
    variants.forEach((cv, idx) => {
      if (cv.aiMetadata) {
        vMeta[idx] = cv.aiMetadata;
        vDrafts[idx] = listDraftsFromMetadata(cv.aiMetadata);
      }
    });
    setVariantAiMetadata(vMeta);
    setVariantAiListDrafts(vDrafts);
    setAttributes(activeProduct.attributes || []);

    // Load existing main images into ImageItems
    setMainImageItems((activeProduct.mainImages || []).map(url => createImageItemFromUrl(url)));

    // Load existing color variant images into ImageItems
    const colorImgs: { [key: number]: ImageItem[] } = {};
    variants.forEach((cv, idx) => {
      if (cv.images && cv.images.length > 0) {
        colorImgs[idx] = cv.images.map(url => createImageItemFromUrl(url));
      }
    });
    setColorImageItems(colorImgs);
    // Pending uploads belong to the product they were picked for
    setColorTryOnFiles({});
    setColorSwatchBlobs({});

    setIsFlashSale(activeProduct.is_flash_sale);
    setIsActive(activeProduct.is_active);
    setInStock(activeProduct.inStock);
    setCollection((activeProduct as any).collection || "");

    const sm = (activeProduct as any).searchMetadata || {};
    setAiMetadata({
      namePersian: sm.namePersian || "",
      descriptionPersian: sm.descriptionPersian || "",
      keywords: Array.isArray(sm.keywords) ? sm.keywords : [],
      tags: Array.isArray(sm.tags) ? sm.tags : [],
      materialPersian: sm.materialPersian || "",
      stylePersian: sm.stylePersian || "",
      occasionTags: Array.isArray(sm.occasionTags) ? sm.occasionTags : [],
      season: Array.isArray(sm.season) ? sm.season : [],
      fitType: sm.fitType || "معمولی",
      fitDescription: sm.fitDescription || "",
      garmentPhrase: sm.garmentPhrase || "",
      ageGroup: sm.ageGroup || "بزرگسال",
    });
    setKeywordsInput(Array.isArray(sm.keywords) ? sm.keywords.join(", ") : "");
    setTagsInput(Array.isArray(sm.tags) ? sm.tags.join(", ") : "");
    setOccasionInput(Array.isArray(sm.occasionTags) ? sm.occasionTags.join(", ") : "");
    setSeasonInput(Array.isArray(sm.season) ? sm.season.join(", ") : "");
    setGender(sm.gender || "مردانه");

    setLoadedProductId(productId);
  }, [activeProduct, productId, loadedProductId]);

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
    const imageUrls = newImages.map(img => img.url);
    setColorVariants(colorVariants.map((cv, i) => i === colorIdx ? { ...cv, images: imageUrls } : cv));
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
          model: productAiModel,
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
          model: variantAiModel,
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
      if (!colorVariants[i].colorName) continue;
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
    if (cartsHoldingProduct > 0) {
      toast.error("این محصول در سبد خرید مشتریان قرار دارد و تا خالی شدن سبدها قابل ویرایش نیست");
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

    // Send main images order info (includes both existing paths and new file positions)
    const mainImageOrder = getImageOrderInfo(mainImageItems);
    formData.append("mainImageOrder", JSON.stringify(mainImageOrder));

    // Add new main product images (in order they appear in the array)
    const mainImageFiles = getNewImageFiles(mainImageItems);
    mainImageFiles.forEach((file) => formData.append("mainImages", file));

    // Add color variant images and try-on images
    colorVariants.forEach((cv, idx) => {
      // Send color images order info
      const colorImages = colorImageItems[idx] || [];
      const colorImageOrder = getImageOrderInfo(colorImages);
      formData.append(`colorImageOrder_${idx}`, JSON.stringify(colorImageOrder));
      
      // Add new color-specific images
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
    const result = await updateProduct(productId, formData, adminToken);
    setSubmitting(false);
    if (result) {
      toast.success("محصول با موفقیت ویرایش شد");
      router.push("/admin/products");
    } else {
      toast.error(error || "خطا در ویرایش محصول");
    }
  };

  if (loadedProductId !== productId && isLoading) {
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
            <label className="block mb-1">قیمت (تومان) *</label>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              dir="ltr"
              placeholder="مثال: 450000"
              value={price ? String(price) : ""}
              onChange={e => setPrice(Number(toDigitsOnly(e.target.value)))}
              required
            />
            {price > 0 && <p className="mt-1 text-xs text-gray-500">{formatPrice(price)}</p>}
          </div>
          <div className="flex-1">
            <label className="block mb-1">قیمت اصلی (تومان)</label>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              dir="ltr"
              placeholder="مثال: 550000"
              value={originalPrice ? String(originalPrice) : ""}
              onChange={e => setOriginalPrice(Number(toDigitsOnly(e.target.value)))}
            />
            {originalPrice > 0 && <p className="mt-1 text-xs text-gray-500">{formatPrice(originalPrice)}</p>}
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
          <div className="mb-4 bg-blue-50 rounded-lg p-3">
            <label className="block text-sm font-medium mb-1">مدل هوش مصنوعی برای تولید اطلاعات رنگ‌ها (OpenRouter)</label>
            <input
              className="input"
              dir="ltr"
              placeholder="google/gemini-3.7-flash"
              value={variantAiModel}
              onChange={e => setVariantAiModel(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">نام مدل را به صورت owner/model وارد کنید، مثلاً z-ai/glm-5.3</p>
          </div>
          
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
              <input
                className="input text-sm w-64"
                dir="ltr"
                placeholder="google/gemini-3.7-flash"
                value={productAiModel}
                onChange={e => setProductAiModel(e.target.value)}
                disabled={aiGenerating || submitting || isLoading}
              />
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
                placeholder="sits at the waist, relaxed through seat and thigh, straight to a wide leg opening"
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
        {cartsHoldingProduct > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300">
            این محصول هم‌اکنون در {cartsHoldingProduct.toLocaleString("fa-IR")} سبد خرید قرار دارد؛ تا زمانی که از سبدها خارج نشود امکان ثبت تغییرات وجود ندارد.
          </div>
        )}
        <Button type="submit" variant="primary" disabled={submitting || isLoading || cartsHoldingProduct > 0}>{submitting ? "در حال ثبت..." : "ثبت تغییرات"}</Button>
        {error && <div className="text-red-500">{error}</div>}
      </form>
    </div>
  );
}
