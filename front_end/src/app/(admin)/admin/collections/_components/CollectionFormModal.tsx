"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ImageUploader, {
  ImageItem,
  createImageItemFromUrl,
} from "@/components/admin/ImageUploader";
import ProductVariantPicker from "./ProductVariantPicker";
import { Product } from "@/types/product";
import {
  SHOP_COLLECTION_LIMITS,
  ShopCollectionInput,
  ShopCollectionItem,
  ShopCollectionPriceMode,
  ShopCollectionView,
} from "@/types/shopCollection";
import { ShopCollectionSave } from "@/store/shop-collection-store";
import { toPersianNumber } from "@/lib/utils";

/**
 * Create/edit form for a curated collection.
 *
 * Price handling mirrors the backend contract: "auto" lets the API compute the
 * live sum of item prices on every read; "custom" stores the admin's value and
 * the form warns — before the round trip — when that value exceeds the sum.
 * The server returns the same verdict (price_warning) on save.
 */

interface CollectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial: ShopCollectionView | null;
  products: Product[];
  isSaving: boolean;
  onSubmit: (save: ShopCollectionSave) => Promise<boolean>;
}

const parsePrice = (raw: string): number => {
  const normalized = raw
    .replace(/[۰-۹٠-٩]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[,\u066c\u060c\u200c ]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
};

export default function CollectionFormModal({
  isOpen,
  onClose,
  initial,
  products,
  isSaving,
  onSubmit,
}: CollectionFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ShopCollectionItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [priceMode, setPriceMode] = useState<ShopCollectionPriceMode>("auto");
  const [customPrice, setCustomPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setItems(initial?.items ?? []);
    setImages((initial?.images ?? []).map(createImageItemFromUrl));
    setPriceMode(initial?.price_mode ?? "auto");
    setCustomPrice(initial?.price_mode === "custom" ? String(initial.price) : "");
    setIsActive(initial?.is_active ?? true);
    setDisplayOrder(initial?.display_order != null ? String(initial.display_order) : "");
  }, [isOpen, initial]);

  // The auto price and the warning compare against the same live sum the API
  // computes: the sum of the selected products' current prices.
  const itemsTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.product_id);
      return sum + (product?.price ?? 0);
    }, 0);
  }, [items, products]);

  const parsedCustomPrice = parsePrice(customPrice);
  const priceExceedsSum = priceMode === "custom" && parsedCustomPrice > itemsTotal;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (title.trim().length < 3) next.title = "نام کالکشن را کامل وارد کنید (حداقل ۳ کاراکتر).";
    if (items.length < SHOP_COLLECTION_LIMITS.minItems) {
      next.items = `حداقل ${toPersianNumber(SHOP_COLLECTION_LIMITS.minItems)} محصول انتخاب کنید.`;
    } else if (items.length > SHOP_COLLECTION_LIMITS.maxItems) {
      next.items = `حداکثر ${toPersianNumber(SHOP_COLLECTION_LIMITS.maxItems)} محصول مجاز است.`;
    }
    if (images.length === 0) next.images = "حداقل یک تصویر برای کالکشن آپلود کنید.";
    if (priceMode === "custom" && parsedCustomPrice <= 0) {
      next.price = "برای قیمت دستی، مبلغ را وارد کنید.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const input: ShopCollectionInput = {
      title,
      description,
      items,
      price_mode: priceMode,
      price: priceMode === "custom" ? parsedCustomPrice : 0,
      is_active: isActive,
    };
    if (displayOrder.trim() !== "") {
      input.display_order = Number(displayOrder) || 0;
    }
    const ok = await onSubmit({ ...input, images });
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? "ویرایش کالکشن" : "کالکشن جدید"}
      contentClassName="max-w-2xl"
    >
      <div className="space-y-5 p-1">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-900">نام کالکشن</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={SHOP_COLLECTION_LIMITS.title}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="مثلاً: استایل پاییزی مردانه"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-900">توضیح کوتاه</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={SHOP_COLLECTION_LIMITS.description}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="یک توضیح کوتاه برای این کالکشن بنویسید..."
          />
        </div>

        {/* Images */}
        <div>
          <ImageUploader
            images={images}
            onChange={setImages}
            maxImages={SHOP_COLLECTION_LIMITS.maxImages}
            label="تصاویر کالکشن"
            description="تصویر اول به عنوان تصویر اصلی نمایش داده می‌شود."
          />
          {errors.images && <p className="mt-1 text-xs text-red-600">{errors.images}</p>}
        </div>

        {/* Products */}
        <div>
          <label className="block text-sm font-medium text-gray-900">
            محصولات ({toPersianNumber(items.length)}/{toPersianNumber(SHOP_COLLECTION_LIMITS.maxItems)})
          </label>
          <p className="text-xs text-gray-500 mb-2">
            هر محصول با رنگ مشخصش انتخاب می‌شود؛ لینک همان رنگ در کالکشن نمایش داده
            می‌شود. اگر یکی از آن‌ها ناموجود شود، کل کالکشن ناموجود محسوب می‌شود.
          </p>
          <ProductVariantPicker
            products={products}
            items={items}
            onChange={setItems}
            maxItems={SHOP_COLLECTION_LIMITS.maxItems}
          />
          {errors.items && <p className="mt-1 text-xs text-red-600">{errors.items}</p>}
        </div>

        {/* Price */}
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">قیمت کالکشن</span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Sparkles className="h-3.5 w-3.5" />
              مجموع قیمت محصولات: {itemsTotal.toLocaleString("fa-IR")} تومان
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPriceMode("auto")}
              className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
                priceMode === "auto"
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              خودکار (مجموع قیمت‌ها)
            </button>
            <button
              type="button"
              onClick={() => setPriceMode("custom")}
              className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
                priceMode === "custom"
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              قیمت دستی
            </button>
          </div>
          {priceMode === "custom" && (
            <div>
              <input
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                inputMode="numeric"
                className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="مبلغ به تومان"
              />
              {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
              {priceExceedsSum && (
                <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  قیمت دستی ({parsedCustomPrice.toLocaleString("fa-IR")}) از مجموع قیمت
                  محصولات ({itemsTotal.toLocaleString("fa-IR")}) بیشتر است. کالکشن گران‌تر
                  از خرید تکیِ آیتم‌هایش خواهد بود.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Publish + order */}
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            انتشار عمومی
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            ترتیب نمایش
            <input
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              inputMode="numeric"
              className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="خودکار"
            />
          </label>
        </div>

        <div className="flex justify-start gap-2 pt-2 border-t border-gray-100">
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "در حال ذخیره..." : "ذخیره کالکشن"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            انصراف
          </Button>
        </div>
      </div>
    </Modal>
  );
}
