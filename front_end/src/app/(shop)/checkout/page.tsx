"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Truck, AlertCircle, MapPin, Plus, Home, Briefcase, Edit, Loader2, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/Modal";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-xl border border-secondary-200 dark:border-voxcina-blue/30 bg-voxcina-cream/30 dark:bg-voxcina-blue/10 flex items-center justify-center">
      <Loader2 className="h-5 w-5 text-voxcina-blue/50 dark:text-voxcina-cream/50 animate-spin" />
    </div>
  ),
});
import PaymentMethods from "@/components/checkout/PaymentMethods";
import ShippingMethodSelector from "@/components/checkout/ShippingMethodSelector";
import CartSummary from "@/components/cart/CartSummary";
import { useCart } from "@/hooks/useCart";
import { useAddress } from "@/hooks/useAddress";
import { useLocality } from "@/hooks/useLocality";
import { useDashboardStore } from "@/store/dashboard-store";
import { useAuthStore } from "@/store/auth-store";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Address } from "@/types/user";
import { ShippingMethod } from "@/services/shipping/types";
import { formatPrice, generateId } from "@/lib/utils";
import { activityTracker } from "@/lib/activity-tracker";
import { toast } from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, summary, clearCart } = useCart();
  const { createOrder } = useDashboardStore();
  const { user } = useAuthStore();
  
  /**
   * Protected Route Authentication Check
   * Implements Requirements 9.1, 9.2, 9.4:
   * - Redirects unauthenticated users to /sign-in
   * - Stores /checkout as return URL for post-login redirect
   * - Cart contents are preserved in localStorage during redirect
   * 
   * Cart Merge on Authentication (Requirement 9.3):
   * When the user successfully authenticates and is redirected back to checkout,
   * the cart store's auth subscription automatically detects the login and calls
   * syncCartWithBackend(), which merges any anonymous cart items with the user's
   * existing backend cart. This happens in cart-store.ts via the auth state subscription.
   */
  const { isLoading: authLoading, isAuthorized } = useProtectedRoute({
    requiredAuth: true,
    redirectUrl: '/sign-in',
  });
  
  const { 
    addresses, 
    isLoading: addressesLoading, 
    error: addressesError,
    addAddress,
    updateAddress,
    setDefaultAddress 
  } = useAddress();
  const { provinces, cities, fetchCities, loadingProvinces, loadingCities } = useLocality();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("online");
  const [selectedGateway, setSelectedGateway] = useState("zibal");
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    province: "",
    provinceCode: 0,
    city: "",
    cityCode: 0,
    address: "",
    postalCode: "",
    isDefault: false,
    addressType: "home",
    latitude: 0,
    longitude: 0,
  });

  /* ────────────────────────────────────────────
     Redirect to /cart on the CLIENT only
     Skip redirect if we're processing payment (cart cleared before redirect)
  ───────────────────────────────────────────── */
  useEffect(() => {
    if (cart.items.length === 0 && !isProcessing) {
      router.replace("/cart");
    }
  }, [cart.items.length, router, isProcessing]);

  /* Select default address when addresses load */
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddress = addresses.find((addr) => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress as Address);
      } else {
        setSelectedAddress(addresses[0] as Address);
      }
    }
  }, [addresses, selectedAddress]);

  /* Reset form when modal closes */
  useEffect(() => {
    if (!isModalOpen) {
      setEditingAddress(null);
      setFormData({
        title: "",
        firstName: "",
        lastName: "",
        phoneNumber: "",
        province: "",
        provinceCode: 0,
        city: "",
        cityCode: 0,
        address: "",
        postalCode: "",
        isDefault: false,
        addressType: "home",
        latitude: 0,
        longitude: 0,
      });
    }
  }, [isModalOpen]);

  /* Fetch cities when province changes */
  useEffect(() => {
    if (formData.province && provinces.length) {
      // Reset city when province changes
      if (formData.city) {
        setFormData(prev => ({ ...prev, city: "" }));
      }
      
      const selected = provinces.find((p) => p.province_name === formData.province);
      if (selected) {
        // Only fetch if we have a valid province code
        fetchCities(selected.province_code);
      }
    }
  }, [formData.province, provinces]); // Remove fetchCities from dependencies

  /* While the redirect effect hasn't run yet, render nothing.
     This avoids executing any of the heavy checkout UI on the server.
     Skip this check if we're processing payment (cart cleared before redirect) */
  if (cart.items.length === 0 && !isProcessing) return null;

  /**
   * Show loading state while authentication is being verified
   * Implements Requirement 3.5: Display loading state during auth verification
   */
  if (authLoading) {
    return (
      <div className="container py-8 md:py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute top-0 right-0 w-full h-full border-4 border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-full animate-pulse-soft"></div>
            <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-secondary-200 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <User className="absolute inset-0 m-auto w-6 h-6 text-voxcina-blue/40 dark:text-secondary-200/40" />
          </div>
          <p className="text-voxcina-blue/70 dark:text-secondary-200/70 font-medium text-lg">
            در حال بررسی وضعیت ورود...
          </p>
          <p className="text-voxcina-blue/50 dark:text-secondary-300/50 text-sm mt-2">
            لطفاً صبر کنید
          </p>
        </div>
      </div>
    );
  }

  /**
   * If not authorized after auth check completes, the useProtectedRoute hook
   * will handle the redirect to /sign-in with /checkout stored as return URL.
   * Cart contents remain in localStorage during this redirect (Requirement 9.2).
   */
  if (!isAuthorized) {
    return null;
  }

  /* ────────────────────────────────────────────
     Address form handlers
  ───────────────────────────────────────────── */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (type === "radio") {
      setFormData({ ...formData, addressType: value });
    } else if (name === "province") {
      // When province changes, also set the province code and reset city
      const selectedProvince = provinces.find((p) => p.province_name === value);
      setFormData({
        ...formData,
        province: value,
        provinceCode: selectedProvince?.province_code || 0,
        city: "",
        cityCode: 0,
      });
    } else if (name === "city") {
      // When city changes, also set the city code
      const selectedCity = cities.find((c) => c.city_name === value);
      setFormData({
        ...formData,
        city: value,
        cityCode: selectedCity?.city_code || 0,
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddNew = () => {
    setFormData({
      title: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      province: "",
      provinceCode: 0,
      city: "",
      cityCode: 0,
      address: "",
      postalCode: "",
      isDefault: addresses.length === 0, // Auto set as default if first address
      addressType: "home",
      latitude: 0,
      longitude: 0,
    });
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleEdit = (addressId: string) => {
    const address = addresses.find((addr) => addr.id === addressId);
    if (!address) {
      toast.error("آدرس موردنظر یافت نشد");
      return;
    }

    setFormData({
      title: address.title || "",
      firstName: address.firstName || "",
      lastName: address.lastName || "",
      phoneNumber: address.phoneNumber || "",
      province: address.province || "",
      provinceCode: address.provinceCode || 0,
      city: address.city || "",
      cityCode: address.cityCode || 0,
      address: address.address || "",
      postalCode: address.postalCode || "",
      isDefault: address.isDefault || false,
      addressType: address.title?.toLowerCase().includes("کار") || 
                   address.title?.toLowerCase().includes("شرکت") || 
                   address.title?.toLowerCase().includes("دفتر") ? "work" : "home",
      latitude: address.latitude || 0,
      longitude: address.longitude || 0,
    });
    setEditingAddress(addressId);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'phoneNumber', 'province', 'city', 'address', 'postalCode'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast.error("لطفاً تمام فیلدهای ضروری را پر کنید");
      return;
    }

    // Validate location selection
    if (formData.latitude === 0 || formData.longitude === 0) {
      toast.error("لطفاً موقعیت را از نقشه انتخاب کنید");
      return;
    }

    setIsSubmitting(true);

    const finalFormData = {
      ...formData,
      title: formData.title || (formData.addressType === "home" ? "خانه" : "محل کار"),
    };

    try {
      if (editingAddress) {
        const updatedAddress = await updateAddress(editingAddress, finalFormData);
        if (selectedAddress?.id === editingAddress) {
          setSelectedAddress(updatedAddress);
        }
        toast.success("آدرس با موفقیت ویرایش شد");
      } else {
        const newAddress = await addAddress(finalFormData);
        setSelectedAddress(newAddress);
        toast.success("آدرس جدید با موفقیت اضافه شد");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save address:", error);
      const errorMessage = editingAddress 
        ? "خطا در ویرایش آدرس. لطفاً دوباره تلاش کنید"
        : "خطا در افزودن آدرس. لطفاً دوباره تلاش کنید";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!addressId) {
      toast.error("شناسه آدرس نامعتبر است");
      return;
    }

    try {
      setOperationLoading(addressId);
      await setDefaultAddress(addressId);
      
      // Update selected address if we're setting a different address as default
      const newDefaultAddress = addresses.find(a => a.id === addressId);
      if (newDefaultAddress) {
        setSelectedAddress(newDefaultAddress);
      }
      
      toast.success("آدرس پیش‌فرض با موفقیت تغییر یافت");
    } catch (error) {
      console.error("Failed to set default address:", error);
      toast.error("خطا در تنظیم آدرس پیش‌فرض. لطفاً دوباره تلاش کنید");
    } finally {
      setOperationLoading(null);
    }
  };

  const getAddressTypeIcon = (title: string) => {
    if (
      title?.toLowerCase().includes("کار") ||
      title?.toLowerCase().includes("شرکت") ||
      title?.toLowerCase().includes("دفتر")
    ) {
      return <Briefcase className="w-4 h-4 ml-2" />;
    }
    return <Home className="w-4 h-4 ml-2" />;
  };

  /* ────────────────────────────────────────────
     Place-order handler
  ───────────────────────────────────────────── */
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error("لطفا یک آدرس انتخاب کنید");
      return;
    }

    // Get token from localStorage - user is already authenticated via useProtectedRoute
    const token = localStorage.getItem("authToken");
    if (!token) {
      // This should not happen since useProtectedRoute ensures authentication,
      // but handle gracefully just in case
      toast.error("لطفا وارد حساب کاربری خود شوید");
      return;
    }

    try {
      setIsProcessing(true);

      // Prepare order items for backend
      const orderItems = cart.items.map((item) => ({
        product_id: item.productId,
        variant: {
          color: item.color || "",
          colorName: item.colorName || "",
          size: item.size || "",
        },
        quantity: item.quantity,
        price_at_purchase: item.price,
      }));

      // Calculate total with shipping
      const shippingCost = selectedShippingMethod?.price || 0;
      const totalAmount = summary.total + shippingCost;

      // Prepare shipping address
      const shippingAddress = {
        title: selectedAddress.title || "",
        first_name: selectedAddress.firstName || "",
        last_name: selectedAddress.lastName || "",
        phone_number: selectedAddress.phoneNumber || "",
        province: selectedAddress.province || "",
        province_code: selectedAddress.provinceCode || 0,
        city: selectedAddress.city || "",
        city_code: selectedAddress.cityCode || 0,
        address: selectedAddress.address || "",
        postal_code: selectedAddress.postalCode || "",
        latitude: selectedAddress.latitude || 0,
        longitude: selectedAddress.longitude || 0,
        is_default: selectedAddress.isDefault || false,
      };

      // Step 1: Create order in backend
      const orderResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: orderItems,
          totalAmount: totalAmount,
          shippingAddress: shippingAddress,
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || "خطا در ثبت سفارش");
      }

      const orderData = await orderResponse.json();
      const orderId = orderData.id;

      activityTracker.trackOrderPlaced(orderId, totalAmount, {
        paymentMethod: selectedPaymentMethod,
        gateway: selectedPaymentMethod === "online" ? selectedGateway : undefined,
        shippingMethod: selectedShippingMethod?.id,
        itemCount: cart.items.length,
        source: "checkout_page",
      });

      // Step 2: Handle payment based on selected method
      if (selectedPaymentMethod === "online") {
        // Request payment from Zibal
        const paymentResponse = await fetch("/api/payment/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderId: orderId,
            gateway: selectedGateway,
            description: `سفارش ${orderData.order_number}`,
            mobile: selectedAddress.phoneNumber,
          }),
        });

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json();
          throw new Error(errorData.error || "خطا در اتصال به درگاه پرداخت");
        }

        const paymentData = await paymentResponse.json();

        if (paymentData.result === 100 && paymentData.payUrl) {
          // Don't clear cart here - it will be cleared on successful payment callback
          // Redirect to payment gateway
          window.location.href = paymentData.payUrl;
          return;
        } else {
          throw new Error("خطا در دریافت لینک پرداخت");
        }
      } else if (selectedPaymentMethod === "cod") {
        // Cash on delivery - just clear cart and show success
        clearCart();
        router.push(`/checkout/success?orderId=${orderId}&method=cod`);
      } else if (selectedPaymentMethod === "wallet") {
        // Wallet payment - TODO: implement wallet deduction
        toast.error("پرداخت با کیف پول در حال حاضر فعال نیست");
        setIsProcessing(false);
        return;
      }
    } catch (error: any) {
      console.error("خطا در ثبت سفارش:", error);
      setIsProcessing(false);
      toast.error(error.message || "خطا در ثبت سفارش. لطفا دوباره تلاش کنید.");
    }
  };

  /* ────────────────────────────────────────────
     Motion variants
  ───────────────────────────────────────────── */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
  };

  /* ────────────────────────────────────────────
     JSX
  ───────────────────────────────────────────── */
  return (
    <div className="container py-8 md:py-12">
      <motion.h1
        className="text-2xl md:text-3xl font-bold mb-8 text-voxcina-blue dark:text-voxcina-cream relative inline-block"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="relative z-10">تکمیل سفارش</span>
        <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
      </motion.h1>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ───────── Left column ───────── */}
        <motion.div className="lg:col-span-2 space-y-6" variants={itemVariants}>
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            {/* Address Section */}
            <Card className="border border-voxcina-cream/30 dark:border-voxcina-blue/30 bg-white/90 dark:bg-voxcina-blue/10 shadow-sm rounded-2xl backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
                  <MapPin className="w-5 h-5 ml-2" />
                  آدرس تحویل
                </CardTitle>
              </CardHeader>
              <CardContent>
                {addressesLoading ? (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="min-h-[200px] flex items-center justify-center"
                  >
                    <div className="flex flex-col items-center">
                      <div className="relative w-12 h-12 mb-4">
                        <div className="absolute top-0 right-0 w-full h-full border-4 border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-full animate-pulse-soft"></div>
                        <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-secondary-200 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        <MapPin className="absolute inset-0 m-auto w-5 h-5 text-voxcina-blue/40 dark:text-secondary-200/40" />
                      </div>
                      <p className="text-voxcina-blue/70 dark:text-secondary-200/70 font-medium">
                        در حال بارگذاری آدرس‌ها...
                      </p>
                    </div>
                  </motion.div>
                ) : addresses.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-8"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-secondary-100 to-secondary-200 dark:from-voxcina-darkBlue/20 dark:to-voxcina-blue/20 mb-4 shadow-soft">
                      <MapPin className="h-8 w-8 text-voxcina-blue/60 dark:text-secondary-300" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-secondary-200">
                      هنوز آدرسی ثبت نکرده‌اید
                    </h3>
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-6 max-w-md mx-auto">
                      برای ثبت سفارش نیاز به حداقل یک آدرس دارید.
                    </p>
                    <Button
                      variant="primary"
                      className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300"
                      onClick={handleAddNew}
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      افزودن آدرس جدید
                    </Button>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {addresses.map((address) => (
                          <motion.div 
                            key={address.id} 
                            variants={itemVariants}
                            whileHover={{ y: -3 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                          >
                            <Card
                              className={`h-full border cursor-pointer overflow-hidden rounded-xl transition-all 
                                ${
                                  selectedAddress?.id === address.id
                                    ? "border-voxcina-blue bg-voxcina-blue/5 dark:border-voxcina-cream dark:bg-voxcina-cream/5 shadow-soft"
                                    : "border-voxcina-cream/30 dark:border-voxcina-blue/30 hover:border-voxcina-blue/50 dark:hover:border-voxcina-cream/30"
                                }`}
                              onClick={() => setSelectedAddress(address)}
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center">
                                    <input
                                      type="radio"
                                      id={`address-${address.id}`}
                                      checked={selectedAddress?.id === address.id}
                                      onChange={() => setSelectedAddress(address)}
                                      className="ml-2 text-voxcina-blue"
                                    />
                                    <label
                                      htmlFor={`address-${address.id}`}
                                      className="flex items-center font-medium text-voxcina-blue dark:text-voxcina-cream"
                                    >
                                      {getAddressTypeIcon(address.title)}
                                      {address.title}
                                      {address.isDefault && (
                                        <span className="mr-2 text-xs bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue px-2 py-0.5 rounded-full">
                                          پیش‌فرض
                                        </span>
                                      )}
                                    </label>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(address.id as string);
                                    }}
                                    className="text-xs text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                                  >
                                    ویرایش
                                  </button>
                                </div>
                                <div className="text-sm mr-6 space-y-1">
                                  <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                                    {address.firstName} {address.lastName}
                                  </p>
                                  <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                                    {address.province}، {address.city}، {address.address}
                                  </p>
                                  <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70">کد پستی: {address.postalCode}</p>
                                  <p className="text-voxcina-blue dark:text-voxcina-cream">شماره تماس: {address.phoneNumber}</p>
                                </div>
                                
                                {!address.isDefault && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 text-xs border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-cream/20 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-cream/5 w-full rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      address.id && handleSetDefault(address.id);
                                    }}
                                    disabled={operationLoading === address.id}
                                  >
                                    {operationLoading === address.id ? (
                                      <Loader2 className="w-3 h-3 ml-1 animate-spin" />
                                    ) : (
                                      <Check className="w-3 h-3 ml-1" />
                                    )}
                                    {operationLoading === address.id ? "در حال تنظیم..." : "تنظیم به عنوان پیش‌فرض"}
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                    
                    <div className="flex justify-center mt-4">
                      <Button
                        variant="outline"
                        onClick={handleAddNew}
                        className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-cream/20 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-cream/5"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        افزودن آدرس جدید
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border border-voxcina-cream/30 dark:border-voxcina-blue/30 bg-white/90 dark:bg-voxcina-blue/10 shadow-sm rounded-2xl backdrop-blur-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-6 text-voxcina-blue dark:text-voxcina-cream flex items-center">
                  <Truck className="w-5 h-5 ml-2" />
                  روش ارسال
                </h2>

                <ShippingMethodSelector
                  selectedAddressCityCode={selectedAddress?.cityCode || null}
                  cartItemCount={cart.items.length}
                  cartTotal={summary.subtotal}
                  onSelectMethod={setSelectedShippingMethod}
                  selectedMethodId={selectedShippingMethod?.id}
                />
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <PaymentMethods
              onSelectMethod={setSelectedPaymentMethod}
              selectedMethod={selectedPaymentMethod}
              onSelectGateway={setSelectedGateway}
              selectedGateway={selectedGateway}
            />
          </motion.div>

          {!selectedAddress && (
            <motion.div
              className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start shadow-sm"
              variants={itemVariants}
              animate={{
                scale: [1, 1.02, 1],
                transition: { repeat: 2, duration: 1 },
              }}
            >
              <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5 ml-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-800 dark:text-amber-400">
                  لطفا آدرس تحویل را انتخاب کنید
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                  برای ادامه فرآیند خرید، لازم است یک آدرس تحویل انتخاب نمایید.
                </p>
              </div>
            </motion.div>
          )}

          <motion.div
            className="flex justify-end"
            variants={itemVariants}
            whileHover={{ y: -3 }}
          >
            <Button
              variant="primary"
              size="lg"
              onClick={handlePlaceOrder}
              isLoading={isProcessing}
              disabled={!selectedAddress || isProcessing}
              className="w-full sm:w-auto rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue dark:bg-voxcina-cream/90 dark:hover:bg-voxcina-cream dark:text-voxcina-blue text-white shadow-md hover:shadow-lg transition-all duration-300 px-8 py-3"
            >
              <Check className="w-5 h-5 ml-2" />
              ثبت سفارش و پرداخت
            </Button>
          </motion.div>
        </motion.div>

        {/* ───────── Right column (Order summary) ───────── */}
        <motion.div variants={itemVariants}>
          <CartSummary 
            showCheckoutButton={false} 
            shippingCost={selectedShippingMethod?.price}
          />
        </motion.div>
      </motion.div>

      {/* Create/Edit Address Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingAddress ? "ویرایش آدرس" : "افزودن آدرس جدید"}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium mb-1 text-voxcina-blue dark:text-secondary-200">نوع آدرس</label>
              <div className="flex space-x-4 space-x-reverse">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="addressType"
                    value="home"
                    checked={formData.addressType === "home"}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mr-2 transition-all duration-300 ${
                      formData.addressType === "home"
                        ? "border-voxcina-blue bg-voxcina-blue/5 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-200 scale-110"
                        : "border-secondary-200 text-voxcina-blue/40 dark:border-voxcina-darkBlue/30 dark:text-secondary-400"
                    } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Home className="w-5 h-5" />
                  </div>
                  <span className="text-voxcina-blue dark:text-secondary-200 mr-2">خانه</span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="addressType"
                    value="work"
                    checked={formData.addressType === "work"}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mr-2 transition-all duration-300 ${
                      formData.addressType === "work"
                        ? "border-voxcina-blue bg-voxcina-blue/5 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-200 scale-110"
                        : "border-secondary-200 text-voxcina-blue/40 dark:border-voxcina-darkBlue/30 dark:text-secondary-400"
                    } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className="text-voxcina-blue dark:text-secondary-200 mr-2">محل کار</span>
                </label>
              </div>
            </div>

            <Input
              label="عنوان آدرس (اختیاری)"
              name="title"
              value={formData.title}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder={
                formData.addressType === "home"
                  ? "مثال: خانه، منزل پدری"
                  : "مثال: دفتر، شرکت"
              }
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />

            <div className="flex justify-end mb-2">
              {user && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nameParts = user.name?.split(' ') || [];
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    setFormData(prev => ({
                      ...prev,
                      firstName,
                      lastName,
                      phoneNumber: user.phone || prev.phoneNumber,
                    }));
                    toast.success("اطلاعات شما از پروفایل کاربری وارد شد");
                  }}
                  disabled={isSubmitting}
                  className="text-xs rounded-lg border-voxcina-blue/30 text-voxcina-blue dark:border-voxcina-cream/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-cream/5"
                >
                  <User className="w-3 h-3 ml-1" />
                  استفاده از اطلاعات پروفایل
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="نام *"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
              />
              <Input
                label="نام خانوادگی *"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
              />
            </div>

            <Input
              label="شماره تماس *"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
              required
              disabled={isSubmitting}
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1 text-voxcina-blue dark:text-secondary-200">استان *</label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting || loadingProvinces}
                  className="w-full rounded-xl border border-secondary-200 dark:border-voxcina-darkBlue/30 bg-white dark:bg-voxcina-darkBlue/20 px-3 py-2 text-sm focus:outline-none focus:border-voxcina-blue focus:ring-2 focus:ring-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">انتخاب استان</option>
                  {loadingProvinces ? (
                    <option value="">در حال بارگذاری...</option>
                  ) : (
                    provinces.map((p) => (
                      <option key={p.province_code} value={p.province_name}>
                        {p.province_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1 text-voxcina-blue dark:text-secondary-200">شهر *</label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting || loadingCities || !formData.province}
                  className="w-full rounded-xl border border-secondary-200 dark:border-voxcina-darkBlue/30 bg-white dark:bg-voxcina-darkBlue/20 px-3 py-2 text-sm focus:outline-none focus:border-voxcina-blue focus:ring-2 focus:ring-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingCities 
                      ? "در حال بارگذاری..." 
                      : !formData.province 
                        ? "ابتدا استان را انتخاب کنید" 
                        : "انتخاب شهر"}
                  </option>
                  {!loadingCities && cities.map((c) => (
                    <option key={c.city_code} value={c.city_name}>
                      {c.city_name}
                    </option>
                  ))}
                </select>
                {loadingCities && (
                  <div className="flex items-center mt-1 text-xs text-voxcina-blue/60 dark:text-secondary-300/60">
                    <Loader2 className="animate-spin h-3 w-3 ml-1" />
                    در حال بارگذاری شهرها...
                  </div>
                )}
              </div>
            </div>

            <Input
              label="آدرس کامل *"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="مثال: خیابان اصلی، کوچه فرعی، پلاک ۱۲، واحد ۳"
              required
              disabled={isSubmitting}
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />

            <Input
              label="کد پستی *"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰"
              required
              disabled={isSubmitting}
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium mb-1 text-voxcina-blue dark:text-secondary-200">موقعیت روی نقشه *</label>
              <MapPicker
                location={{ lat: formData.latitude, lng: formData.longitude }}
                onChange={({ lat, lng }) =>
                  setFormData({ ...formData, latitude: lat, longitude: lng })
                }
              />
            </div>

            <div className="flex items-center bg-gradient-to-r from-voxcina-blue/5 to-secondary-200/70 dark:from-voxcina-blue/10 dark:to-voxcina-blue/5 p-4 rounded-xl">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                disabled={isSubmitting}
                className="ml-2 h-4 w-4 rounded border-secondary-300 text-voxcina-blue focus:ring-voxcina-blue/30 disabled:opacity-50"
              />
              <label
                htmlFor="isDefault"
                className="text-sm text-voxcina-blue dark:text-secondary-200"
              >
                تنظیم به عنوان آدرس پیش‌فرض
              </label>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl border-secondary-200 dark:border-voxcina-darkBlue/30 text-voxcina-blue dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-voxcina-darkBlue/20"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300"
              >
                {editingAddress ? "ویرایش آدرس" : "افزودن آدرس"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
