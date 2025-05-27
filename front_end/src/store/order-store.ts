import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Order, OrderItem, ShippingAddress } from "@/types/order"; // Assuming order.ts is created
import { useAuthStore } from "./auth-store";
import { toast } from "react-toastify"; // Import toast

// Helper to transform backend order data to frontend structure if needed
// For now, assumes backend data largely matches frontend Order type
const transformBackendOrder = (backendOrderData: any): Order => {
  // Transform items to handle nested product structure
  const transformedItems = backendOrderData.items?.map((item: any) => ({
    product: {
      id: item.product?.id || item.product_id, // Handle both nested and flat structures
      name: item.product?.name || 'نامشخص',
      image: item.product?.image || '',
    },
    variant: item.variant || { size: 'N/A', color: 'N/A' },
    quantity: item.quantity || 0,
    price_at_purchase: item.price_at_purchase || 0,
  })) || [];

  // Transform shipping address to handle extended structure
  const transformedAddress = backendOrderData.shipping_address || {};

  return {
    id: backendOrderData._id || backendOrderData.id,
    user_id: backendOrderData.user_id,
    order_number: backendOrderData.order_number,
    items: transformedItems,
    total_amount: backendOrderData.total_amount,
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
    tracking_code: backendOrderData.tracking_code,
    is_active: backendOrderData.is_active !== undefined ? backendOrderData.is_active : true,
    created_at: backendOrderData.created_at || new Date().toISOString(),
    updated_at: backendOrderData.updated_at || new Date().toISOString(),
    jalali_created_at: backendOrderData.jalali_created_at || '',
    jalali_updated_at: backendOrderData.jalali_updated_at || '',
    product_count: backendOrderData.product_count || 0,
  } as Order;
};

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
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
  createOrder: (orderData: any) => Promise<Order | null>;
  // updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>; // Example for admin
  setCurrentOrder: (order: Order | null) => void;
  clearOrders: () => void;
  fetchAdminOrders: (page?: number, limit?: number, filters?: Record<string, any>) => Promise<void>;
  fetchRecentOrders: (limit?: number) => Promise<Order[]>;
  updateOrderStatusAdmin: (orderId: string, status: Order['status']) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
}

const initialState: OrderState = {
  orders: [],
  currentOrder: null,
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

          const data = await response.json(); // Expect { orders: [], pagination: {...} } or similar
          const transformedOrders = data.orders?.map(transformBackendOrder) || [];
          
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
        set({ orders: [], currentOrder: null, pagination: null, isLoading: false, error: null });
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

      updateOrderStatusAdmin: async (orderId, status) => {
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
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
            body: JSON.stringify({ status }),
          });
          if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: "Failed to update order status" }));
            throw new Error(errData.message || "Failed to update order status");
          }
          const updated = await response.json();
          const transformedOrder = transformBackendOrder(updated);
          set(state => ({
            orders: state.orders.map(o => (o.id === transformedOrder.id ? transformedOrder : o)),
            isLoading: false,
          }));
          toast.success("Order status updated");
        } catch (error) {
          console.error("Error updating order status:", error);
          set({ error: error instanceof Error ? error.message : "An unknown error occurred", isLoading: false });
          toast.error(error instanceof Error ? error.message : "An unknown error occurred");
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

// Subscribe to auth changes to clear orders on logout
useAuthStore.subscribe((state, prevState) => {
  if (!state.isAuthenticated && prevState.isAuthenticated) {
    console.log("User logged out, clearing order store.");
    useOrderStore.getState().clearOrders();
  }
}); 