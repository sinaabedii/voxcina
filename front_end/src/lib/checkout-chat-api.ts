import { sessionManager } from "@/lib/session-manager";
import {
  CheckoutChatMessage,
  CheckoutChatSessionResponse,
  CheckoutNegotiationTurn,
} from "@/types/checkout-chat";

export interface AppendCheckoutMessagesBody {
  chat_id: string;
  messages: CheckoutChatMessage[];
}

export interface AppendCheckoutMessagesResponse {
  success: boolean;
  chat_id: string;
  count: number;
}

export async function getCheckoutChatSession(chatId: string): Promise<CheckoutChatSessionResponse> {
  const res = await sessionManager.fetchWithAuth(`/api/coupons/sessions/${encodeURIComponent(chatId)}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET checkout session -> ${res.status}`);
  }
  return (await res.json()) as CheckoutChatSessionResponse;
}

export async function appendCheckoutChatMessages(
  body: AppendCheckoutMessagesBody
): Promise<AppendCheckoutMessagesResponse> {
  const res = await sessionManager.fetchWithAuth("/api/coupons/sessions/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST checkout messages -> ${res.status}`);
  }
  return (await res.json()) as AppendCheckoutMessagesResponse;
}

export interface NegotiateCheckoutStreamBody {
  message: string;
  chat_id: string;
}

export interface CheckoutNegotiationStreamHandlers {
  onToken: (text: string) => void;
  onDone: (turn: CheckoutNegotiationTurn) => void;
}

interface CheckoutNegotiationStreamEvent extends CheckoutNegotiationTurn {
  type: "token" | "done" | "error";
  text?: string;
  error?: string;
}

/**
 * Runs one checkout discount-negotiation turn over server-sent events. Mirrors
 * streamTryOnChat in tryon-api.ts, but cart-scoped: the backend rebuilds the
 * cart and history from the database, so the body only names the chat.
 */
export async function streamCheckoutNegotiation(
  body: NegotiateCheckoutStreamBody,
  { onToken, onDone }: CheckoutNegotiationStreamHandlers
): Promise<void> {
  const res = await sessionManager.fetchWithAuth("/api/coupons/negotiate-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error("خطا در ارتباط با فروشنده");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    if (done) buffer += decoder.decode();

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let event: CheckoutNegotiationStreamEvent;
      try {
        event = JSON.parse(line.slice(6));
      } catch (err) {
        if (err instanceof SyntaxError) continue;
        throw err;
      }
      if (event.type === "token") onToken(event.text || "");
      else if (event.type === "done") onDone(event);
      else if (event.type === "error") throw new Error(event.error || "خطا در مذاکره");
    }

    if (done) break;
  }
}

export function makeCheckoutMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
