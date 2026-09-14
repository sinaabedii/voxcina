import { create } from "zustand";

import { PER_USER_STORAGE_KEYS } from "@/lib/local-storage-manager";
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

/**
 * Identifies which garment is being tried on.
 *
 * The backend joins these to the product's per-variant AI metadata to name the
 * garment's type and قواره (shape/fit) in the image prompt — the product photo
 * alone leaves the cut open to interpretation. It also fills the columns the
 * admin try-on log reads, which stayed blank while nothing sent them.
 */
export interface TryOnGarmentMeta {
  productId?: string;
  variantId?: string;
  productName?: string;
  color?: string;
  colorName?: string;
  size?: string;
}

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
  clearResult: () => void;
  clear: () => void;
  startTryOn: (garmentImageUrl: string, garmentType: string, garment?: TryOnGarmentMeta) => Promise<void>;

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

const CHAT_ID_LS_KEY = PER_USER_STORAGE_KEYS.TRYON_CHAT_ID;

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
        __tryOnAbortController: null,
        chatId: null,
        currentTryonId: null,
        persistedMessages: [],
        persistedTryons: [],
      });
    },

    startTryOn: async (garmentImageUrl: string, garmentType: string, garment?: TryOnGarmentMeta) => {
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
        // resultImage is cleared here, not just on success. It holds the
        // previous room's image (restored from the session on load, or left by
        // the last generation), and every reader downstream treats whatever is
        // in it once startTryOn returns as *this* try-on's result — so a
        // generation that fails to produce one used to publish the previous
        // image under the new garment's name, and persist it to the transcript.
        set({ isProcessing: true, error: null, resultImage: null, currentTryonId: null });

        const formData = new FormData();
        formData.append("person_image", uploadedFile);
        formData.append("garment_image_url", garmentImageUrl);
        formData.append("garment_type", garmentType);
        formData.append("chat_id", chatId);

        // Which garment this is. The backend looks the variant up from these to
        // put its type and قواره in the image prompt, so anything missing here
        // costs prompt detail rather than breaking the request.
        const garmentFields: Record<string, string | undefined> = {
          garment_product_id: garment?.productId,
          garment_variant_id: garment?.variantId,
          garment_product_name: garment?.productName,
          garment_color: garment?.color,
          garment_color_name: garment?.colorName,
          garment_size: garment?.size,
        };
        for (const [key, value] of Object.entries(garmentFields)) {
          if (value) formData.append(key, value);
        }

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
        const serverChatId = data?.chat_id as string | undefined;
        if (!taskId) throw new Error("شناسه تسک در پاسخ وجود ندارد");
        if (tryonId) {
          set({ currentTryonId: tryonId });
        }
        // The room id we sent is only a request. The backend starts a fresh
        // room when the one in localStorage belongs to another account — which
        // is what a logout on a shared browser leaves behind — and names it in
        // the response.
        if (serverChatId && serverChatId !== chatId) {
          get().setChatId(serverChatId);
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
          // Restore last tryon state if no live result
          if (data.tryons?.length) {
            const lastDone = [...data.tryons].reverse().find((t) => t.status === "done");
            const last = data.tryons[data.tryons.length - 1];
            const patch: Partial<TryOnState> = {};
            if (!get().resultImage && lastDone?.result_image_url) {
              patch.resultImage = lastDone.result_image_url;
            }
            // Always restore the person image preview from the most recent tryon
            // (person_image_url is a stable backend URL, not a blob — safe across reloads)
            const previewSource = lastDone ?? last;
            if (!get().uploadedPreview && previewSource?.person_image_url) {
              patch.uploadedPreview = previewSource.person_image_url;
            }
            if (last?.tryon_id) {
              patch.currentTryonId = last.tryon_id;
            }
            if (Object.keys(patch).length) set(patch);
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
      const { chatId, persistedMessages } = get();
      if (!chatId) return;
      try {
        await appendTryonMessages({ chat_id: chatId, messages: [msg] });
        set({ persistedMessages: [...persistedMessages, msg] });
      } catch {
        // non-blocking; server is best-effort
      }
    },

    persistTryonMessage: async (data: PersistedTryon) => {
      const { chatId, persistedMessages } = get();
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
        set({ persistedMessages: [...persistedMessages, msg] });
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
      });
    },
  })
);

