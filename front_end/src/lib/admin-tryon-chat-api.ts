import { sessionManager } from "@/lib/session-manager";
import type { TryonChat, VirtualTryon } from "@/lib/tryon-api";

export interface AdminAIUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  is_active: boolean;
}

export interface AdminAIChatSummary {
  id: string;
  chat_id: string;
  user_id: string;
  user?: AdminAIUser;
  title: string;
  message_count: number;
  user_messages: number;
  agent_messages: number;
  tryon_count: number;
  tryon_messages: number;
  last_message?: string;
  last_message_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminAIChatListResponse {
  success: boolean;
  chats: AdminAIChatSummary[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdminAIChatDetailResponse {
  success: boolean;
  chat: TryonChat;
  user?: AdminAIUser;
  tryons: VirtualTryon[];
}

async function getJson<T>(url: string): Promise<T> {
  const response = await sessionManager.fetchWithAuth(url, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function listAdminAIChats(
  page = 1,
  limit = 20,
  search = "",
  status = "",
): Promise<AdminAIChatListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  return getJson<AdminAIChatListResponse>(`/api/admin/ai/tryon-chats?${params.toString()}`);
}

export async function getAdminAIChat(chatId: string): Promise<AdminAIChatDetailResponse> {
  return getJson<AdminAIChatDetailResponse>(
    `/api/admin/ai/tryon-chats/${encodeURIComponent(chatId)}`,
  );
}
