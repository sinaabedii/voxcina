import { TryonChatMessage, VirtualTryon } from "@/lib/tryon-api";
import {
  CatalogVariantHit,
  ChatMessage,
  TryOnChatTurn,
  RecommendedProduct,
} from "@/types/tryon";

/**
 * The fitting room transcript: what the agent says when a turn produced only
 * tool output, and how a stored room reads back as chat messages.
 *
 * NOTE: Discount negotiation (offer_coupon / COUPON_REPLY) has been moved to the
 * checkout negotiation agent (SellerModeCheckout). The fitting-room assistant
 * (SellerModeTryon) is styling/product only and never mints a coupon — see
 * services/coupon_negotiation_service.go buildTools/configForMode.
 */

const CATALOG_REPLY = "رفیق چند تا گزینه خوشگل برات پیدا کردم، همین پایین گذاشتم — ببین کدومش بیشتر به دلت میشینه!";
const DEFAULT_REPLY = "دمت گرم رفیق! بگو چی تو ذهنته تا یه پیشنهاد درجهیک برات جور کنم.";

export const AGENT_ERROR_REPLY = "وای رفیق ببخشید، الان یه لحظه سرم شلوغ شد و صدات به من نرسید! یه بار دیگه بگو چی می‌خواستی.";

export const welcomeReply = (firstName: string) =>
  `سلام ${firstName} جان، ووکسا هستم! لباستو پرو کن خریدت رو نهایی کنیم.`;

const recommendationReply = (productName?: string) =>
  productName
    ? `رفیق این ${productName} حسابی به تیپت میاد، حیفه از دستش بدی! بگو تا برات نگهش دارم.`
    : "رفیق یه پیشنهاد خوشگل برات دارم — همین پایین گذاشتم!";

/**
 * What the agent says for a turn that spoke only through its tools. The backend
 * guarantees a reply, so this covers the historic turns that were stored with an
 * empty message and keeps a bubble from rendering blank beside a valid card.
 * (Coupon branch removed — tryon never offers a discount.)
 */
const replyForCards = (
  recommendedName: string | undefined,
  hasCatalogHits: boolean,
  hasRecommendation: boolean
): string => {
  if (hasRecommendation) return recommendationReply(recommendedName);
  if (hasCatalogHits) return CATALOG_REPLY;
  return DEFAULT_REPLY;
};

/**
 * The agent message for a finished turn. The cards ride on the message the turn
 * produced instead of in page state: state held one of each, so the next turn
 * either cleared the recommendation or left the coupon stranded at the bottom
 * of the transcript.
 */
export function agentMessageForTurn(turn: TryOnChatTurn, streamed: string): ChatMessage {
  const hits = Array.isArray(turn.catalog_hits) ? turn.catalog_hits : [];
  const rec = turn.recommended_product;
  const content =
    turn.reply ||
    streamed ||
    replyForCards(rec?.product_name, hits.length > 0, !!rec);

  const message: ChatMessage = { role: "agent", content };
  if (rec) message.recommendedProduct = rec;
  if (hits.length) message.catalogHits = hits;
  return message;
}

/** The cards a stored turn produced, read back from its tool call. */
function restoreCards(message: ChatMessage, toolCall?: TryonChatMessage["tool_call"]) {
  const result = toolCall?.result;
  if (!result) return;
  // Only styling turns are read back: the tryon agent never had a coupon tool
  // post-decoupling, and old rooms' offer_coupon tool calls render no card —
  // checkout owns coupon UI now.
  if (result.recommended_product) {
    message.recommendedProduct = result.recommended_product as RecommendedProduct;
  }
  if (Array.isArray(result.catalog_hits) && result.catalog_hits.length) {
    message.catalogHits = result.catalog_hits as CatalogVariantHit[];
  }
}

/** The reply a stored tool-only turn should show, filled in from its tool call. */
function restoreContent(stored: TryonChatMessage): string {
  const content = stored.content || "";
  if (content.trim() || stored.role !== "agent") return content;

  // Historic fix: before the backend guarantee, tool-only turns were persisted
  // with content="" and tool_call.arguments.message="".
  const toolCall = stored.tool_call;
  const messageArg = toolCall?.arguments?.message;
  if (typeof messageArg === "string" && messageArg.trim()) return messageArg.trim();

  const recommended = toolCall?.result?.recommended_product as RecommendedProduct | undefined;
  // offer_coupon branch removed — tryon never uses it post-decoupling.
  return replyForCards(
    recommended?.product_name,
    toolCall?.name === "search_catalog",
    toolCall?.name === "recommend_product"
  );
}

/**
 * A stored room read back as chat messages, cards included, each under the turn
 * that produced it.
 */
export function restoreChatMessages(
  storedMessages: TryonChatMessage[],
  tryons: VirtualTryon[]
): ChatMessage[] {
  // A try-on card persisted before the upload finished points at a blob: URL
  // that died with the page — the try-on record has the backend copy.
  const personImages = new Map<string, string>();
  for (const tryon of tryons) {
    if (tryon.tryon_id && tryon.person_image_url) {
      personImages.set(tryon.tryon_id, tryon.person_image_url);
    }
  }

  return storedMessages.map((stored): ChatMessage => {
    if (stored.role === "tryon" && stored.tryon_data) {
      const { before_image, after_image, room_number, product_name, tryon_id } = stored.tryon_data;
      let beforeImage = before_image || "";
      if (beforeImage.startsWith("blob:") && tryon_id) {
        beforeImage = personImages.get(tryon_id) || beforeImage;
      }
      return {
        role: "tryon",
        content: stored.content,
        tryonData: {
          roomNumber: room_number,
          beforeImage,
          afterImage: after_image,
          productName: product_name,
        },
      };
    }

    if (stored.role === "user" || stored.role === "agent") {
      const message: ChatMessage = { role: stored.role, content: restoreContent(stored) };
      restoreCards(message, stored.tool_call);
      return message;
    }

    return { role: "agent", content: stored.content };
  });
}

/**
 * Puts a message at the end of the transcript, replacing the bubble the reply
 * was streaming into. Every turn ends by taking that bubble's place — with the
 * finished reply, or with an apology when the turn failed.
 */
export function replaceStreamingMessage(
  messages: ChatMessage[],
  message: ChatMessage
): ChatMessage[] {
  const lastIdx = messages.length - 1;
  if (messages[lastIdx]?.role !== "agent_streaming") return [...messages, message];
  const copy = [...messages];
  copy[lastIdx] = message;
  return copy;
}
