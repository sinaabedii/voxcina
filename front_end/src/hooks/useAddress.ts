import { useEffect } from "react";
import { useAddressStore } from "@/store/address-store";
import { useAuthStore } from "@/store/auth-store";
import { Address } from "@/types/user";

export const useAddress = () => {
  const {
    addresses,
    isLoading,
    error,
    fetchAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddressStore();

  const { isAuthenticated } = useAuthStore();

  // Fetch addresses when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses().catch((error) => {
        console.error("Failed to fetch addresses:", error);
      });
    }
  }, [isAuthenticated, fetchAddresses]);

  // Helper function to add new address
  const handleAddAddress = async (addressData: Omit<Address, "id">) => {
    try {
      const newAddress = await addAddress(addressData);
      return newAddress;
    } catch (error) {
      console.error("Failed to add address:", error);
      throw error;
    }
  };

  // Helper function to update address by ID
  const handleUpdateAddress = async (addressId: string, addressData: Partial<Address>) => {
    try {
      const addressIndex = addresses.findIndex((addr) => addr.id === addressId);
      if (addressIndex === -1) {
        throw new Error("آدرس موردنظر یافت نشد");
      }

      const updatedAddress = {
        ...addresses[addressIndex],
        ...addressData,
      };

      return await updateAddress(addressIndex, updatedAddress);
    } catch (error) {
      console.error("Failed to update address:", error);
      throw error;
    }
  };

  // Helper function to delete address by ID
  const handleDeleteAddress = async (addressId: string) => {
    try {
      const addressIndex = addresses.findIndex((addr) => addr.id === addressId);
      if (addressIndex === -1) {
        throw new Error("آدرس موردنظر یافت نشد");
      }

      await deleteAddress(addressIndex);
    } catch (error) {
      console.error("Failed to delete address:", error);
      throw error;
    }
  };

  // Helper function to set default address by ID
  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const addressIndex = addresses.findIndex((addr) => addr.id === addressId);
      if (addressIndex === -1) {
        throw new Error("آدرس موردنظر یافت نشد");
      }

      await setDefaultAddress(addressIndex);
    } catch (error) {
      console.error("Failed to set default address:", error);
      throw error;
    }
  };

  // Get default address
  const defaultAddress = addresses.find((addr) => addr.isDefault) || null;

  // Get address by ID
  const getAddressById = (addressId: string) => {
    return addresses.find((addr) => addr.id === addressId) || null;
  };

  return {
    addresses,
    defaultAddress,
    isLoading,
    error,
    addAddress: handleAddAddress,
    updateAddress: handleUpdateAddress,
    deleteAddress: handleDeleteAddress,
    setDefaultAddress: handleSetDefaultAddress,
    getAddressById,
    refreshAddresses: fetchAddresses,
  };
}; 