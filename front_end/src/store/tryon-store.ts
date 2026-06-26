import { create } from "zustand";
import {
  VirtualTryon,
  TryonChat,
  TryonChatMessage,
  TryonChatSession,
  appendTryonMessages,
  getTryonSession,
  linkTryonToChat,
  makeMessageId,
} from "@/lib/tryon-api";

interface PersistedTryon {
  tryon_id: string;
  product_id?: string;
  product_name?: string;
  color?: string;
  size?: string;
  garment_type: string;
  before_image: string;
  after_image: string;
  room_number: number;
}

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

  // Persisted session linkage
  chatId: string | null;
  currentTryonId: string | null;

  // Restored state from DB
  isLoadingSession: boolean;
  persistedMessages: TryonChatMessage[];
  persistedTryons: VirtualTryon[];

  setUploadedFile: (file: File | null) => void;
  setUploadedPreview: (preview: string | null) => void;
  setResultImage: (url: string | null) => void;
  setInspectedItem: (name: string, garmentType: string) => void;
  clearInspectedItem: () => void;
  setCoupon: (code: string, value: number, validUntil: string) => void;
  clearCoupon: () => void;
  clearResult: () => void;
  clear: () => void;
  startTryOn: (garmentImageUrl: string, garmentType: string) => Promise<void>;

  // Persistence actions
  ensureChatId: () => string;
  setCurrentTryonId: (id: string | null) => void;
  setChatId: (id: string | null) => void;
  loadSession: (chatId: string) => Promise<void>;
  restoreTryon: (tryon: PersistedTryon) => void;
  persistMessage: (msg: TryonChatMessage) => Promise<void>;
  persistTryonMessage: (data: PersistedTryon) => Promise<void>;
  resetPersistedState: () => void;
  startNewRoom: () => void;
}

const CHAT_ID_LS_KEY = "voxcina_tryon_chat_id";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

function generateChatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return "tchat-" + (crypto as Crypto).randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return "tchat-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
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

    chatId: null,
    currentTryonId: null,

    isLoadingSession: false,
    persistedMessages: [],
    persistedTryons: [],

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

    setUploadedPreview: (preview) => set({ uploadedPreview: preview }),

    setResultImage: (url) => set({ resultImage: url }),

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
      if (typeof window !== "undefined") {
        localStorage.removeItem(CHAT_ID_LS_KEY);
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
        chatId: null,
        currentTryonId: null,
        persistedMessages: [],
        persistedTryons: [],
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

      // Ensure a chat_id exists for this room before generating
      const chatId = get().ensureChatId();

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
        formData.append("chat_id", chatId);

        // Product metadata is attached by the page-level wrapper (see
        // tryon page's handleTryOn). The store stays product-agnostic.

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
        const tryonId = data?.tryon_id as string | undefined;
        if (!taskId) throw new Error("شناسه تسک در پاسخ وجود ندارد");
        if (tryonId) {
          set({ currentTryonId: tryonId });
        }

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

    ensureChatId: () => {
      const existing = get().chatId;
      if (existing) return existing;
      if (typeof window === "undefined") {
        return generateChatId();
      }
      const stored = localStorage.getItem(CHAT_ID_LS_KEY);
      if (stored) {
        set({ chatId: stored });
        return stored;
      }
      const fresh = generateChatId();
      localStorage.setItem(CHAT_ID_LS_KEY, fresh);
      set({ chatId: fresh });
      return fresh;
    },

    setCurrentTryonId: (id) => set({ currentTryonId: id }),
    setChatId: (id) => {
      if (typeof window !== "undefined") {
        if (id) {
          localStorage.setItem(CHAT_ID_LS_KEY, id);
        } else {
          localStorage.removeItem(CHAT_ID_LS_KEY);
        }
      }
      set({ chatId: id });
    },

    loadSession: async (chatId: string) => {
      set({ isLoadingSession: true });
      try {
        const data = await getTryonSession(chatId);
        if (data?.success) {
          set({
            chatId: data.chat.chat_id,
            persistedMessages: data.chat.messages || [],
            persistedTryons: data.tryons || [],
          });
          // Restore last coupon if present
          const lastCouponMsg = [...(data.chat.messages || [])]
            .reverse()
            .find((m) => m.tool_call?.name === "offer_coupon" && m.tool_call.result);
          if (lastCouponMsg?.tool_call?.result) {
            const r = lastCouponMsg.tool_call.result;
            if (typeof r.code === "string" && typeof r.value === "number" && typeof r.valid_until === "string") {
              set({
                couponCode: r.code,
                couponValue: r.value,
                couponValidUntil: r.valid_until,
              });
            }
          }
          // Restore last tryon result image if no live resultImage
          if (!get().resultImage && data.tryons?.length) {
            const lastDone = [...data.tryons].reverse().find((t) => t.status === "done");
            if (lastDone?.result_image_url) {
              set({ resultImage: lastDone.result_image_url });
            }
            const last = data.tryons[data.tryons.length - 1];
            if (last) {
              set({ currentTryonId: last.tryon_id });
            }
          }
        }
      } catch {
        // ignore — empty state
      } finally {
        set({ isLoadingSession: false });
      }
    },

    restoreTryon: (tryon: PersistedTryon) => {
      // Used when loading a session to apply its last result to UI
      set({
        resultImage: tryon.after_image,
        uploadedPreview: tryon.before_image,
        inspectedItemName: tryon.product_name || null,
        inspectedGarmentType: tryon.garment_type || null,
      });
    },

    persistMessage: async (msg: TryonChatMessage) => {
      const { chatId } = get();
      if (!chatId) return;
      try {
        await appendTryonMessages({ chat_id: chatId, messages: [msg] });
      } catch {
        // non-blocking; server is best-effort
      }
    },

    persistTryonMessage: async (data: PersistedTryon) => {
      const { chatId } = get();
      if (!chatId) return;
      const msg: TryonChatMessage = {
        id: makeMessageId(),
        role: "tryon",
        content: `اتاق پرو ${toPersianDigits(data.room_number)}`,
        timestamp: new Date().toISOString(),
        tryon_data: {
          room_number: data.room_number,
          before_image: data.before_image,
          after_image: data.after_image,
          product_id: data.product_id,
          product_name: data.product_name || "",
          color: data.color,
          size: data.size,
          garment_type: data.garment_type,
          tryon_id: data.tryon_id,
        },
      };
      try {
        await appendTryonMessages({ chat_id: chatId, messages: [msg] });
        // Also link the tryon_id to the chat in case the message insert was skipped
        try {
          await linkTryonToChat({ chat_id: chatId, tryon_id: data.tryon_id });
        } catch {
          // ignore
        }
      } catch {
        // non-blocking
      }
    },

    resetPersistedState: () =>
      set({
        chatId: null,
        currentTryonId: null,
        persistedMessages: [],
        persistedTryons: [],
        isLoadingSession: false,
      }),

    startNewRoom: () => {
      const state = get();
      if (state.__tryOnAbortController) {
        state.__tryOnAbortController.abort();
      }
      const freshId = generateChatId();
      if (typeof window !== "undefined") {
        localStorage.setItem(CHAT_ID_LS_KEY, freshId);
      }
      set({
        __tryOnAbortController: null,
        chatId: freshId,
        currentTryonId: null,
        persistedMessages: [],
        persistedTryons: [],
        isLoadingSession: false,
        resultImage: null,
        inspectedItemName: null,
        inspectedGarmentType: null,
        couponCode: null,
        couponValue: null,
        couponValidUntil: null,
      });
    },
  })
);

function toPersianDigits(n: number): string {
  return n.toLocaleString("fa-IR", { useGrouping: false });
}

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
