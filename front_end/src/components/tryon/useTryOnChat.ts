"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { TRYON_CHAT_OPENERS } from "@/components/tryon/ChatComposer";
import { getCanonicalColor } from "@/lib/product-variants";
import { makeMessageId as makeDbMessageId, streamTryOnChat } from "@/lib/tryon-api";
import {
  AGENT_ERROR_REPLY,
  agentMessageForTurn,
  replaceStreamingMessage,
  restoreChatMessages,
  welcomeReply,
} from "@/lib/tryon-transcript";
import { useTryOnStore } from "@/store/tryon-store";
import { ChatMessage, TryOnEligibleItem } from "@/types/tryon";

/** Opener wordings shipped before the redesign — persisted user turns may
 * carry these, so they must still count as "opener used". */
const LEGACY_OPENER_TEXTS = [
  "این روم من چطوره؟",
  "یه ست پیشنهاد بده",
  "رنگ دیگه‌ای هم داره؟",
];
interface UseTryOnChatParams {
  isAuthorized: boolean;
  userName?: string;
  eligibleItems: TryOnEligibleItem[];
  activeItemIndex: number | null;
  onResetRoom?: () => void;
}

export function useTryOnChat({
  isAuthorized,
  userName,
  eligibleItems,
  activeItemIndex,
  onResetRoom,
}: UseTryOnChatParams) {
  const {
    chatId,
    persistedMessages,
    persistedTryons,
    isLoadingSession,
    ensureChatId,
    loadSession,
    persistMessage,
    startNewRoom,
    inspectedItemName,
    setInspectedItem,
    resultImage,
  } = useTryOnStore();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChatOpeners, setShowChatOpeners] = useState(false);

  const chatInitializedRef = useRef(false);
  const hydratedForChatIdRef = useRef<string | null>(null);
  const chatRestoredRef = useRef(false);
  const restoredFromDbRef = useRef(false);

  // Load persisted chat session for this user on mount
  useEffect(() => {
    if (!isAuthorized) return;
    loadSession(ensureChatId());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  // Single hydration effect: restore persisted messages OR show welcome on first visit.
  // Consolidates welcome + hydration to eliminate race conditions that caused duplicate welcome messages.
  useEffect(() => {
    if (!chatId) return;
    if (hydratedForChatIdRef.current === chatId) return;
    if (isLoadingSession) return;

    if (persistedMessages.length > 0) {
      setChatMessages(restoreChatMessages(persistedMessages, persistedTryons));
    } else if (eligibleItems.length > 0 && chatMessages.length === 0) {
      // First visit — no persisted messages, cart has eligible items: show welcome
      const welcomeText = welcomeReply(userName?.split(" ")[0]);
      setChatMessages([{ role: "agent", content: welcomeText }]);
      persistMessage({
        id: makeDbMessageId(),
        role: "agent",
        content: welcomeText,
        timestamp: new Date().toISOString(),
      });
    }

    hydratedForChatIdRef.current = chatId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isLoadingSession, eligibleItems.length]);

  // After hydration, restore chat-opener visibility.
  // Show openers if a try-on result exists and the user hasn't used one yet.
  useEffect(() => {
    if (chatRestoredRef.current) return;
    if (!hydratedForChatIdRef.current || isLoadingSession) return;
    if (!resultImage || chatMessages.length === 0) return;

    chatRestoredRef.current = true;
    const openerTexts = new Set([
      ...TRYON_CHAT_OPENERS.map((o) => o.text),
      ...LEGACY_OPENER_TEXTS,
    ]);
    const userUsedOpener = chatMessages.some((m) => m.role === "user" && openerTexts.has(m.content));
    if (!userUsedOpener) {
      setShowChatOpeners(true);
      chatInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultImage, chatMessages.length, isLoadingSession]);

  // When persisted tryons are loaded, restore garment/inspected-item UI state.
  useEffect(() => {
    if (restoredFromDbRef.current) return;
    if (!persistedTryons.length) return;
    const done = persistedTryons.filter((t) => t.status === "done");
    if (!done.length) return;
    const last = done[done.length - 1];
    if (last.garment_product_name && !inspectedItemName) {
      setInspectedItem(last.garment_product_name, last.garment_type);
    }
    restoredFromDbRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedTryons.length]);

  // Reset hydration flag when the user starts a fresh room
  useEffect(() => {
    if (!chatId) {
      hydratedForChatIdRef.current = null;
      restoredFromDbRef.current = false;
    }
  }, [chatId]);

  // Resolve the garment the conversation centers on.
  const resolveChatTarget = useCallback(
    (explicit?: TryOnEligibleItem): TryOnEligibleItem | null =>
      explicit
      ?? (activeItemIndex !== null ? eligibleItems[activeItemIndex] : null)
      ?? (inspectedItemName
        ? eligibleItems.find((el) => el.product.name === inspectedItemName)
        : null)
      ?? eligibleItems[0]
      ?? null,
    [activeItemIndex, eligibleItems, inspectedItemName]
  );

  const chatTargetItem = resolveChatTarget();

  const sendChatMessage = async (message: string, item?: TryOnEligibleItem) => {
    const targetItem = resolveChatTarget(item);
    if (!targetItem) {
      toast.warning("ابتدا یک محصول قابل پرو به سبد خرید اضافه کنید");
      return;
    }

    setChatLoading(true);
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);

    const liveState = useTryOnStore.getState();
    let streamed = "";

    try {
      await streamTryOnChat({
        message,
        tryon_product_id: targetItem.product.id,
        tryon_color: getCanonicalColor(targetItem.colorVariant) || targetItem.colorVariant.colorName,
        tryon_id: liveState.currentTryonId || "",
        chat_id: liveState.chatId || "",
      }, {
        onToken: (text) => {
          streamed += text;
          setChatMessages((prev) =>
            replaceStreamingMessage(prev, { role: "agent_streaming", content: streamed })
          );
        },
        onDone: (turn) => {
          setChatMessages((prev) => replaceStreamingMessage(prev, agentMessageForTurn(turn, streamed)));
        },
      });
    } catch {
      setChatMessages((prev) =>
        replaceStreamingMessage(prev, { role: "agent", content: AGENT_ERROR_REPLY })
      );
      persistMessage({
        id: makeDbMessageId(),
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      });
      persistMessage({
        id: makeDbMessageId(),
        role: "agent",
        content: AGENT_ERROR_REPLY,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSubmit = () => {
    const message = chatInput.trim();
    if (!message) return;
    setChatInput("");
    sendChatMessage(message);
  };

  const handleSelectOpener = (text: string) => {
    setShowChatOpeners(false);
    sendChatMessage(text, chatTargetItem ?? undefined);
  };

  const handleStartNewRoom = useCallback(() => {
    startNewRoom();
    setChatMessages([]);
    setShowChatOpeners(false);
    chatInitializedRef.current = false;
    chatRestoredRef.current = false;
    hydratedForChatIdRef.current = null;
    restoredFromDbRef.current = false;
    onResetRoom?.();
  }, [startNewRoom, onResetRoom]);

  const markChatInitialized = useCallback(() => {
    if (chatInitializedRef.current) return false;
    chatInitializedRef.current = true;
    setShowChatOpeners(true);
    return true;
  }, []);

  return {
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    showChatOpeners,
    setShowChatOpeners,
    chatTargetItem,
    isLoadingSession,
    sendChatMessage,
    handleChatSubmit,
    handleSelectOpener,
    handleStartNewRoom,
    markChatInitialized,
  };
}
