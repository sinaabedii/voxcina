import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TryOnState {
  uploadedImage: string | null;      // base64 or URL of the user-uploaded image
  resultImage: string | null;        // mock result image URL
  isProcessing: boolean;            // true while mock API is processing

  // actions
  setUploadedImage: (img: string | null) => void;
  clear: () => void;
  startTryOn: (productTryOnImage: string) => Promise<void>;
}

export const useTryOnStore = create<TryOnState>()(
  persist(
    (set, get) => ({
      uploadedImage: null,
      resultImage: null,
      isProcessing: false,

      setUploadedImage: (img) => set({ uploadedImage: img }),

      clear: () => set({ uploadedImage: null, resultImage: null, isProcessing: false }),

      startTryOn: async (productTryOnImage: string) => {
        const { uploadedImage } = get();
        if (!uploadedImage) return; // nothing to process

        set({ isProcessing: true, resultImage: null });

        // simulate 6-second processing delay
        await new Promise((res) => setTimeout(res, 6000));

        // For the mock we just echo back the product try-on image.
        set({ resultImage: productTryOnImage, isProcessing: false });
      },
    }),
    {
      name: "digi-style-tryon", // localStorage key
      partialize: (state) => ({
        uploadedImage: state.uploadedImage,
        resultImage: state.resultImage,
      }),
    }
  )
); 