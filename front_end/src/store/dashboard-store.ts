import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateId } from "@/lib/utils";

export interface Address {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  date: string;
  status: "pending" | "processing" | "shipping" | "delivered" | "canceled";
  statusText: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  address: Address;
  trackingCode?: string;
}

export interface FavoriteItem {
  productId: string;
  addedAt: string;
}

interface DashboardState {
  addresses: Address[];
  orders: Order[];
  favorites: FavoriteItem[];

  addAddress: (
    address: Omit<Address, "id" | "isDefault"> & { isDefault?: boolean }
  ) => void;
  updateAddress: (id: string, data: Partial<Omit<Address, "id">>) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;

  // علاقه‌مندی‌ها
  addToFavorites: (productId: string) => void;
  removeFromFavorites: (productId: string) => boolean;
  isFavorite: (productId: string) => boolean;

  // سفارش‌ها
  createOrder: (items: any[], address: Address) => string;
  cancelOrder: (orderId: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      addresses: [],
      orders: [],
      favorites: [],

      addAddress: (addressData) => {
        const { addresses } = get();
        const isFirst = addresses.length === 0;

        const newAddress: Address = {
          id: generateId(),
          isDefault: isFirst || !!addressData.isDefault,
          ...addressData,
        };

        let newAddresses = [...addresses];
        if (newAddress.isDefault) {
          newAddresses = newAddresses.map((addr) => ({
            ...addr,
            isDefault: false,
          }));
        }

        set({ addresses: [...newAddresses, newAddress] });
      },

      updateAddress: (id, data) => {
        const { addresses } = get();
        let newAddresses = [...addresses];

        const index = newAddresses.findIndex((addr) => addr.id === id);
        if (index !== -1) {
          if (data.isDefault) {
            newAddresses = newAddresses.map((addr) => ({
              ...addr,
              isDefault: false,
            }));
          }

          newAddresses[index] = {
            ...newAddresses[index],
            ...data,
          };

          set({ addresses: newAddresses });
        }
      },

      removeAddress: (id) => {
        const { addresses } = get();
        const newAddresses = addresses.filter((addr) => addr.id !== id);

        const defaultAddress = newAddresses.find((addr) => addr.isDefault);
        if (!defaultAddress && newAddresses.length > 0) {
          newAddresses[0].isDefault = true;
        }

        set({ addresses: newAddresses });
      },

      setDefaultAddress: (id) => {
        const { addresses } = get();
        const newAddresses = addresses.map((addr) => ({
          ...addr,
          isDefault: addr.id === id,
        }));

        set({ addresses: newAddresses });
      },

      addToFavorites: (productId) => {
        const { favorites } = get();

        if (!favorites.some((fav) => fav.productId === productId)) {
          set({
            favorites: [
              ...favorites,
              {
                productId,
                addedAt: new Date().toISOString(),
              },
            ],
          });
        }
      },

      removeFromFavorites: (productId) => {
        const { favorites } = get();
        const initialLength = favorites.length;
        const newFavorites = favorites.filter(
          (fav) => fav.productId !== productId
        );

        set({ favorites: newFavorites });
        return initialLength !== newFavorites.length;
      },

      isFavorite: (productId) => {
        const { favorites } = get();
        return favorites.some((fav) => fav.productId === productId);
      },

      createOrder: (items, address) => {
        const { orders } = get();
        const orderNumber = String(10001 + orders.length).padStart(5, "0");

        const total = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        const newOrder: Order = {
          id: `DGS-${orderNumber}`,
          date: new Date().toISOString(),
          status: "pending",
          statusText: "در انتظار پرداخت",
          items,
          total,
          address,
        };

        set({ orders: [...orders, newOrder] });
        return newOrder.id;
      },

      cancelOrder: (orderId) => {
        const { orders } = get();
        const newOrders = orders.map((order) => {
          if (order.id === orderId) {
            return {
              ...order,
              status: "canceled",
              statusText: "لغو شده",
            } as Order;
          }
          return order;
        });

        set({ orders: newOrders });
      },
    }),
    {
      name: "digi-style-dashboard",
    }
  )
);
