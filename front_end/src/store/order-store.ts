import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Order, OrderItem, ShippingAddress } from "@/types/order"; // Assuming order.ts is created
import { useAuthStore } from "./auth-store";
import { toast } from "react-toastify"; // Import toast

// Helper to transform backend order data to frontend structure if needed
// For now, assumes backend data largely matches frontend Order type
const transformBackendOrder = (backendOrderData: any): Order => {
  // Basic transformation, can be expanded based on actual backend response nuances
  return {
    id: backendOrderData._id || backendOrderData.id,
    user_id: backendOrderData.user_id,
    order_number: backendOrderData.order_number,
    items: backendOrderData.items?.map((item: any) => ({
      ...item,
      product_id: item.product_id,
      price_at_purchase: item.price_at_purchase,
      // Ensure variant is correctly mapped
      variant: item.variant || { size: 'N/A', color: 'N/A' }, 
    })) || [],
    total_amount: backendOrderData.total_amount,
    shipping_address: backendOrderData.shipping_address || { street: '', city: '', state: '', postal_code: '', country: '' },
    status: backendOrderData.status || 'pending',
    status_text: backendOrderData.status_text || 'نامشخص',
    payment_status: backendOrderData.payment_status || 'pending',
    tracking_code: backendOrderData.tracking_code,
    is_active: backendOrderData.is_active !== undefined ? backendOrderData.is_active : true,
    created_at: backendOrderData.created_at || new Date().toISOString(),
    updated_at: backendOrderData.updated_at || new Date().toISOString(),
    jalali_created_at: backendOrderData.jalali_created_at || '',
    jalali_updated_at: backendOrderData.jalali_updated_at || '',
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
  createOrder: (orderData: any) // Replace 'any' with a specific OrderSubmission type from @/types/order
    => Promise<Order | null>; 
  // updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>; // Example for admin
  setCurrentOrder: (order: Order | null) => void;
  clearOrders: () => void;
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