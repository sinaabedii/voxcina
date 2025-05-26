import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Address, BackendAddress } from "@/types/user";

interface AddressState {
  addresses: Address[];
  isLoading: boolean;
  error: string | null;
}

interface AddressActions {
  fetchAddresses: () => Promise<void>;
  addAddress: (addressData: Omit<Address, "id">) => Promise<Address>;
  updateAddress: (addressIndex: number, addressData: Address) => Promise<Address>;
  deleteAddress: (addressIndex: number) => Promise<void>;
  setDefaultAddress: (addressIndex: number) => Promise<void>;
}

export interface AddressStore extends AddressState, AddressActions {}

// Helper functions to convert between frontend and backend address formats
const convertToBackendAddress = (frontendAddress: Address): BackendAddress => ({
  title: frontendAddress.title,
  first_name: frontendAddress.firstName,
  last_name: frontendAddress.lastName,
  phone_number: frontendAddress.phoneNumber,
  province: frontendAddress.province,
  address: frontendAddress.address,
  city: frontendAddress.city,
  postal_code: frontendAddress.postalCode,
  is_default: frontendAddress.isDefault,
});

const convertFromBackendAddress = (backendAddress: BackendAddress, index: number): Address => ({
  id: index.toString(), // Use index as ID since backend uses array indices
  title: backendAddress.title || "",
  firstName: backendAddress.first_name || "",
  lastName: backendAddress.last_name || "",
  phoneNumber: backendAddress.phone_number || "",
  province: backendAddress.province || "",
  city: backendAddress.city,
  address: backendAddress.address || "",
  postalCode: backendAddress.postal_code,
  isDefault: backendAddress.is_default,
});

export const useAddressStore = create<AddressStore>()(
  persist(
    (set, get) => ({
      addresses: [],
      isLoading: false,
      error: null,

      fetchAddresses: async () => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem("authToken");
          if (!token) {
            throw new Error("کاربر وارد نشده است");
          }

          const response = await fetch("/api/users/addresses", {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to fetch addresses");
          }

          const responseData = await response.json();
          
          // Handle null or undefined response data
          const backendAddresses: BackendAddress[] = Array.isArray(responseData) ? responseData : [];
          
          const frontendAddresses = backendAddresses.map((addr, index) => 
            convertFromBackendAddress(addr, index)
          );

          set({
            addresses: frontendAddresses,
            isLoading: false,
          });
        } catch (error) {
          console.error("Error in fetchAddresses:", error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "خطای ناشناخته در دریافت آدرس‌ها",
          });
          throw error;
        }
      },

      addAddress: async (addressData) => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem("authToken");
          if (!token) {
            throw new Error("کاربر وارد نشده است");
          }

          const backendAddress = convertToBackendAddress({
            ...addressData,
            id: "", // Temp ID, will be set by backend
          });

          const response = await fetch("/api/users/addresses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(backendAddress),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to add address");
          }

          const responseData = await response.json();
          
          // Handle null or undefined response data
          const updatedBackendAddresses: BackendAddress[] = Array.isArray(responseData) ? responseData : [];
          
          const frontendAddresses = updatedBackendAddresses.map((addr, index) => 
            convertFromBackendAddress(addr, index)
          );

          set({
            addresses: frontendAddresses,
            isLoading: false,
          });

          // Return the newly added address
          return frontendAddresses[frontendAddresses.length - 1];
        } catch (error) {
          console.error("Error in addAddress:", error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "خطای ناشناخته در افزودن آدرس",
          });
          throw error;
        }
      },

      updateAddress: async (addressIndex, addressData) => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem("authToken");
          if (!token) {
            throw new Error("کاربر وارد نشده است");
          }

          const backendAddress = convertToBackendAddress(addressData);

          const response = await fetch(`/api/users/addresses/${addressIndex}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(backendAddress),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to update address");
          }

          const responseData = await response.json();
          
          // Handle null or undefined response data
          const updatedBackendAddresses: BackendAddress[] = Array.isArray(responseData) ? responseData : [];
          
          const frontendAddresses = updatedBackendAddresses.map((addr, index) => 
            convertFromBackendAddress(addr, index)
          );

          set({
            addresses: frontendAddresses,
            isLoading: false,
          });

          return frontendAddresses[addressIndex];
        } catch (error) {
          console.error("Error in updateAddress:", error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "خطای ناشناخته در ویرایش آدرس",
          });
          throw error;
        }
      },

      deleteAddress: async (addressIndex) => {
        set({ isLoading: true, error: null });

        try {
          const token = localStorage.getItem("authToken");
          if (!token) {
            throw new Error("کاربر وارد نشده است");
          }

          const response = await fetch(`/api/users/addresses/${addressIndex}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to delete address");
          }

          const responseData = await response.json();
          
          // Handle null or undefined response data
          const updatedBackendAddresses: BackendAddress[] = Array.isArray(responseData) ? responseData : [];
          
          const frontendAddresses = updatedBackendAddresses.map((addr, index) => 
            convertFromBackendAddress(addr, index)
          );

          set({
            addresses: frontendAddresses,
            isLoading: false,
          });
        } catch (error) {
          console.error("Error in deleteAddress:", error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "خطای ناشناخته در حذف آدرس",
          });
          throw error;
        }
      },

      setDefaultAddress: async (addressIndex) => {
        const { addresses } = get();
        if (addressIndex >= addresses.length) {
          throw new Error("آدرس موردنظر یافت نشد");
        }

        const addressToUpdate = {
          ...addresses[addressIndex],
          isDefault: true,
        };

        await get().updateAddress(addressIndex, addressToUpdate);
      },
    }),
    {
      name: "address-storage",
      partialize: (state) => ({
        addresses: state.addresses,
      }),
    }
  )
); 