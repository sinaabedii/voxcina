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

  __tryOnAbortController: AbortController | null;

  setUploadedFile: (file: File | null) => void;
  setInspectedItem: (name: string, garmentType: string) => void;
  clearInspectedItem: () => void;
  setCoupon: (code: string, value: number, validUntil: string) => void;
  clearCoupon: () => void;
  clearResult: () => void;
  clear: () => void;
  startTryOn: (garmentImageUrl: string, garmentType: string) => Promise<void>;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
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
    __tryOnAbortController: null,

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

    clearInspectedItem: () =>
      set({ inspectedItemName: null, inspectedGarmentType: null }),

    setCoupon: (code, value, validUntil) =>
      set({ couponCode: code, couponValue: value, couponValidUntil: validUntil }),

    clearCoupon: () =>
      set({ couponCode: null, couponValue: null, couponValidUntil: null }),

    clearResult: () => {
      const state = get();
      if (state.__tryOnAbortController) {
        state.__tryOnAbortController.abort();
      }
      set({
        resultImage: null,
        isProcessing: false,
        error: null,
        __tryOnAbortController: null,
      });
    },

    clear: () => {
      const state = get();
      if (state.__tryOnAbortController) {
        state.__tryOnAbortController.abort();
      }
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
        __tryOnAbortController: null,
      });
    },

    startTryOn: async (garmentImageUrl: string, garmentType: string) => {
      const { uploadedFile } = get();
      if (!uploadedFile) return;

      const token = getAuthToken();
      if (!token) {
        set({ error: "لطفاً وارد شوید", isProcessing: false });
        return;
      }

      // Abort any previous try-on stream
      get().__tryOnAbortController?.abort();
      const abortController = new AbortController();
      set({ __tryOnAbortController: abortController });

      try {
        set({ isProcessing: true, error: null });

        const formData = new FormData();
        formData.append("person_image", uploadedFile);
        formData.append("garment_image_url", garmentImageUrl);
        formData.append("garment_type", garmentType);

        const res = await fetch("/api/tryon/generate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || "خطا در پردازش پرو مجازی");
        }

        const data = await res.json();
        const taskId = data?.task_id as string | undefined;
        if (!taskId) throw new Error("شناسه تسک در پاسخ وجود ندارد");

        await waitForTryOnTask(taskId, token, abortController.signal, (image) => {
          if (!abortController.signal.aborted) {
            set({ resultImage: image, isProcessing: false });
          }
        });
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        set({ error: err?.message || "خطای نامشخص", isProcessing: false });
      } finally {
        if (!abortController.signal.aborted) {
          set({ __tryOnAbortController: null });
        }
      }
    },
  })
);

async function waitForTryOnTask(
  taskId: string,
  token: string,
  signal: AbortSignal,
  onDone: (image: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let settled = false;

    const cleanup = () => {
      if (reader) {
        reader.cancel().catch(() => {});
        reader = null;
      }
      signal.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("AbortError"));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort);

    const url = `/api/tryon/status-stream?task_id=${encodeURIComponent(taskId)}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
      .then((res) => {
        if (!res.ok || !res.body) {
          throw new Error("خطا در دریافت وضعیت");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        reader = res.body.getReader();

        const pump = (): Promise<void> => {
          return reader!.read().then(({ done, value }) => {
            if (settled) return;

            if (value) {
              buffer += decoder.decode(value, { stream: true });
            }
            if (done) {
              buffer += decoder.decode();
            }

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;
              try {
                const payload = JSON.parse(trimmed.slice(6));
                if (payload.status === "done" && payload.image) {
                  settled = true;
                  onDone(payload.image);
                  cleanup();
                  resolve();
                  return;
                }
                if (payload.status === "error") {
                  throw new Error(payload.error || "خطا در پردازش پرو مجازی");
                }
              } catch (parseErr: any) {
                if (parseErr instanceof SyntaxError) continue;
                throw parseErr;
              }
            }

            if (done) {
              return;
            }

            return pump();
          });
        };

        return pump().then(() => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        });
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (err?.name === "AbortError") {
          reject(new Error("AbortError"));
        } else {
          reject(err);
        }
      });
  });
}
