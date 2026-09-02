/**
 * What a coupon card needs to draw itself. Kept on the message that offered it;
 * whether it is still the live offer is decided against the session's coupon.
 */
export interface MessageCoupon {
  code: string;
  value: number;
  valid_until: string;
}

export type CheckoutChatRole = "user" | "agent";
export type CheckoutChatStatus = "active" | "deleted";

export interface CheckoutChatToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface CheckoutChatMessage {
  id: string;
  role: CheckoutChatRole;
  content: string;
  timestamp: string;
  tool_call?: CheckoutChatToolCall;
  model_used?: string;
  response_time_ms?: number;
}

export interface CheckoutChatMetadata {
  total_messages: number;
  user_messages: number;
  agent_messages: number;
  coupons_offered?: string[];
  first_message_at?: string;
  last_message_at?: string;
}

export interface CheckoutChat {
  id?: string;
  chat_id: string;
  user_id?: string;
  title: string;
  messages: CheckoutChatMessage[];
  metadata: CheckoutChatMetadata;
  status: CheckoutChatStatus;
  created_at: string;
  updated_at: string;
}

export interface CheckoutChatSessionResponse {
  success: boolean;
  chat: CheckoutChat;
}

/** The finished turn the checkout negotiation stream reports in its `done` event. */
export interface CheckoutNegotiationTurn {
  reply?: string;
  coupon?: MessageCoupon;
}

/** A single message in the checkout discount widget's local UI state. */
export interface CheckoutUIMessage {
  role: "user" | "agent" | "agent_streaming";
  content: string;
  coupon?: MessageCoupon;
}
