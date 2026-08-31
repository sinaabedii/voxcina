import { create } from "zustand";

import { appendCheckoutChatMessages, getCheckoutChatSession, makeCheckoutMessageId } from "@/lib/checkout-chat-api";
import { CheckoutChatMessage } from "@/types/checkout-chat";
import { CheckoutUIMessage } from "@/types/checkout-chat";

interface CheckoutChatState {
  chatId: string | null;
  messages: CheckoutUIMessage[];
  isLoadingSession: boolean;
  hasLoadedOnce: boolean;

  couponCode: string | null;
  couponValue: number | null;
  couponValidUntil: string | null;

  ensureChatId: () => string;
  loadSession: (chatId: string) => Promise<void>;
  appendLocalMessage: (message: CheckoutUIMessage) => void;
  replaceLastStreaming: (message: CheckoutUIMessage) => void;
  persistMessage: (message: CheckoutUIMessage) => Promise<void>;
  setCoupon: (code: string, value: number, validUntil: string) => void;
  clearCoupon: () => void;
  reset: () => void;
}

const CHAT_ID_LS_KEY = "voxcina_checkout_chat_id";

function generateChatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return "cchat-" + (crypto as Crypto).randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return "cchat-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function toStoredMessage(message: CheckoutUIMessage): CheckoutChatMessage {
  return {
    id: makeCheckoutMessageId(),
    role: message.role === "agent_streaming" ? "agent" : message.role,
    content: message.content,
    timestamp: new Date().toISOString(),
    tool_call: message.coupon
      ? {
          name: "offer_coupon",
          arguments: {},
          result: {
            code: message.coupon.code,
            value: message.coupon.value,
            valid_until: message.coupon.valid_until,
          },
        }
      : undefined,
  };
}

export const useCheckoutChatStore = create<CheckoutChatState>()((set, get) => ({
  chatId: null,
  messages: [],
  isLoadingSession: false,
  hasLoadedOnce: false,

  couponCode: null,
  couponValue: null,
  couponValidUntil: null,

  ensureChatId: () => {
    const existing = get().chatId;
    if (existing) return existing;
    if (typeof window === "undefined") return generateChatId();
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

  loadSession: async (chatId) => {
    set({ isLoadingSession: true });
    try {
      const data = await getCheckoutChatSession(chatId);
      const messages: CheckoutUIMessage[] = (data.chat?.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
        coupon:
          m.tool_call?.name === "offer_coupon" &&
          typeof m.tool_call.result?.code === "string" &&
          typeof m.tool_call.result?.value === "number" &&
          typeof m.tool_call.result?.valid_until === "string"
            ? {
                code: m.tool_call.result.code as string,
                value: m.tool_call.result.value as number,
                valid_until: m.tool_call.result.valid_until as string,
              }
            : undefined,
      }));
      const lastCoupon = [...messages].reverse().find((m) => m.coupon)?.coupon;
      set({
        messages,
        hasLoadedOnce: true,
        couponCode: lastCoupon?.code ?? null,
        couponValue: lastCoupon?.value ?? null,
        couponValidUntil: lastCoupon?.valid_until ?? null,
      });
    } catch {
      // No session yet, or a transient error — the chat simply starts empty.
      set({ hasLoadedOnce: true });
    } finally {
      set({ isLoadingSession: false });
    }
  },

  appendLocalMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  replaceLastStreaming: (message) =>
    set((state) => {
      const lastIdx = state.messages.length - 1;
      if (state.messages[lastIdx]?.role !== "agent_streaming") {
        return { messages: [...state.messages, message] };
      }
      const copy = [...state.messages];
      copy[lastIdx] = message;
      return { messages: copy };
    }),

  persistMessage: async (message) => {
    const chatId = get().chatId;
    if (!chatId) return;
    try {
      await appendCheckoutChatMessages({ chat_id: chatId, messages: [toStoredMessage(message)] });
    } catch {
      // Best-effort; the local transcript already has it.
    }
  },

  setCoupon: (code, value, validUntil) =>
    set({ couponCode: code, couponValue: value, couponValidUntil: validUntil }),

  clearCoupon: () => set({ couponCode: null, couponValue: null, couponValidUntil: null }),

  reset: () => {
    if (typeof window !== "undefined") localStorage.removeItem(CHAT_ID_LS_KEY);
    set({
      chatId: null,
      messages: [],
      isLoadingSession: false,
      hasLoadedOnce: false,
      couponCode: null,
      couponValue: null,
      couponValidUntil: null,
    });
  },
}));
