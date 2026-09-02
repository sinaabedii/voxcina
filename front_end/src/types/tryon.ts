import { CartItem } from "./cart";
import { ColorVariant, Product } from "./product";

/** A cart line that can be tried on: its color variant carries a try-on image. */
export interface TryOnEligibleItem {
  cartItem: CartItem;
  colorVariant: ColorVariant;
  product: Product;
}

/**
 * A product the agent put on screen. The full product document is deliberately
 * absent on the wire — buildRecommendedProduct rebuilds enough of one to add it
 * to the cart or try it on.
 */
export interface RecommendedProduct {
  product_id: string;
  product_name: string;
  price: number;
  image: string;
  color?: string;
  color_name?: string;
  size?: string;
  selected_color?: string;
  sizes?: string[];
  product?: Product;
}

/** One catalog search hit: a single color variant of a product. */
export interface CatalogVariantHit {
  product_id: string;
  variant_id: string;
  product_name: string;
  price: number;
  color?: string;
  color_name?: string;
  image?: string;
  in_stock: boolean;
  sizes?: string[];
}

/**
 * The finished turn the fitting-room chat stream reports in its `done` event.
 * Styling and recommendations only — discount negotiation lives on the
 * checkout page (see types/checkout-chat.ts).
 */
export interface TryOnChatTurn {
  reply?: string;
  recommended_product?: RecommendedProduct;
  catalog_hits?: CatalogVariantHit[];
}

export interface TryonMessageData {
  roomNumber?: number;
  beforeImage?: string;
  afterImage?: string;
  productName?: string;
  processingId?: number;
}

export type ChatMessageRole = "user" | "agent" | "agent_streaming" | "tryon" | "tryon_processing";

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
  tryonData?: TryonMessageData;
  // Cards the agent put on screen during this turn. They belong to the
  // message so the transcript keeps them where they were said.
  recommendedProduct?: RecommendedProduct;
  catalogHits?: CatalogVariantHit[];
}
