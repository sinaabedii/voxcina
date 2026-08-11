import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Order, OrderItem, ShippingAddress, OrderStats, AdminOrderFilters, OrderTimelineEntry, OrderNote } from "@/types/order";
import { useAuthStore } from "./auth-store";
import { toast } from "react-toastify";

// Helper to transform timeline entries with Jalali dates
const transformTimelineEntry = (entry: any): OrderTimelineEntry => ({
  status: entry.status || '',
  timestamp: entry.timestamp || '',
  jalali_timestamp: entry.jalali_timestamp || '',
  note: entry.note,
  admin_id: entry.admin_id,
  admin_name: entry.admin_name,
});

// Helper to transform order notes with Jalali dates
const transformOrderNote = (note: any): OrderNote => ({
  id: note._id || note.id || '',
  content: note.content || '',
  admin_id: note.admin_id || '',
  admin_name: note.admin_name || '',
  created_at: note.created_at || '',
  jalali_created_at: note.jalali_created_at || '',
});

// Helper to transform backend order data to frontend structure if needed
// For now, assumes backend data largely matches frontend Order type
const transformBackendOrder = (backendOrderData: any): Order => {
  // Transform items to handle nested product structure
  const transformedItems = backendOrderData.items?.map((item: any) => ({
    product: {
      id: item.product?.id || item.product_id, // Handle both nested and flat structures
      name: item.product?.name || item.product_name || 'نامشخص',
      image: item.product?.image || item.product_image || '',
    },
    product_id: item.product_id,
    product_name: item.product_name,
    product_image: item.product_image,
    variant: item.variant || { size: 'N/A', color: 'N/A' },
    quantity: item.quantity || 0,
    price_at_purchase: item.price_at_purchase || 0,
  })) || [];

  // Transform shipping address to handle extended structure
  const transformedAddress = backendOrderData.shipping_address || {};

  // Transform timeline entries with Jalali dates
  const transformedTimeline = backendOrderData.timeline?.map(transformTimelineEntry) || [];

  // Transform notes with Jalali dates
  const transformedNotes = backendOrderData.notes?.map(transformOrderNote) || [];

  return {
    id: backendOrderData._id || backendOrderData.id,
    user_id: backendOrderData.user_id,
    order_number: backendOrderData.order_number,
    items: transformedItems,
    total_amount: backendOrderData.total_amount,
    shipping_cost: backendOrderData.shipping_cost,
    tax_amount: backendOrderData.tax_amount,
    discount_amount: backendOrderData.discount_amount,
    discount_code: backendOrderData.discount_code,
    shipping_address: {
      // Persian-specific fields
      title: transformedAddress.title,
      first_name: transformedAddress.first_name,
      last_name: transformedAddress.last_name,
      phone_number: transformedAddress.phone_number,
      province: transformedAddress.province,
      address: transformedAddress.address,
      postal_code: transformedAddress.postal_code || '',
      latitude: transformedAddress.latitude,
      longitude: transformedAddress.longitude,
      // Original backend fields
      street: transformedAddress.street,
      city: transformedAddress.city || '',
      state: transformedAddress.state,
      country: transformedAddress.country,
      is_default: transformedAddress.is_default,
    },
    status: backendOrderData.status || 'pending',
    status_text: backendOrderData.status_text || 'نامشخص',
    payment_status: backendOrderData.payment_status || 'pending',
    payment_method: backendOrderData.payment_method,
    zibal_track_id: backendOrderData.zibal_track_id,
    zibal_ref_number: backendOrderData.zibal_ref_number,
    gateway_name: backendOrderData.gateway_name,
    gateway_transaction_id: backendOrderData.gateway_transaction_id,
    tracking_code: backendOrderData.tracking_code,
    timeline: transformedTimeline,
    notes: transformedNotes,
    is_active: backendOrderData.is_active !== undefined ? backendOrderData.is_active : true,
    created_at: backendOrderData.created_at || new Date().toISOString(),
    updated_at: backendOrderData.updated_at || new Date().toISOString(),
    paid_at: backendOrderData.paid_at,
    jalali_created_at: backendOrderData.jalali_created_at || '',
    jalali_updated_at: backendOrderData.jalali_updated_at || '',
    jalali_paid_at: backendOrderData.jalali_paid_at,
    product_count: backendOrderData.product_count || 0,
  } as Order;
};

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  orderStats: OrderStats | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
    pageSize: number;
  } | null;
}

