"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Truck, AlertCircle, MapPin, Plus, Home, Briefcase, Edit, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/Modal";
import MapPicker from "@/components/ui/MapPicker";
import PaymentMethods from "@/components/checkout/PaymentMethods";
import CartSummary from "@/components/cart/CartSummary";
import { useCart } from "@/hooks/useCart";
import { useAddress } from "@/hooks/useAddress";
import { useLocality } from "@/hooks/useLocality";
import { useDashboardStore } from "@/store/dashboard-store";
import { Address } from "@/types/user";
import { SHIPPING_METHODS } from "@/lib/constants";
import { formatPrice, generateId } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, summary, clearCart } = useCart();
  const { createOrder } = useDashboardStore();
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
  const [selectedShippingMethod, setSelectedShippingMethod] = useState(
    SHIPPING_METHODS[0].id
  );
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
    city: "",
    address: "",
    postalCode: "",
    isDefault: false,
    addressType: "home",
    latitude: 0,
    longitude: 0,
  });

  /* ────────────────────────────────────────────
     Redirect to /cart on the CLIENT only
  ───────────────────────────────────────────── */
  useEffect(() => {
    if (cart.items.length === 0) {
      router.replace("/cart");
    }
  }, [cart.items.length, router]);

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
        city: "",
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
     This avoids executing any of the heavy checkout UI on the server. */
  if (cart.items.length === 0) return null;

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
      // When province changes, reset city
      setFormData({ 
        ...formData, 
        [name]: value,
        city: "" // Reset city when province changes
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
      city: "",
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
      city: address.city || "",
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

    try {
      setIsProcessing(true);

      // Convert the address to the format expected by dashboard-store
      const dashboardAddress = {
        id: selectedAddress.id || generateId(), // Use the existing ID or generate a new one
        title: selectedAddress.title || "",
        firstName: selectedAddress.firstName || "",
        lastName: selectedAddress.lastName || "",
        phoneNumber: selectedAddress.phoneNumber || "",
        province: selectedAddress.province || "",
        city: selectedAddress.city || "",
        address: selectedAddress.address || "",
        postalCode: selectedAddress.postalCode || "",
        isDefault: selectedAddress.isDefault || false,
        latitude: selectedAddress.latitude || 0,
        longitude: selectedAddress.longitude || 0,
      };

      const orderId = createOrder(
        cart.items.map((item) => ({
          productId: item.productId,
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
        })),
        dashboardAddress
      );

      clearCart();

      // simulate payment gateway round-trip
      await new Promise((resolve) => setTimeout(resolve, 2000));

      router.push(`/checkout/success?orderId=${orderId}`);
    } catch (error) {
      console.error("خطا در ثبت سفارش:", error);
      setIsProcessing(false);
      toast.error("خطا در ثبت سفارش. لطفا دوباره تلاش کنید.");
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
      transition: { type: "spring", stiffness: 300, damping: 30 },
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
                <h2 className="text-lg font-semibold mb-6 text-voxcina-blue dark:text-voxcina-cream">
                  روش ارسال
                </h2>

                <div className="space-y-4">
                  {SHIPPING_METHODS.map((method) => (
                    <div
                      key={method.id}
                      className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 ${
                        selectedShippingMethod === method.id
                          ? "border-voxcina-blue dark:border-voxcina-cream/70 bg-voxcina-cream/30 dark:bg-voxcina-blue/20 shadow-sm"
                          : "border-voxcina-cream/30 dark:border-voxcina-blue/30 hover:border-voxcina-blue/50 dark:hover:border-voxcina-cream/30 hover:shadow-sm"
                      }`}
                      onClick={() => setSelectedShippingMethod(method.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="relative flex items-center">
                            <input
                              type="radio"
                              id={`shipping-${method.id}`}
                              name="shipping-method"
                              checked={selectedShippingMethod === method.id}
                              onChange={() =>
                                setSelectedShippingMethod(method.id)
                              }
                              className="w-5 h-5 opacity-0 absolute"
                            />
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ml-2 transition-all duration-200 ${
                                selectedShippingMethod === method.id
                                  ? "border-voxcina-blue dark:border-voxcina-cream bg-voxcina-blue dark:bg-voxcina-cream text-white dark:text-voxcina-blue"
                                  : "border-voxcina-blue/30 dark:border-voxcina-cream/30"
                              }`}
                            >
                              {selectedShippingMethod === method.id && (
                                <Check className="w-3 h-3" />
                              )}
                            </div>
                            <label
                              htmlFor={`shipping-${method.id}`}
                              className="font-medium cursor-pointer text-voxcina-blue dark:text-voxcina-cream"
                            >
                              {method.title}
                            </label>
                          </div>
                        </div>
                        <span
                          className={`font-bold ${
                            selectedShippingMethod === method.id
                              ? "text-voxcina-blue dark:text-voxcina-cream"
                              : "text-voxcina-blue/70 dark:text-voxcina-cream/70"
                          }`}
                        >
                          {formatPrice(method.price)}
                        </span>
                      </div>
                      <div className="flex mt-3 mr-10 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 items-start">
                        <Truck className="h-4 w-4 text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-0.5 ml-2 flex-shrink-0" />
                        <p>{method.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
          <CartSummary showCheckoutButton={false} />
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
