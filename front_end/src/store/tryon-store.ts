import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TryOnState {
  uploadedFile: File | null;          // raw file selected by user
  uploadedPreview: string | null;     // preview data URL for UI
  resultImage: string | null;         // resulting composite image URL
  taskToken: string | null;           // token returned by backend
  tokenCreatedAt: number | null;      // ms timestamp when token was saved
  reloadAttempts: number;             // how many times page reloaded since token stored
  isProcessing: boolean;
  error: string | null;

  garmentType: string;           // selected garment type: upper_body, lower_body, dresses
  steps: number;                 // number of steps for try-on
  setGarmentType: (type: string) => void;
  setSteps: (steps: number) => void;

  setUploadedFile: (file: File | null) => void;
  clear: () => void;
  startTryOn: (garmentImageUrl: string) => Promise<void>;
  resumePending: () => Promise<void>;
}

export const useTryOnStore = create<TryOnState>()(
  persist(
    (set, get) => ({
      uploadedFile: null,
      uploadedPreview: null,
      resultImage: null,
      taskToken: null,
      tokenCreatedAt: null,
      reloadAttempts: 0,
      isProcessing: false,
      error: null,
      garmentType: "upper_body",
      steps: 20,

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

      setGarmentType: (type) => set({ garmentType: type }),
      setSteps: (steps) => set({ steps }),

      clear: () =>
        set({
          uploadedFile: null,
          uploadedPreview: null,
          resultImage: null,
          taskToken: null,
          tokenCreatedAt: null,
          reloadAttempts: 0,
          isProcessing: false,
          error: null,
          garmentType: "upper_body",
          steps: 20,
        }),

      startTryOn: async (garmentImageUrl: string) => {
        const { uploadedFile } = get();
        if (!uploadedFile) return;

        try {
          set({ isProcessing: true, error: null, resultImage: null });

          // fetch garment image as blob
          const garmentResp = await fetch(garmentImageUrl);
          if (!garmentResp.ok) throw new Error("خطا در دریافت تصویر لباس");
          const garmentBlob = await garmentResp.blob();
          const garmentFile = new File([garmentBlob], "garment.jpg", { type: garmentBlob.type });

          const formData = new FormData();
          formData.append("person_image", uploadedFile);
          formData.append("garment_image", garmentFile);
          formData.append("model_type", "viton_hd");
          const { garmentType, steps } = get();
          formData.append("garment_type", garmentType);
          formData.append("steps", steps.toString());

          const submitRes = await fetch("/viton/submit-tryon-files", {
            method: "POST",
            body: formData,
          });
          if (!submitRes.ok) throw new Error("ارسال تصاویر با خطا مواجه شد");
          const submitData = await submitRes.json();
          const token = submitData?.token as string | undefined;
          if (!token) throw new Error("توکن دریافت نشد");

          set({ taskToken: token, tokenCreatedAt: Date.now(), reloadAttempts: 0 });

          // poll status every 2s
          const poll = async () => {
            for (let i = 0; i < 60; i++) {
              await new Promise((r) => setTimeout(r, 2000));
              const statusRes = await fetch(`/viton/job-status/${token}`);
              if (!statusRes.ok) continue;
              const statusData = await statusRes.json();
              if (statusData.status === "completed") {
                return true;
              } else if (statusData.status === "failed") {
                throw new Error("پردازش ناموفق بود");
              }
            }
            throw new Error("زمان پردازش به پایان رسید");
          };

          await poll();

          const resultRes = await fetch(`/viton/get-result/${token}`);
          if (!resultRes.ok) throw new Error("دریافت نتیجه ناموفق بود");
          const json = await resultRes.json();
          const base64: string | undefined = json?.result?.generated_image;
          if (!base64) throw new Error("تصویر تولید شده در پاسخ وجود ندارد");
          const resultUrl = base64.startsWith("data:")
            ? base64
            : `data:image/png;base64,${base64}`;

          set({
            resultImage: resultUrl,
            isProcessing: false,
            taskToken: null,
            tokenCreatedAt: null,
            reloadAttempts: 0,
          });
        } catch (err: any) {
          set({ error: err?.message || "خطای نامشخص", isProcessing: false });
        }
      },

      resumePending: async () => {
        const { taskToken, tokenCreatedAt, resultImage, isProcessing, reloadAttempts } = get();
        if (!taskToken || resultImage || isProcessing) return;
        if (tokenCreatedAt && Date.now() - tokenCreatedAt > 30000) {
          // token expired
          set({ taskToken: null, tokenCreatedAt: null, reloadAttempts: 0 });
          return;
        }
        if (reloadAttempts >= 3) {
          set({ taskToken: null, tokenCreatedAt: null, reloadAttempts: 0 });
          return;
        }
        // mark as processing & increment attempts
        set({ isProcessing: true, error: null, reloadAttempts: reloadAttempts + 1 });

        try {
          const pollStatus = async () => {
            for (let i = 0; i < 15; i++) {
              await new Promise((r) => setTimeout(r, 2000));
              const statusRes = await fetch(`/viton/job-status/${taskToken}`);
              if (!statusRes.ok) continue;
              const statusData = await statusRes.json();
              if (statusData.status === "completed") return true;
              if (statusData.status === "failed") throw new Error("پردازش ناموفق بود");
            }
            return false;
          };

          const done = await pollStatus();
          if (!done) {
            set({ isProcessing: false });
            return;
          }

          const resultRes = await fetch(`/viton/get-result/${taskToken}`);
          if (!resultRes.ok) throw new Error("دریافت نتیجه ناموفق بود");
          const json = await resultRes.json();
          const base64: string | undefined = json?.result?.generated_image;
          if (!base64) throw new Error("تصویر تولید شده در پاسخ وجود ندارد");
          const url = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
          set({
            resultImage: url,
            isProcessing: false,
            taskToken: null,
            tokenCreatedAt: null,
            reloadAttempts: 0,
          });
        } catch (err: any) {
          set({ error: err?.message || "خطای نامشخص", isProcessing: false });
        }
      },
    }),
    {
      name: "digi-style-tryon", // localStorage key
      partialize: (state) => ({
        taskToken: state.taskToken,
        tokenCreatedAt: state.tokenCreatedAt,
        reloadAttempts: state.reloadAttempts,
      }),
    }
  )
); 