interface OrderActions {
  fetchOrders: (page?: number, limit?: number, filters?: Record<string, any>) => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<Order | null>;
  fetchAdminOrderById: (orderId: string) => Promise<Order | null>;
  createOrder: (orderData: any) => Promise<Order | null>;
  addOrderNote: (orderId: string, content: string) => Promise<Order | null>;
  fetchOrderStats: (filters?: AdminOrderFilters) => Promise<OrderStats | null>;
  updateOrderStatusAdmin: (orderId: string, status: Order['status'], note?: string) => Promise<void>;
  setCurrentOrder: (order: Order | null) => void;
  clearOrders: () => void;
  fetchAdminOrders: (page?: number, limit?: number, filters?: Record<string, any>) => Promise<void>;
  fetchRecentOrders: (limit?: number) => Promise<Order[]>;
  deleteOrder: (orderId: string) => Promise<void>;
  cancelSnappPay: (orderId: string) => Promise<Order | null>;
  updateSnappPay: (orderId: string, items: Array<{ product_id: string; size: string; color: string; color_name?: string; quantity: number }>) => Promise<Order | null>;
}

const initialState: OrderState = {
  orders: [],
  currentOrder: null,
  orderStats: null,
  isLoading: false,
  error: null,
  pagination: null,
};

