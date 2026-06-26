export type TryonStatus = "processing" | "done" | "error";
export type GarmentType = "upper_body" | "lower_body" | "dresses";
export type TryonChatRole = "user" | "agent" | "tool" | "tryon" | "system";
export type TryonChatStatus = "active" | "archived" | "deleted";

export interface VirtualTryon {
  id?: string;
  tryon_id: string;
  user_id?: string;
  task_id?: string;
  status: TryonStatus;

  person_image_url: string;
  person_image_hash?: string;

  garment_image_url: string;
  garment_product_id?: string;
  garment_product_name?: string;
  garment_color?: string;
  garment_size?: string;
  garment_type: GarmentType;

  result_image_url?: string;

  prompt_text?: string;
  model_used?: string;

  error?: string;
  duration_ms?: number;

  created_at: string;
  completed_at?: string;
}

export interface TryonChatTryonData {
  room_number: number;
  before_image: string;
  after_image: string;
  product_id?: string;
  product_name: string;
  color?: string;
  size?: string;
  garment_type: string;
  tryon_id: string;
}

export interface TryonChatToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface TryonChatMessage {
  id: string;
  role: TryonChatRole;
  content: string;
  timestamp: string;
  tryon_data?: TryonChatTryonData;
  tool_call?: TryonChatToolCall;
  model_used?: string;
  response_time_ms?: number;
}

export interface TryonChatMetadata {
  total_messages: number;
  user_messages: number;
  agent_messages: number;
  tool_messages: number;
  tryon_messages: number;
  coupons_offered?: string[];
  products_recommended?: string[];
  first_message_at?: string;
  last_message_at?: string;
  duration_seconds: number;
  device_type?: string;
  browser?: string;
  os?: string;
}

export interface TryonChat {
  id?: string;
  chat_id: string;
  user_id?: string;
  tryon_ids: string[];
  title: string;
  messages: TryonChatMessage[];
  metadata: TryonChatMetadata;
  status: TryonChatStatus;
  created_at: string;
  updated_at: string;
}

export interface TryonChatSession {
  id: string;
  chat_id: string;
  user_id: string;
  title?: string;
  tryon_count: number;
  message_count: number;
  last_message?: string;
  last_message_at?: string;
  status: TryonChatStatus;
  created_at: string;
  updated_at: string;
}

export interface TryonSessionResponse {
  success: boolean;
  chat: TryonChat;
  tryons: VirtualTryon[];
}

export interface TryonListResponse {
  success: boolean;
  tryons?: VirtualTryon[];
  sessions?: TryonChatSession[];
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
  chat?: TryonChat;
}

const AUTH_STORAGE_KEY = "authToken";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: { ...authHeaders() },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function listTryonSessions(page = 1, limit = 20): Promise<TryonListResponse> {
  return getJson<TryonListResponse>(`/api/tryon/sessions?page=${page}&limit=${limit}`);
}

export async function getTryonSession(chatId: string): Promise<TryonSessionResponse> {
  return getJson<TryonSessionResponse>(`/api/tryon/sessions/${encodeURIComponent(chatId)}`);
}

export async function listTryonHistory(page = 1, limit = 20): Promise<TryonListResponse> {
  return getJson<TryonListResponse>(`/api/tryon/history?page=${page}&limit=${limit}`);
}

export async function getTryonById(tryonId: string): Promise<TryonListResponse> {
  return getJson<TryonListResponse>(`/api/tryon/${encodeURIComponent(tryonId)}`);
}

export async function deleteTryonSession(chatId: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`/api/tryon/sessions/${encodeURIComponent(chatId)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`DELETE session -> ${res.status}`);
  return (await res.json()) as { success: boolean; message?: string };
}

export interface AppendMessagesBody {
  chat_id: string;
  messages: TryonChatMessage[];
}

export interface AppendMessagesResponse {
  success: boolean;
  chat_id: string;
  count: number;
}

export async function appendTryonMessages(body: AppendMessagesBody): Promise<AppendMessagesResponse> {
  const res = await fetch("/api/tryon/sessions/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST messages -> ${res.status}`);
  }
  return (await res.json()) as AppendMessagesResponse;
}

export interface LinkTryonBody {
  chat_id: string;
  tryon_id: string;
}

export async function linkTryonToChat(body: LinkTryonBody): Promise<{ success: boolean }> {
  const res = await fetch("/api/tryon/link", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST link -> ${res.status}`);
  return (await res.json()) as { success: boolean };
}

export function makeMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
