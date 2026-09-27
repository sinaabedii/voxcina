"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Truck, MapPin, Plus, Home, Briefcase, User, Receipt } from "lucide-react";

import Button from "@/components/ui/Button";
import PaymentMethods from "@/components/checkout/PaymentMethods";
import ShippingMethodSelector from "@/components/checkout/ShippingMethodSelector";
import { AddressSectionSkeleton } from "@/components/checkout/CheckoutSkeletons";
import CheckoutSectionCard from "@/components/checkout/CheckoutSectionCard";
import AddressCard from "@/components/checkout/AddressCard";
import AddressFormModal from "@/components/checkout/AddressFormModal";
import OrderTotalsRows from "@/components/checkout/OrderTotalsRows";
import EligibilityNotice from "@/components/checkout/EligibilityNotice";
import StickyMobileCheckoutBar from "@/components/checkout/StickyMobileCheckoutBar";
import CartSummary from "@/components/cart/CartSummary";
import { useCart } from "@/hooks/useCart";
import { useAddress } from "@/hooks/useAddress";
import { useLocality } from "@/hooks/useLocality";
import { useDashboardStore } from "@/store/dashboard-store";
import { useAuthStore } from "@/store/auth-store";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Address } from "@/types/user";
import { ShippingMethod, getCartWeightGrams } from "@/services/shipping/types";
import { formatPrice, generateId } from "@/lib/utils";
import { shippingDiscountPercent, applyShippingDiscount } from "@/lib/shipping-discount";
import { activityTracker } from "@/lib/activity-tracker";
import { toast } from "react-toastify";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, summary, clearCart, promoCode, removePromoCode } = useCart();
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
  const [snappPayEligibility, setSnappPayEligibility] = useState<{
    eligible: boolean;
    title_message: string;
    description: string;
  } | null>(null);
  const [snappPayEligibilityLoading, setSnappPayEligibilityLoading] = useState(false);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const paymentRequestInFlight = useRef(false);
  /* Anchor for the shipping step: selecting an address reloads quotes by
     cityCode, so bring the shipping section into view (mobile flow).
     Must live with the other hooks — after the early returns it breaks the
     hook order (React #310) once the cart rehydrates. */
  const shippingRef = useRef<HTMLDivElement>(null);

  // Shipping sent to the backend is the BASE (pre-discount) cost; the code's
  // shipping discount is applied to both the displayed total and checkoutTotal.
  const shippingBase = selectedShippingMethod?.price ?? summary.shipping ?? 0;
  const shippingDiscount = shippingDiscountPercent(promoCode?.shippingDiscount);
  const shippingCost = applyShippingDiscount(shippingBase, shippingDiscount);
  const checkoutTotal = Math.max(0, summary.subtotal + shippingCost - summary.discount);
  // Postex quotes by total quantity (Σ quantity), not cart-line count, and
  // by real cart weight so the box type and courier pricing are accurate.
  const cartItemCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);
  const cartWeightGrams = getCartWeightGrams(cart.items);

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

  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (isProcessing) {
      return () => {
        cancelled = true;
      };
    }
    if (!token || checkoutTotal <= 0) {
      setSnappPayEligibility(null);
      setSnappPayEligibilityLoading(false);
      setSelectedGateway((currentGateway) => currentGateway === "snappay" ? "zibal" : currentGateway);
      return () => {
        cancelled = true;
      };
    }

    setSelectedGateway((currentGateway) => currentGateway === "snappay" ? "zibal" : currentGateway);
    setSnappPayEligibilityLoading(true);
    fetch(`/api/payment/snappay/eligibility?amount=${Math.round(checkoutTotal * 10)}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((eligibility) => {
        if (cancelled) return;
        setSnappPayEligibility(eligibility?.eligible ? eligibility : null);
        if (!eligibility?.eligible) {
          setSelectedGateway((currentGateway) => currentGateway === "snappay" ? "zibal" : currentGateway);
        }
      })
      .catch(() => {
        if (!cancelled) setSnappPayEligibility(null);
      })
      .finally(() => {
        if (!cancelled) setSnappPayEligibilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [checkoutTotal, isProcessing]);

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

  const handleSelectAddress = (address: Address) => {
    setSelectedAddress(address);
    requestAnimationFrame(() => {
      shippingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  /* Profile prefill for the address form (same data as the inline form). */
  const handlePrefillFromProfile = () => {
    if (!user) return;
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
  };

  /* ────────────────────────────────────────────
     Place-order handler
  ───────────────────────────────────────────── */
  const handlePlaceOrder = async () => {
    if (paymentRequestInFlight.current) return;

    if (selectedPaymentMethod === "online" && selectedGateway === "snappay" && snappPayEligibility?.eligible !== true) {
      toast.error("این درگاه فعلا فعال نیست چند دقیقه بعد امتحان کنید یا تیکت بگذارید");
      return;
    }

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

    paymentRequestInFlight.current = true;

    try {
      setIsProcessing(true);

      // Prepare order items for backend
      const orderItems = cart.items.map((item) => ({
        product_id: item.productId,
        variant: {
          variantId: item.variantId || undefined,
          color: item.color || "",
          colorName: item.colorName || "",
          size: item.size || "",
          sku: item.sku || undefined,
        },
        quantity: item.quantity,
        price_at_purchase: item.price,
      }));

      // Calculate total with shipping
      const totalAmount = checkoutTotal;

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
          shippingCost: shippingBase,
          taxAmount: 0,
          discountAmount: summary.discount,
          shippingAddress: shippingAddress,
          promoCode: promoCode?.code && promoCode.isValid ? promoCode.code : undefined,
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        // If the error is about the promo code, remove it from cart and show specific message
        if (errorData.error && (
          errorData.error.includes("کد تخفیف") ||
          errorData.error.includes("منقضی") ||
          errorData.error.includes("استفاده شده") ||
          errorData.error.includes("نامعتبر") ||
          errorData.error.includes("سقف مصرف") ||
          errorData.error.includes("تعلق")
        )) {
          removePromoCode();
          toast.error(errorData.error);
          setIsProcessing(false);
          paymentRequestInFlight.current = false;
          return;
        }
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
        // Request payment from the selected gateway.
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
          // Use a full navigation so checkout cannot remain as a stale history entry.
          window.location.replace(paymentData.payUrl);
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
        paymentRequestInFlight.current = false;
        return;
      }
    } catch (error: any) {
      console.error("خطا در ثبت سفارش:", error);
      setIsProcessing(false);
      paymentRequestInFlight.current = false;
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
    <div className="container py-5 md:py-12">
      <motion.h1
        className="text-xl md:text-3xl font-bold mb-4 md:mb-8 text-voxcina-blue dark:text-voxcina-cream relative inline-block"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="relative z-10">تکمیل سفارش</span>
        <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
      </motion.h1>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ───────── Left column ───────── */}
        <motion.div className="lg:col-span-2 space-y-4 md:space-y-6" variants={itemVariants}>
          {/* Mobile-only compact summary hero: totals before the first step */}
          <motion.div variants={itemVariants} className="md:hidden">
            <CheckoutSectionCard
              title="خلاصه سفارش"
              icon={<Receipt className="w-5 h-5" />}
            >
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{cartItemCount} کالا در سبد خرید</span>
                {promoCode?.isValid && (
                  <span className="text-success">کد {promoCode.code} فعال است</span>
                )}
              </div>
              <OrderTotalsRows
                subtotal={summary.subtotal}
                discount={summary.discount}
                shippingBase={shippingBase}
                shippingPercent={shippingDiscount}
                shippingDiscountValue={promoCode?.shippingDiscount}
                showShipping
                variant="compact"
              />
            </CheckoutSectionCard>
          </motion.div>
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            {/* Address Section */}
            <CheckoutSectionCard
              title="آدرس تحویل"
              icon={<MapPin className="w-5 h-5" />}
              step="۱"
            >
                {addressesLoading ? (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                  >
                    <AddressSectionSkeleton />
                  </motion.div>
                ) : addresses.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-6 md:py-8"
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
                  <div className="space-y-3 md:space-y-4">
                    <AnimatePresence>
                      <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {addresses.map((address) => (
                          <motion.div
                            key={address.id}
                            variants={itemVariants}
                            className="h-full"
                          >
                            <AddressCard
                              address={address}
                              selected={selectedAddress?.id === address.id}
                              onSelect={() => handleSelectAddress(address)}
                              onEdit={handleEdit}
                              onSetDefault={handleSetDefault}
                              operationLoading={operationLoading}
                              typeIcon={getAddressTypeIcon(address.title)}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    </AnimatePresence>

                    <div className="flex justify-center mt-3 md:mt-4">
                      <Button
                        variant="outline"
                        onClick={handleAddNew}
                        className="min-h-[44px] md:min-h-0 rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-cream/20 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-cream/5"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        افزودن آدرس جدید
                      </Button>
                    </div>
                  </div>
                )}
            </CheckoutSectionCard>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <div ref={shippingRef} className="scroll-mt-24">
              <CheckoutSectionCard
                title="روش ارسال"
                icon={<Truck className="w-5 h-5" />}
                step="۲"
                contentClassName="p-4 md:p-6"
              >
                <ShippingMethodSelector
                  selectedAddressCityCode={selectedAddress?.cityCode || null}
                  cartItemCount={cartItemCount}
                  cartTotal={summary.subtotal}
                  cartWeightGrams={cartWeightGrams}
                  onSelectMethod={setSelectedShippingMethod}
                  selectedMethodId={selectedShippingMethod?.id}
                />
              </CheckoutSectionCard>
            </div>
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
              snappPayEligibility={snappPayEligibility}
              snappPayEligibilityLoading={snappPayEligibilityLoading}
            />
          </motion.div>

          {!selectedAddress && (
            <motion.div variants={itemVariants}>
              <EligibilityNotice />
            </motion.div>
          )}

          {/* Mobile-only full totals: visible before the CTA on <md */}
          <motion.div variants={itemVariants} className="md:hidden">
            <CheckoutSectionCard
              title="جزئیات پرداخت"
              icon={<Receipt className="w-5 h-5" />}
              step="۴"
            >
              <OrderTotalsRows
                subtotal={summary.subtotal}
                discount={summary.discount}
                shippingBase={shippingBase}
                shippingPercent={shippingDiscount}
                shippingDiscountValue={promoCode?.shippingDiscount}
                showShipping
                variant="full"
              />
              <div className="mt-4 rounded-xl border border-border/5 bg-secondary/30 p-3 text-center">
                {promoCode?.isValid ? (
                  <p className="text-xs text-success">کد تخفیف {promoCode.code} اعمال شد</p>
                ) : (
                  <p className="mb-1 text-xs text-muted-foreground">کد تخفیف داری؟</p>
                )}
                <Link
                  href="/cart"
                  className="text-xs font-medium text-voxcina-blue/80 underline underline-offset-4 hover:text-voxcina-blue dark:text-voxcina-cream/80 dark:hover:text-voxcina-cream"
                >
                  تغییر کد تخفیف در سبد خرید
                </Link>
              </div>
            </CheckoutSectionCard>
          </motion.div>

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

        {/* ───────── Right column (Order summary, desktop) ───────── */}
        <motion.div variants={itemVariants} className="hidden lg:block">
          <CartSummary 
            showCheckoutButton={false} 
            shippingCost={selectedShippingMethod?.price}
            readOnly
          />
        </motion.div>
      </motion.div>

      {/* Spacer so the mobile sticky bar never covers content */}
      <div className="h-36 md:hidden" aria-hidden="true" />

      <StickyMobileCheckoutBar
        total={checkoutTotal}
        itemCount={cartItemCount}
        isProcessing={isProcessing}
        disabled={!selectedAddress || isProcessing}
        onSubmit={handlePlaceOrder}
      />

      {/* Create/Edit Address Modal */}
      <AddressFormModal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsModalOpen(false);
        }}
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        editingAddress={editingAddress}
        provinces={provinces}
        cities={cities}
        loadingProvinces={loadingProvinces}
        loadingCities={loadingCities}
        showProfilePrefill={!!user}
        onPrefillProfile={handlePrefillFromProfile}
        onLocationChange={({ lat, lng }) =>
          setFormData({ ...formData, latitude: lat, longitude: lng })
        }
      />
    </div>
  );
}