function toPersianDigits(n: number): string {
  return n.toLocaleString("fa-IR", { useGrouping: false });
}

const TASK_DEADLINE_MS = 5 * 60 * 1000; // the server gives up on a task at the same mark
const TASK_POLL_INTERVAL_MS = 2000;

/** A verdict from the server: the generation itself failed. Not retryable. */
class TryOnTaskError extends Error {}

function abortError(): Error {
  const err = new Error("AbortError");
  err.name = "AbortError";
  return err;
}

function isAbortError(err: unknown): boolean {
  return (err as { name?: string } | null)?.name === "AbortError";
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Waits for a try-on task, over the event stream first and by polling if that
 * stream does not deliver a verdict.
 *
 * The task lives in the backend, not in the connection: a stream that ends
 * early says nothing about whether the image was drawn. It used to be read as
 * success — the promise resolved with no image, `isProcessing` stayed true, and
 * the room sat on its spinner with no error and no result. Every generation
 * slower than the shortest idle timeout in front of the API landed there.
 */
async function waitForTryOnTask(
  taskId: string,
  token: string,
  signal: AbortSignal,
  onDone: (image: string) => void
): Promise<void> {
  const deadline = Date.now() + TASK_DEADLINE_MS;

  try {
    const image = await streamTryOnResult(taskId, token, signal);
    if (image) {
      onDone(image);
      return;
    }
  } catch (err) {
    // An abort is the caller's decision and a task error is the server's
    // verdict; both are final. Anything else means the connection broke while
    // the generation was still running, so fall through and ask for it.
    if (isAbortError(err) || err instanceof TryOnTaskError) throw err;
  }

  onDone(await pollTryOnResult(taskId, token, signal, deadline));
}

/** Resolves with the image, or with null if the stream ended without a verdict. */
async function streamTryOnResult(
  taskId: string,
  token: string,
  signal: AbortSignal
): Promise<string | null> {
  const url = `/api/tryon/status-stream?task_id=${encodeURIComponent(taskId)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!res.ok || !res.body) {
    throw new Error("خطا در دریافت وضعیت");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });
      if (done) buffer += decoder.decode();

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        // Heartbeat comments (": keep-alive") land here too and are skipped —
        // they exist to keep proxies from closing an idle connection.
        if (!trimmed.startsWith("data: ")) continue;
        let payload: { status?: string; image?: string; error?: string };
        try {
          payload = JSON.parse(trimmed.slice(6));
        } catch {
          continue;
        }
        if (payload.status === "done" && payload.image) return payload.image;
        if (payload.status === "error") {
          throw new TryOnTaskError(payload.error || "خطا در پردازش پرو مجازی");
        }
      }

      if (done) return null;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/** Asks the backend for the task directly until it has a verdict. */
async function pollTryOnResult(
  taskId: string,
  token: string,
  signal: AbortSignal,
  deadline: number
): Promise<string> {
  const url = `/api/tryon/status?task_id=${encodeURIComponent(taskId)}`;

  for (;;) {
    if (signal.aborted) throw abortError();

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
    if (res.status === 404) {
      throw new TryOnTaskError("نتیجه پرو مجازی در دسترس نیست. دوباره تلاش کنید.");
    }
    if (res.ok) {
      const data: { status?: string; image?: string; error?: string } = await res
        .json()
        .catch(() => ({}));
      if (data.status === "done" && data.image) return data.image;
      if (data.status === "error") {
        throw new TryOnTaskError(data.error || "خطا در پردازش پرو مجازی");
      }
    }

    if (Date.now() >= deadline) {
      throw new TryOnTaskError("زمان انتظار به پایان رسید. دوباره تلاش کنید.");
    }
    await sleep(TASK_POLL_INTERVAL_MS, signal);
  }
}
