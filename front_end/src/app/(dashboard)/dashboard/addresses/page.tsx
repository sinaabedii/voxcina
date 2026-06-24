"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/Modal";
import {
  MapPin,
  Plus,
  Edit,
  Trash,
  Home,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import { useAddress } from "@/hooks/useAddress";
import { useLocality } from "@/hooks/useLocality";
import { useAuthStore } from "@/store/auth-store";
import { motion, AnimatePresence } from "framer-motion";
import { Address } from "@/types/user";
import { toast } from "react-hot-toast";

const MapPicker = dynamic(() => import("@/components/ui/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-xl border border-secondary-200 dark:border-voxcina-blue/30 bg-voxcina-cream/30 dark:bg-voxcina-blue/10 flex items-center justify-center">
      <Loader2 className="h-5 w-5 text-voxcina-blue/50 dark:text-voxcina-cream/50 animate-spin" />
    </div>
  ),
});

export default function AddressesPage() {
  const {
    addresses,
    isLoading,
    error,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddress();
  const { provinces, cities, fetchCities, loadingProvinces, loadingCities } = useLocality();
  const { user } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [pelak, setPelak] = useState("");
  const [tabaghe, setTabaghe] = useState("");
  const [vahed, setVahed] = useState("");

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

  // Reset form when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setEditingAddress(null);
      setWizardStep(1);
      setPelak("");
      setTabaghe("");
      setVahed("");
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

  // Fetch cities when province changes
  useEffect(() => {
    if (formData.province && provinces.length) {
      const selected = provinces.find((p) => p.province_name === formData.province);
      if (selected) {
        fetchCities(selected.province_code);
      }
    }
  }, [formData.province, provinces]);

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
    setWizardStep(2);
    setPelak("");
    setTabaghe("");
    setVahed("");
    setIsModalOpen(true);
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
    setWizardStep(1);
    setPelak("");
    setTabaghe("");
    setVahed("");
    setIsModalOpen(true);
  };

  const confirmDelete = (addressId: string) => {
    const address = addresses.find((addr) => addr.id === addressId);
    if (!address) {
      toast.error("آدرس موردنظر یافت نشد");
      return;
    }
    setDeleteConfirmId(addressId);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      setIsSubmitting(true);
      setOperationLoading(deleteConfirmId);
      
      await deleteAddress(deleteConfirmId);
      
      toast.success("آدرس با موفقیت حذف شد");
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete address:", error);
      toast.error("خطا در حذف آدرس. لطفاً دوباره تلاش کنید");
    } finally {
      setIsSubmitting(false);
      setOperationLoading(null);
    }
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

    if (!pelak.trim()) {
      toast.error("لطفاً پلاک را وارد کنید");
      return;
    }
    if (!tabaghe.trim()) {
      toast.error("لطفاً طبقه را وارد کنید");
      return;
    }

    // Validate location selection
    if (formData.latitude === 0 || formData.longitude === 0) {
      toast.error("لطفاً موقعیت را از نقشه انتخاب کنید");
      return;
    }

    setIsSubmitting(true);

    let fullAddress = formData.address;
    fullAddress += "، پلاک " + pelak.trim();
    fullAddress += "، طبقه " + tabaghe.trim();
    if (vahed.trim()) {
      fullAddress += "، واحد " + vahed.trim();
    }

    const finalFormData = {
      ...formData,
      address: fullAddress,
      title: formData.title || (formData.addressType === "home" ? "خانه" : "محل کار"),
    };

    try {
      if (editingAddress) {
        await updateAddress(editingAddress, finalFormData);
        toast.success("آدرس با موفقیت ویرایش شد");
      } else {
        await addAddress(finalFormData);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
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

  // Show error state if there's an error
  if (error && !isLoading) {
    return (
      <div className="container py-8 md:py-12 mx-auto px-4 md:px-8">
        <Card className="border border-red-200 dark:border-red-800/30 shadow-soft rounded-2xl bg-red-50 dark:bg-red-900/10">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-400">
              خطا در بارگذاری آدرس‌ها
            </h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button 
              variant="primary" 
              onClick={() => window.location.reload()}
              className="bg-red-500 hover:bg-red-600"
            >
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 transition-all duration-500 ease-in-out">
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold mb-4 sm:mb-0 text-voxcina-blue dark:text-secondary-200 relative">
          <span className="relative z-10">آدرس‌های من</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>
        <Button
          variant="primary"
          onClick={handleAddNew}
          disabled={isLoading}
          className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300 flex items-center disabled:opacity-50"
        >
          <Plus className="w-4 h-4 ml-2" />
          افزودن آدرس جدید
        </Button>
      </motion.div>

      {isLoading ? (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="min-h-[300px] flex items-center justify-center"
        >
          <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/60 dark:bg-voxcina-blue/10 w-full md:max-w-md mx-auto">
            <CardContent className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-full animate-pulse-soft"></div>
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-secondary-200 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  <MapPin className="absolute inset-0 m-auto w-6 h-6 text-voxcina-blue/40 dark:text-secondary-200/40" />
                </div>
                <p className="text-voxcina-blue/70 dark:text-secondary-200/70 font-medium">
                  در حال بارگذاری آدرس‌ها...
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : addresses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-secondary-100 to-secondary-200 dark:from-voxcina-darkBlue/20 dark:to-voxcina-blue/20 mb-6 shadow-soft">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    repeat: Infinity, 
                    repeatType: "reverse", 
                    duration: 2
                  }}
                >
                  <MapPin className="h-10 w-10 text-voxcina-blue/60 dark:text-secondary-300" />
                </motion.div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-voxcina-blue dark:text-secondary-200">
                هنوز آدرسی ثبت نکرده‌اید
              </h3>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-8 max-w-md mx-auto">
                برای ثبت سفارش و ارسال محصولات نیاز به حداقل یک آدرس دارید.
                آدرس خود را اضافه کنید تا تجربه خرید آسان‌تری داشته باشید.
              </p>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="primary"
                  className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300 px-6 py-3"
                  onClick={handleAddNew}
                >
                  <Plus className="w-5 h-5 ml-2" />
                  افزودن آدرس جدید
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6 flex justify-between items-center"
          >
            <p className="text-sm text-voxcina-blue/70 dark:text-secondary-300 bg-secondary-100 dark:bg-voxcina-blue/10 px-4 py-2 rounded-full shadow-inner-soft">
              <span className="font-bold text-voxcina-blue dark:text-secondary-200">{addresses.length}</span> آدرس ثبت شده
            </p>
          </motion.div>
          
          <AnimatePresence>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {addresses.map((address) => (
                <motion.div 
                  key={address.id} 
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  className="h-full"
                >
                  <Card
                    className={`h-full border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft hover:shadow-medium transition-all overflow-hidden rounded-2xl backdrop-blur-sm 
                      ${
                        address.isDefault
                          ? "bg-gradient-to-br from-voxcina-blue/5 to-secondary-200/70 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 border-voxcina-blue/20 dark:border-voxcina-blue/30"
                          : "bg-white/90 dark:bg-voxcina-blue/10"
                      }`}
                  >
                    <CardHeader className="pb-2 flex flex-row justify-between items-start relative pt-6">
                      <div>
                        <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-secondary-200">
                          <span className="relative">
                            <span className="absolute -right-2 -top-2 w-8 h-8 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-10"></span>
                            {getAddressTypeIcon(address.title)}
                          </span>
                          {address.title || "آدرس"}
                          {address.isDefault && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-voxcina-blue rounded">
                              پیش‌فرض
                            </span>
                          )}
                        </CardTitle>
                      </div>
                      <div className="flex space-x-2 space-x-reverse">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="text-voxcina-blue p-1.5 hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/20 rounded-full transition-colors disabled:opacity-50"
                          onClick={() => address.id && handleEdit(address.id)}
                          disabled={!address.id || operationLoading === address.id}
                          aria-label="ویرایش آدرس"
                        >
                          {operationLoading === address.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Edit className="w-4 h-4" />
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors disabled:opacity-50"
                          onClick={() => address.id && confirmDelete(address.id)}
                          disabled={!address.id || operationLoading === address.id}
                          aria-label="حذف آدرس"
                        >
                          {operationLoading === address.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash className="w-4 h-4" />
                          )}
                        </motion.button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col space-y-3">
                        <p className="font-medium text-voxcina-blue dark:text-secondary-200">
                          {address.firstName} {address.lastName}
                        </p>

                        <div className="flex items-start">
                          <div className="w-6 h-6 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-voxcina-blue dark:text-secondary-300" />
                          </div>
                          <p className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                            {address.province}، {address.city}، {address.address}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                          <div className="bg-secondary-100 dark:bg-voxcina-blue/10 p-2 rounded-lg">
                            <span className="text-xs text-voxcina-blue/50 dark:text-secondary-400 block mb-1">
                              کد پستی:
                            </span>
                            <span className="font-mono tracking-wide text-voxcina-blue dark:text-secondary-300">
                              {address.postalCode}
                            </span>
                          </div>
                          <div className="bg-secondary-100 dark:bg-voxcina-blue/10 p-2 rounded-lg">
                            <span className="text-xs text-voxcina-blue/50 dark:text-secondary-400 block mb-1">
                              شماره تماس:
                            </span>
                            <span className="font-mono tracking-wide ltr text-voxcina-blue dark:text-secondary-300">
                              {address.phoneNumber}
                            </span>
                          </div>
                        </div>

                        {!address.isDefault && (
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="mt-3"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-secondary-200 hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20 w-full rounded-xl group overflow-hidden relative disabled:opacity-50"
                              onClick={() => address.id && handleSetDefault(address.id)}
                              disabled={!address.id || operationLoading === address.id}
                            >
                              <span className="absolute inset-0 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                              {operationLoading === address.id ? (
                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                              <span className="relative z-10">
                                {operationLoading === address.id ? "در حال تنظیم..." : "تنظیم به عنوان آدرس پیش‌فرض"}
                              </span>
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Address Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={
          wizardStep === 1
            ? "انتخاب موقعیت روی نقشه"
            : editingAddress
            ? "ویرایش آدرس"
            : "افزودن آدرس جدید"
        }
        contentClassName={wizardStep === 1 ? "max-w-2xl" : ""}
      >
        <form onSubmit={handleSubmit}>
          {/* ======== STEP 1: Map Selection ======== */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="relative w-full h-[420px] rounded-xl overflow-hidden border border-secondary-200 dark:border-voxcina-blue/30">
                <MapPicker
                  location={{ lat: formData.latitude, lng: formData.longitude }}
                  onChange={({ lat, lng }) =>
                    setFormData({ ...formData, latitude: lat, longitude: lng })
                  }
                  onAddressResolved={(address) => {
                    setFormData(prev => ({ ...prev, address }));
                  }}
                />
              </div>

              {formData.address && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-voxcina-cream/30 dark:bg-voxcina-blue/10 border border-secondary-200 dark:border-voxcina-blue/30"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-voxcina-blue dark:text-voxcina-cream flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50 mb-0.5">
                        آدرس انتخاب‌شده
                      </p>
                      <p className="text-sm text-voxcina-blue dark:text-voxcina-cream leading-relaxed">
                        {formData.address}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {!formData.address && (
                <p className="text-xs text-voxcina-blue/40 dark:text-voxcina-cream/40 text-center">
                  لطفاً یک نقطه روی نقشه انتخاب کنید
                </p>
              )}

              <div className="flex justify-between items-center pt-2">
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
                  type="button"
                  variant="primary"
                  disabled={!formData.address || formData.latitude === 0}
                  onClick={() => setWizardStep(2)}
                  className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300 flex items-center gap-2"
                >
                  تایید و ادامه
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ======== STEP 2: Address Details ======== */}
          {wizardStep === 2 && (
            <div className="space-y-5">
              {/* Neshan resolved address card */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-gradient-to-r from-voxcina-blue/5 to-voxcina-cream/30 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 border border-voxcina-blue/20 dark:border-voxcina-blue/30"
              >
                <div className="flex items-start gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-voxcina-blue dark:text-voxcina-cream flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50 mb-0.5">
                      آدرس از روی نقشه
                    </p>
                    <p className="text-sm text-voxcina-blue dark:text-voxcina-cream leading-relaxed">
                      {formData.address}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="text-xs text-voxcina-blue/60 hover:text-voxcina-blue dark:text-voxcina-cream/60 dark:hover:text-voxcina-cream flex items-center gap-1 transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                  بازگشت و تغییر موقعیت
                </button>
              </motion.div>

              {/* پلاک / طبقه / واحد */}
              <div>
                <label className="text-sm font-medium block mb-2 text-voxcina-blue dark:text-secondary-200">
                  جزئیات دقیق آدرس
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Input
                      label="پلاک *"
                      name="pelak"
                      value={pelak}
                      onChange={(e) => setPelak(e.target.value)}
                      placeholder="مثال: ۱۲"
                      disabled={isSubmitting}
                      className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
                    />
                  </div>
                  <div>
                    <Input
                      label="طبقه *"
                      name="tabaghe"
                      value={tabaghe}
                      onChange={(e) => setTabaghe(e.target.value)}
                      placeholder="مثال: ۳"
                      disabled={isSubmitting}
                      className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
                    />
                  </div>
                  <div>
                    <Input
                      label="واحد"
                      name="vahed"
                      value={vahed}
                      onChange={(e) => setVahed(e.target.value)}
                      placeholder="اختیاری"
                      disabled={isSubmitting}
                      className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-secondary-200 dark:border-voxcina-blue/20"></div>

              {/* Address type */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-voxcina-blue dark:text-secondary-200">نوع آدرس</label>
                <div className="flex gap-3">
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    formData.addressType === "home"
                      ? "border-voxcina-blue bg-voxcina-blue/5 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-200"
                      : "border-secondary-200 text-voxcina-blue/50 dark:border-voxcina-darkBlue/30 dark:text-secondary-400 hover:border-voxcina-blue/30"
                  } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <input
                      type="radio"
                      name="addressType"
                      value="home"
                      checked={formData.addressType === "home"}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="sr-only"
                    />
                    <Home className="w-4 h-4" />
                    <span className="text-sm font-medium">خانه</span>
                  </label>
                  <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    formData.addressType === "work"
                      ? "border-voxcina-blue bg-voxcina-blue/5 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-200"
                      : "border-secondary-200 text-voxcina-blue/50 dark:border-voxcina-darkBlue/30 dark:text-secondary-400 hover:border-voxcina-blue/30"
                  } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <input
                      type="radio"
                      name="addressType"
                      value="work"
                      checked={formData.addressType === "work"}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="sr-only"
                    />
                    <Briefcase className="w-4 h-4" />
                    <span className="text-sm font-medium">محل کار</span>
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

              <div className="flex justify-end">
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
                    disabled={isSubmitting || loadingCities}
                    className="w-full rounded-xl border border-secondary-200 dark:border-voxcina-darkBlue/30 bg-white dark:bg-voxcina-darkBlue/20 px-3 py-2 text-sm focus:outline-none focus:border-voxcina-blue focus:ring-2 focus:ring-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">انتخاب شهر</option>
                    {loadingCities ? (
                      <option value="">در حال بارگذاری...</option>
                    ) : (
                      cities.map((c) => (
                        <option key={c.city_code} value={c.city_name}>
                          {c.city_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

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

              <div className="flex justify-between items-center pt-4 border-t border-secondary-200 dark:border-voxcina-blue/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWizardStep(1)}
                  disabled={isSubmitting}
                  className="rounded-xl border-secondary-200 dark:border-voxcina-darkBlue/30 text-voxcina-blue dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-voxcina-darkBlue/20 flex items-center gap-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  مرحله قبل
                </Button>
                <div className="flex gap-2">
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
                    className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        {editingAddress ? "در حال ویرایش..." : "در حال ذخیره..."}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 ml-1" />
                        {editingAddress ? "ویرایش آدرس" : "ذخیره آدرس"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => !isSubmitting && setDeleteConfirmId(null)}
        title="حذف آدرس"
      >
        <div className="p-4">
          <div className="flex items-start mb-6">
            <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-full ml-4 flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-voxcina-blue dark:text-secondary-200 mb-2">
                آیا از حذف این آدرس مطمئن هستید؟
              </p>
              <p className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                این عمل قابل بازگشت نیست و آدرس به طور کامل حذف خواهد شد.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isSubmitting}
              className="rounded-xl border-secondary-200 dark:border-voxcina-darkBlue/30 text-voxcina-blue dark:text-secondary-200"
            >
              انصراف
            </Button>
            <motion.div
              whileHover={{ scale: isSubmitting ? 1 : 1.03 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.97 }}
            >
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    در حال حذف...
                  </>
                ) : (
                  "حذف آدرس"
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </Modal>
    </div>
  );
}