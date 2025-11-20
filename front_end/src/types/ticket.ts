export type TicketStatus = "open" | "pending" | "answered" | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface TicketMessage {
  id?: string;
  sender: "user" | "support";
  body: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  order_id?: string | null;
  messages: TicketMessage[];
  created_at: string;
  updated_at: string;
}

export interface TicketPaginationInfo {
  currentPage: number;
  totalPages: number;
  totalTickets: number;
  pageSize: number;
}

export interface TicketListResponse {
  tickets: Ticket[];
  pagination: TicketPaginationInfo;
}