export const useOrderStore = create<OrderState & OrderActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchOrders: async (page = 1, limit = 10, filters = {}) => {
        const { isAuthenticated, user } = useAuthStore.getState();
        if (!isAuthenticated || !user) {
          set({ error: "User not authenticated", isLoading: false, orders: [], pagination: null });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...filters,
          });
          const response = await fetch(`/api/orders?${queryParams.toString()}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to fetch orders" }));
            throw new Error(errorData.message || "Failed to fetch orders");
          }

          const data = await response.json();
          // Backend returns orders_data for user orders, orders for admin
          const ordersArray = data.orders_data || data.orders || [];
          const transformedOrders = ordersArray.map(transformBackendOrder);
          
          set({
            orders: transformedOrders,
            pagination: data.pagination || { currentPage: page, totalPages: 1, totalOrders: transformedOrders.length, pageSize: limit },
            isLoading: false,
            currentOrder: null, // Reset current order when fetching list
          });
        } catch (error) {
          console.error("Error fetching orders:", error);
          set({ 
            error: error instanceof Error ? error.message : "An unknown error occurred", 
            isLoading: false,
            orders: [],
            pagination: null,
           });
        }
      },

      fetchOrderById: async (orderId: string) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          set({ error: "User not authenticated", isLoading: false, currentOrder: null });
          return null;
        }
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
          });

          if (!response.ok) {
            if (response.status === 404) {
              set({ currentOrder: null, isLoading: false, error: "Order not found" });
              return null;
            }
            const errorData = await response.json().catch(() => ({ message: "Failed to fetch order details" }));
            throw new Error(errorData.message || "Failed to fetch order details");
          }
          const backendOrder = await response.json();
          const transformedOrder = transformBackendOrder(backendOrder);
          set({ currentOrder: transformedOrder, isLoading: false });
          return transformedOrder;
        } catch (error) {
          console.error(`Error fetching order ${orderId}:`, error);
          set({ 
            error: error instanceof Error ? error.message : "An unknown error occurred", 
            isLoading: false, 
            currentOrder: null 
          });
          return null;
        }
      },

      fetchAdminOrderById: async (orderId: string) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          set({ error: "User not authenticated", isLoading: false, currentOrder: null });
          return null;
        }
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/admin/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
          });

          if (!response.ok) {
            if (response.status === 404) {
              set({ currentOrder: null, isLoading: false, error: "Order not found" });
              return null;
            }
            const errorData = await response.json().catch(() => ({ message: "Failed to fetch order details" }));
            throw new Error(errorData.message || "Failed to fetch order details");
          }
          const backendOrder = await response.json();
          const transformedOrder = transformBackendOrder(backendOrder);
          set({ currentOrder: transformedOrder, isLoading: false });
          return transformedOrder;
        } catch (error) {
          console.error(`Error fetching admin order ${orderId}:`, error);
          set({ 
            error: error instanceof Error ? error.message : "An unknown error occurred", 
            isLoading: false, 
            currentOrder: null 
          });
          return null;
        }
      },

      addOrderNote: async (orderId: string, content: string) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          const errMessage = "User not authenticated";
          set({ error: errMessage, isLoading: false });
          toast.error(errMessage);
          return null;
        }
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/admin/orders/${orderId}/notes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
            body: JSON.stringify({ content }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to add note" }));
            throw new Error(errorData.message || "Failed to add note");
          }
          const data = await response.json();
          const transformedOrder = transformBackendOrder(data.order);
          set({ currentOrder: transformedOrder, isLoading: false });
          toast.success("یادداشت با موفقیت اضافه شد");
          return transformedOrder;
        } catch (error) {
          console.error(`Error adding note to order ${orderId}:`, error);
          set({ 
            error: error instanceof Error ? error.message : "An unknown error occurred", 
            isLoading: false 
          });
          toast.error(error instanceof Error ? error.message : "خطا در افزودن یادداشت");
          return null;
        }
      },

      fetchOrderStats: async (filters?: AdminOrderFilters) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          set({ error: "User not authenticated", isLoading: false, orderStats: null });
          return null;
        }
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams();
          if (filters) {
            if (filters.status) queryParams.set('status', filters.status);
            if (filters.payment_status) queryParams.set('payment_status', filters.payment_status);
            if (filters.date_from) queryParams.set('date_from', filters.date_from);
            if (filters.date_to) queryParams.set('date_to', filters.date_to);
          }
          
          const url = `/api/admin/orders/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to fetch order stats" }));
            throw new Error(errorData.message || "Failed to fetch order stats");
          }
          const stats: OrderStats = await response.json();
          set({ orderStats: stats, isLoading: false });
          return stats;
        } catch (error) {
          console.error("Error fetching order stats:", error);
          set({ 
            error: error instanceof Error ? error.message : "An unknown error occurred", 
            isLoading: false,
            orderStats: null
          });
          return null;
        }
      },
      
      createOrder: async (orderData: any) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          const errMessage = "برای ثبت سفارش ابتدا وارد شوید";
          set({ error: errMessage, isLoading: false });
          toast.error(errMessage);
          return null;
        }
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
            body: JSON.stringify(orderData),
          });

          const responseData = await response.json(); // Always parse JSON response

          if (!response.ok) {
            const errMessage = responseData.error || responseData.message || "خطا در ثبت سفارش";
            set({ error: errMessage, isLoading: false });
            toast.error(errMessage);
            throw new Error(errMessage);
          }
          const newOrder = transformBackendOrder(responseData);
          set((state) => ({
            orders: [newOrder, ...state.orders], 
            currentOrder: newOrder, 
            isLoading: false,
          }));
          toast.success("سفارش شما با موفقیت ثبت شد!"); 
          return newOrder;
        } catch (error) {
          // Error toast is already shown in the if (!response.ok) block or if user is not authenticated
          // This catch block will handle network errors or other unexpected issues
          if (!(error instanceof Error && (error.message.includes("خطا در ثبت سفارش") || error.message.includes("برای ثبت سفارش ابتدا وارد شوید")))) {
            const errMessage = "یک خطای پیش‌بینی نشده رخ داد. لطفا دوباره تلاش کنید.";
            set({ 
              error: errMessage, 
              isLoading: false 
            });
            toast.error(errMessage);
          }
          console.error("Error creating order:", error);
          return null;
        }
      },

      setCurrentOrder: (order: Order | null) => {
        set({ currentOrder: order, isLoading: false, error: null });
      },

      clearOrders: () => {
        set({ orders: [], currentOrder: null, orderStats: null, pagination: null, isLoading: false, error: null });
      },

      fetchAdminOrders: async (page = 1, limit = 10, filters = {}) => {
        const { isAuthenticated, user } = useAuthStore.getState();
        if (!isAuthenticated || !user) {
          set({ error: "User not authenticated", isLoading: false, orders: [], pagination: null });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString(), ...filters });
          const response = await fetch(`/api/admin/orders?${queryParams.toString()}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to fetch admin orders" }));
            throw new Error(errorData.message || "Failed to fetch admin orders");
          }
          const data = await response.json();
          const transformed = (data.orders || []).map(transformBackendOrder);
          set({
            orders: transformed,
            pagination: data.pagination || { currentPage: page, totalPages: 1, totalOrders: transformed.length, pageSize: limit },
            isLoading: false,
          });
        } catch (error) {
          console.error("Error fetching admin orders:", error);
          set({ error: error instanceof Error ? error.message : "An unknown error occurred", isLoading: false });
        }
      },

      fetchRecentOrders: async (limit = 5) => {
        const { isAuthenticated, adminToken } = useAuthStore.getState();
        if (!isAuthenticated || !adminToken) {
          set({ error: "Admin authentication required", isLoading: false });
          return [];
        }
        
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/admin/orders/recent?limit=${limit}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to fetch recent orders" }));
            throw new Error(errorData.message || "Failed to fetch recent orders");
          }
          
          const data = await response.json();
          if (process.env.NODE_ENV === 'development') {
            console.log("Raw backend response:", data); // Debug log
          }
          
          // Handle both null and empty array cases
          const ordersArray = data.orders || [];
          if (process.env.NODE_ENV === 'development') {
            console.log("Orders array:", ordersArray); // Debug log
          }
          
          if (!Array.isArray(ordersArray)) {
            console.warn("Backend returned non-array orders:", ordersArray);
            set({ isLoading: false });
            return [];
          }
          
          const recentOrders = ordersArray.map((orderData, index) => {
            try {
              const transformedOrder = transformBackendOrder(orderData);
              if (process.env.NODE_ENV === 'development') {
                console.log(`Transformed order ${index}:`, transformedOrder); // Debug log
              }
              return transformedOrder;
            } catch (transformError) {
              console.error(`Error transforming order ${index}:`, transformError, orderData);
              return null;
            }
          }).filter(order => order !== null); // Remove failed transformations
          
          if (process.env.NODE_ENV === 'development') {
            console.log("Final transformed orders:", recentOrders); // Debug log
          }
          
          // Don't update the store's orders state, just return the recent orders
          set({ isLoading: false });
          return recentOrders;
        } catch (error) {
          console.error("Error fetching recent orders:", error);
          set({ error: error instanceof Error ? error.message : "An unknown error occurred", isLoading: false });
          return [];
        }
      },

      updateOrderStatusAdmin: async (orderId, status, note) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          const err = "User not authenticated";
          set({ error: err, isLoading: false });
          toast.error(err);
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const body: { status: string; note?: string } = { status };
          if (note) {
            body.note = note;
          }
          const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: "Failed to update order status" }));
            throw new Error(errData.error || errData.message || "Failed to update order status");
          }
          const updated = await response.json();
          const transformedOrder = transformBackendOrder(updated);
          set(state => ({
            orders: state.orders.map(o => (o.id === transformedOrder.id ? transformedOrder : o)),
            currentOrder: state.currentOrder?.id === transformedOrder.id ? transformedOrder : state.currentOrder,
            isLoading: false,
          }));
          toast.success("وضعیت سفارش به‌روزرسانی شد");
        } catch (error) {
          console.error("Error updating order status:", error);
          set({ error: error instanceof Error ? error.message : "An unknown error occurred", isLoading: false });
          toast.error(error instanceof Error ? error.message : "An unknown error occurred");
        }
      },

      cancelSnappPay: async (orderId) => {
        try {
          const response = await fetch(`/api/admin/orders/${orderId}/payment/snappay/cancel`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
            body: JSON.stringify({ confirm: true }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || data.message || "لغو تراکنش اسنپ‌پی انجام نشد");
          const transformed = transformBackendOrder(data);
          set((state) => ({
            orders: state.orders.map((order) => order.id === transformed.id ? transformed : order),
            currentOrder: state.currentOrder?.id === transformed.id ? transformed : state.currentOrder,
          }));
          toast.success("تراکنش اسنپ‌پی لغو شد");
          return transformed;
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "لغو تراکنش اسنپ‌پی انجام نشد");
          return null;
        }
      },

      updateSnappPay: async (orderId, items) => {
        try {
          const response = await fetch(`/api/admin/orders/${orderId}/payment/snappay/update`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
            body: JSON.stringify({ confirm: true, items }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || data.message || "بروزرسانی تراکنش اسنپ‌پی انجام نشد");
          const transformed = transformBackendOrder(data);
          set((state) => ({
            orders: state.orders.map((order) => order.id === transformed.id ? transformed : order),
            currentOrder: state.currentOrder?.id === transformed.id ? transformed : state.currentOrder,
          }));
          toast.success("تراکنش اسنپ‌پی بروزرسانی شد");
          return transformed;
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "بروزرسانی تراکنش اسنپ‌پی انجام نشد");
          return null;
        }
      },

      deleteOrder: async (orderId) => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          const err = "User not authenticated";
          set({ error: err, isLoading: false });
          toast.error(err);
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
          });
          if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: "Failed to delete order" }));
            throw new Error(errData.message || "Failed to delete order");
          }
          set(state => ({
            orders: state.orders.filter(o => o.id !== orderId),
            isLoading: false,
          }));
          toast.success("Order deleted");
        } catch (error) {
          console.error("Error deleting order:", error);
          set({ error: error instanceof Error ? error.message : "An unknown error occurred", isLoading: false });
          toast.error(error instanceof Error ? error.message : "An unknown error occurred");
        }
      },
    }),
    {
      name: "order-storage", // Unique name for localStorage
      partialize: (state) => ({
        // Decide what to persist. Typically not all orders or loading/error states.
        // currentOrder: state.currentOrder, // Maybe persist currentOrder if user often returns to it
      }),
      onRehydrateStorage: () => (hydratedState, error) => {
        if (error) console.error("Error rehydrating order state:", error);
        // if (hydratedState) { // Potentially fetch user's orders on rehydration if needed
        //   const authState = useAuthStore.getState();
        //   if (authState.isAuthenticated) {
        //     // useOrderStore.getState().fetchOrders();
        //   }
        // }
      },
    }
  )
);

// Move auth subscription to be lazy-loaded to avoid circular dependency issues
let authUnsubscribe: (() => void) | null = null;

// Initialize auth subscription after stores are ready
const initializeAuthSubscription = () => {
  if (authUnsubscribe) return; // Already initialized
  
  try {
    // Subscribe to auth changes to clear orders on logout
    authUnsubscribe = useAuthStore.subscribe((state, prevState) => {
      if (!state.isAuthenticated && prevState.isAuthenticated) {
        console.log("User logged out, clearing order store.");
        useOrderStore.getState().clearOrders();
      }
    });
  } catch (error) {
    console.error('Error initializing auth subscription in order store:', error);
  }
};

// Initialize the subscription after a timeout to ensure both stores are ready
setTimeout(initializeAuthSubscription, 100);
