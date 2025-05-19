"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
} from "lucide-react";
import { useDashboardStore } from "@/store/dashboard-store";
import { PROVINCES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

export default function AddressesPage() {
  const {
    addresses,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
  } = useDashboardStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (type === "radio") {
      setFormData({ ...formData, addressType: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleEdit = (addressId: string) => {
    const address = addresses.find((addr) => addr.id === addressId);
    if (address) {
      setFormData({
        ...address,
        addressType: address.title.toLowerCase().includes("کار")
          ? "work"
          : "home",
      });
      setEditingAddress(addressId);
      setIsModalOpen(true);
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
      isDefault: addresses.length === 0,
      addressType: "home",
    });
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const confirmDelete = (addressId: string) => {
    setDeleteConfirmId(addressId);
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      removeAddress(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalFormData = {
      ...formData,
      title:
        formData.addressType === "home"
          ? formData.title || "خانه"
          : formData.title || "محل کار",
    };

    if (editingAddress) {
      updateAddress(editingAddress, finalFormData);
    } else {
      addAddress(finalFormData);
    }

    setIsModalOpen(false);
  };

  const getAddressTypeIcon = (title: string) => {
    if (
      title.toLowerCase().includes("کار") ||
      title.toLowerCase().includes("شرکت") ||
      title.toLowerCase().includes("دفتر")
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
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
  };

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
          className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300 flex items-center"
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
                      {address.isDefault && (
                        <div className="absolute top-0 left-0 w-20 h-20 overflow-hidden">
                          <div className="bg-voxcina-blue dark:bg-secondary-200 text-white dark:text-voxcina-blue text-xs font-bold text-center transform rotate-45 translate-y-2 -translate-x-6 w-28 py-1 shadow-soft">
                            پیش‌فرض
                          </div>
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-secondary-200">
                          <span className="relative">
                            <span className="absolute -right-2 -top-2 w-8 h-8 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-10"></span>
                            {getAddressTypeIcon(address.title)}
                          </span>
                          {address.title}
                        </CardTitle>
                      </div>
                      <div className="flex space-x-2 space-x-reverse">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="text-voxcina-blue p-1.5 hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/20 rounded-full transition-colors"
                          onClick={() => handleEdit(address.id)}
                          aria-label="ویرایش آدرس"
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                          onClick={() => confirmDelete(address.id)}
                          aria-label="حذف آدرس"
                        >
                          <Trash className="w-4 h-4" />
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
                              className="mt-3 border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-secondary-200 hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20 w-full rounded-xl group overflow-hidden relative"
                              onClick={() => setDefaultAddress(address.id)}
                            >
                              <span className="absolute inset-0 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                              <CheckCircle className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <span className="relative z-10">تنظیم به عنوان آدرس پیش‌فرض</span>
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
                    className="sr-only"
                  />
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mr-2 transition-all duration-300 ${
                      formData.addressType === "home"
                        ? "border-voxcina-blue bg-voxcina-blue/5 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-200 scale-110"
                        : "border-secondary-200 text-voxcina-blue/40 dark:border-voxcina-darkBlue/30 dark:text-secondary-400"
                    }`}
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
                    className="sr-only"
                  />
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mr-2 transition-all duration-300 ${
                      formData.addressType === "work"
                        ? "border-voxcina-blue bg-voxcina-blue/5 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-200 scale-110"
                        : "border-secondary-200 text-voxcina-blue/40 dark:border-voxcina-darkBlue/30 dark:text-secondary-400"
                    }`}
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
              placeholder={
                formData.addressType === "home"
                  ? "مثال: خانه، منزل پدری"
                  : "مثال: دفتر، شرکت"
              }
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="نام"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
              />
              <Input
                label="نام خانوادگی"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
              />
            </div>

            <Input
              label="شماره تماس"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
              required
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1 text-voxcina-blue dark:text-secondary-200">استان</label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-secondary-200 dark:border-voxcina-darkBlue/30 bg-white dark:bg-voxcina-darkBlue/20 px-3 py-2 text-sm focus:outline-none focus:border-voxcina-blue focus:ring-2 focus:ring-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200"
                  required
                >
                  <option value="">انتخاب استان</option>
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="شهر"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
              />
            </div>

            <Input
              label="آدرس کامل"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="مثال: خیابان اصلی، کوچه فرعی، پلاک ۱۲، واحد ۳"
              required
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />

            <Input
              label="کد پستی"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰"
              required
              className="rounded-xl border-secondary-200 focus:border-voxcina-blue focus:ring-voxcina-blue/20"
            />

            <div className="flex items-center bg-gradient-to-r from-voxcina-blue/5 to-secondary-200/70 dark:from-voxcina-blue/10 dark:to-voxcina-blue/5 p-4 rounded-xl">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                className="ml-2 h-4 w-4 rounded border-secondary-300 text-voxcina-blue focus:ring-voxcina-blue/30"
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
                className="rounded-xl border-secondary-200 dark:border-voxcina-darkBlue/30 text-voxcina-blue dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-voxcina-darkBlue/20"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300"
              >
                {editingAddress ? "ویرایش آدرس" : "افزودن آدرس"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
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
              className="rounded-xl border-secondary-200 dark:border-voxcina-darkBlue/30 text-voxcina-blue dark:text-secondary-200"
            >
              انصراف
            </Button>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                variant="danger"
                onClick={handleDelete}
                className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
              >
                حذف آدرس
              </Button>
            </motion.div>
          </div>
        </div>
      </Modal>
    </div>
  );
}