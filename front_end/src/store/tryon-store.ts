import { create } from "zustand";

interface TryOnState {
  uploadedFile: File | null;
  uploadedPreview: string | null;
  resultImage: string | null;
  isProcessing: boolean;
  error: string | null;

  inspectedItemName: string | null;
  inspectedGarmentType: string | null;

  couponCode: string | null;
  couponValue: number | null;
  couponValidUntil: string | null;

  setUploadedFile: (file: File | null) => void;
  setInspectedItem: (name: string, garmentType: string) => void;
  setCoupon: (code: string, value: number, validUntil: string) => void;
  clearCoupon: () => void;
  clear: () => void;
  startTryOn: (garmentImageUrl: string, garmentType: string) => Promise<void>;
}

export const useTryOnStore = create<TryOnState>()(
  (set, get) => ({
    uploadedFile: null,
    uploadedPreview: null,
    resultImage: null,
    isProcessing: false,
    error: null,

    inspectedItemName: null,
    inspectedGarmentType: null,

    couponCode: null,
    couponValue: null,
    couponValidUntil: null,

    setUploadedFile: (file) => {
      if (!file) {
        set({ uploadedFile: null, uploadedPreview: null });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          set({ uploadedFile: file, uploadedPreview: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    },

    setInspectedItem: (name, garmentType) =>
      set({ inspectedItemName: name, inspectedGarmentType: garmentType }),

    setCoupon: (code, value, validUntil) =>
      set({ couponCode: code, couponValue: value, couponValidUntil: validUntil }),

    clearCoupon: () =>
      set({ couponCode: null, couponValue: null, couponValidUntil: null }),

    clear: () =>
      set({
        uploadedFile: null,
        uploadedPreview: null,
        resultImage: null,
        isProcessing: false,
        error: null,
        inspectedItemName: null,
        inspectedGarmentType: null,
        couponCode: null,
        couponValue: null,
        couponValidUntil: null,
      }),

    startTryOn: async (garmentImageUrl: string, garmentType: string) => {
      const { uploadedFile } = get();
      if (!uploadedFile) return;

      try {
        set({ isProcessing: true, error: null, resultImage: null });

        const garmentResp = await fetch(garmentImageUrl);
        if (!garmentResp.ok) throw new Error("خطا در دریافت تصویر لباس");
        const garmentBlob = await garmentResp.blob();
        const garmentFile = new File([garmentBlob], "garment.jpg", { type: garmentBlob.type });

        const formData = new FormData();
        formData.append("person_image", uploadedFile);
        formData.append("garment_image", garmentFile);
        formData.append("garment_type", garmentType);

        const res = await fetch("/api/tryon/generate", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || "خطا در پردازش پرو مجازی");
        }

        const data = await res.json();
        const imageUrl = data?.image as string | undefined;
        if (!imageUrl) throw new Error("تصویر تولید شده در پاسخ وجود ندارد");

        set({
          resultImage: imageUrl,
          isProcessing: false,
        });
      } catch (err: any) {
        set({ error: err?.message || "خطای نامشخص", isProcessing: false });
      }
    },
  })
);
