import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Ticket, TicketListResponse, TicketStatus, TicketPriority } from "@/types/ticket";
import { useAuthStore } from "./auth-store";
import { toast } from "react-toastify";

interface TicketState {
  tickets: Ticket[];
  currentTicket: Ticket | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalTickets: number;
    pageSize: number;
  } | null;
}

interface TicketActions {
  fetchUserTickets: (page?: number, limit?: number, filters?: Record<string, any>) => Promise<void>;
  fetchTicketById: (ticketId: string) => Promise<Ticket | null>;
  createTicket: (data: { subject: string; category?: string; priority?: TicketPriority; message: string; order_id?: string }) => Promise<Ticket | null>;
  addTicketMessage: (ticketId: string, body: string) => Promise<void>;
  setCurrentTicket: (ticket: Ticket | null) => void;
  clearTickets: () => void;
  // Admin actions
  fetchAdminTickets: (page?: number, limit?: number, filters?: Record<string, any>) => Promise<void>;
  adminUpdateTicketStatus: (ticketId: string, status: TicketStatus, priority?: TicketPriority) => Promise<void>;
}

const initialState: TicketState = {
  tickets: [],
  currentTicket: null,
  isLoading: false,
  error: null,
  pagination: null,
};

export const useTicketStore = create<TicketState & TicketActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchUserTickets: async (page = 1, limit = 10, filters = {}) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          set({ error: "برای مشاهده تیکت‌ها ابتدا وارد حساب شوید.", isLoading: false, tickets: [], pagination: null });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...filters,
          });
          const response = await fetch(`/api/tickets?${queryParams.toString()}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({ message: "خطا در دریافت تیکت‌ها" }));
            throw new Error(data.message || "خطا در دریافت تیکت‌ها");
          }
          const data: TicketListResponse = await response.json();
          set({
            tickets: data.tickets || [],
            pagination: data.pagination
              ? {
                  currentPage: data.pagination.currentPage,
                  totalPages: data.pagination.totalPages,
                  totalTickets: data.pagination.totalTickets,
                  pageSize: data.pagination.pageSize,
                }
              : null,
            isLoading: false,
          });
        } catch (error) {
          console.error("Error fetching tickets:", error);
          set({
            error: error instanceof Error ? error.message : "یک خطای ناشناخته رخ داد",
            isLoading: false,
            tickets: [],
            pagination: null,
          });
        }
      },

      fetchTicketById: async (ticketId: string) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          set({ error: "برای مشاهده تیکت ابتدا وارد حساب شوید.", isLoading: false, currentTicket: null });
          return null;
        }
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/tickets/${ticketId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          });
          if (!response.ok) {
            if (response.status === 404) {
              set({ error: "تیکت پیدا نشد.", isLoading: false, currentTicket: null });
              return null;
            }
            const data = await response.json().catch(() => ({ message: "خطا در دریافت تیکت" }));
            throw new Error(data.message || "خطا در دریافت تیکت");
          }
          const ticket: Ticket = await response.json();
          set({ currentTicket: ticket, isLoading: false });
          return ticket;
        } catch (error) {
          console.error("Error fetching ticket:", error);
          set({
            error: error instanceof Error ? error.message : "یک خطای ناشناخته رخ داد",
            isLoading: false,
            currentTicket: null,
          });
          return null;
        }
      },

      createTicket: async ({ subject, category, priority = "medium", message, order_id }) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          const err = "برای ثبت تیکت ابتدا وارد حساب شوید";
          set({ error: err, isLoading: false });
          toast.error(err);
          return null;
        }
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/tickets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
            body: JSON.stringify({ subject, category, priority, message, order_id }),
          });
          const data = await response.json();
          if (!response.ok) {
            const err = data.error || data.message || "خطا در ثبت تیکت";
            set({ error: err, isLoading: false });
            toast.error(err);
            return null;
          }
          const ticket: Ticket = data;
          set((state) => ({
            tickets: [ticket, ...state.tickets],
            currentTicket: ticket,
            isLoading: false,
          }));
          toast.success("تیکت شما با موفقیت ثبت شد.");
          return ticket;
        } catch (error) {
          console.error("Error creating ticket:", error);
          const errMsg = "یک خطای پیش‌بینی نشده رخ داد. لطفاً دوباره تلاش کنید.";
          set({ error: errMsg, isLoading: false });
          toast.error(errMsg);
          return null;
        }
      },

      addTicketMessage: async (ticketId: string, body: string) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          const err = "برای ارسال پیام در تیکت ابتدا وارد شوید";
          set({ error: err, isLoading: false });
          toast.error(err);
          return;
        }
        if (!body.trim()) return;

        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/tickets/${ticketId}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
            body: JSON.stringify({ body }),
          });
          const data = await response.json();
          if (!response.ok || !data.success) {
            const err = data.error || data.message || "خطا در ارسال پیام";
            throw new Error(err);
          }
          // Refresh current ticket
          await get().fetchTicketById(ticketId);
          set({ isLoading: false });
        } catch (error) {
          console.error("Error adding ticket message:", error);
          const errMsg = error instanceof Error ? error.message : "یک خطای ناشناخته رخ داد";
          set({ error: errMsg, isLoading: false });
          toast.error(errMsg);
        }
      },

      setCurrentTicket: (ticket: Ticket | null) => {
        set({ currentTicket: ticket, isLoading: false, error: null });
      },

      clearTickets: () => {
        set({ tickets: [], currentTicket: null, pagination: null, isLoading: false, error: null });
      },

      fetchAdminTickets: async (page = 1, limit = 20, filters = {}) => {
        const { isAuthenticated, adminToken } = useAuthStore.getState();
        if (!isAuthenticated || !adminToken) {
          set({ error: "دسترسی ادمین مورد نیاز است", isLoading: false });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString(), ...filters });
          const response = await fetch(`/api/admin/tickets?${queryParams.toString()}`, {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({ message: "خطا در دریافت تیکت‌ها" }));
            throw new Error(data.message || "خطا در دریافت تیکت‌ها");
          }
          const data: TicketListResponse = await response.json();
          set({
            tickets: data.tickets || [],
            pagination: data.pagination
              ? {
                  currentPage: data.pagination.currentPage,
                  totalPages: data.pagination.totalPages,
                  totalTickets: data.pagination.totalTickets,
                  pageSize: data.pagination.pageSize,
                }
              : null,
            isLoading: false,
          });
        } catch (error) {
          console.error("Error fetching admin tickets:", error);
          set({ error: error instanceof Error ? error.message : "یک خطای ناشناخته رخ داد", isLoading: false });
        }
      },

      adminUpdateTicketStatus: async (ticketId: string, status: TicketStatus, priority?: TicketPriority) => {
        const { isAuthenticated, adminToken } = useAuthStore.getState();
        if (!isAuthenticated || !adminToken) {
          const err = "دسترسی ادمین مورد نیاز است";
          set({ error: err, isLoading: false });
          toast.error(err);
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const body: any = { status };
          if (priority) body.priority = priority;

          const response = await fetch(`/api/admin/tickets/${ticketId}/status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({ message: "خطا در بروزرسانی تیکت" }));
            throw new Error(data.message || "خطا در بروزرسانی تیکت");
          }
          const updated: Ticket = await response.json();
          set((state) => ({
            tickets: state.tickets.map((t) => (t.id === updated.id ? updated : t)),
            currentTicket: state.currentTicket && state.currentTicket.id === updated.id ? updated : state.currentTicket,
            isLoading: false,
          }));
          toast.success("وضعیت تیکت بروزرسانی شد");
        } catch (error) {
          console.error("Error updating ticket status:", error);
          const errMsg = error instanceof Error ? error.message : "یک خطای ناشناخته رخ داد";
          set({ error: errMsg, isLoading: false });
          toast.error(errMsg);
        }
      },
    }),
    {
      name: "ticket-storage",
      partialize: (state) => ({}) ,
    }
  )
);
