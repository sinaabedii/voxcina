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
import { motion } from "framer-motion";

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
    <div className="container py-8 md:py-12">
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold mb-4 sm:mb-0 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          آدرس‌های من
        </h1>
        <Button
          variant="primary"
          onClick={handleAddNew}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 ml-2" />
          افزودن آدرس جدید
        </Button>
      </motion.div>

      {isLoading ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="relative w-12 h-12 mb-4">
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-indigo-200 dark:border-indigo-900 rounded-full animate-ping"></div>
                  <div className="absolute top-0 right-0 w-full h-full border-4 border-t-indigo-500 dark:border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-500 dark:text-gray-400">
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
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <MapPin className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                هنوز آدرسی ثبت نکرده‌اید
              </h3>
              <p className="text-muted-foreground mb-6">
                برای ثبت سفارش نیاز به حداقل یک آدرس دارید
              </p>
              <Button
                variant="primary"
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                onClick={handleAddNew}
              >
                <Plus className="w-4 h-4 ml-2" />
                افزودن آدرس جدید
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {addresses.map((address) => (
            <motion.div key={address.id} variants={itemVariants}>
              <Card
                className={`border-0 shadow-md hover:shadow-lg transition-all overflow-hidden ${
                  address.isDefault
                    ? "bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30"
                    : ""
                }`}
              >
                <CardHeader className="pb-2 flex flex-row justify-between items-start relative">
                  {address.isDefault && (
                    <div className="absolute top-0 left-0 w-16 h-16 overflow-hidden">
                      <div className="bg-indigo-500 text-white text-xs font-bold text-center transform rotate-45 translate-y-2 -translate-x-6 w-24 py-1">
                        پیش‌فرض
                      </div>
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      {getAddressTypeIcon(address.title)}
                      {address.title}
                    </CardTitle>
                  </div>
                  <div className="flex space-x-2 space-x-reverse">
                    <button
                      className="text-indigo-500 p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
                      onClick={() => handleEdit(address.id)}
                      aria-label="ویرایش آدرس"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="text-red-500 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                      onClick={() => confirmDelete(address.id)}
                      aria-label="حذف آدرس"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-2">
                    <p className="font-medium">
                      {address.firstName} {address.lastName}
                    </p>

                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 ml-2 flex-shrink-0" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {address.province}، {address.city}، {address.address}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          کد پستی:
                        </span>
                        <span className="font-mono mr-1 tracking-wide">
                          {address.postalCode}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          شماره تماس:
                        </span>
                        <span className="font-mono mr-1 tracking-wide ltr">
                          {address.phoneNumber}
                        </span>
                      </div>
                    </div>

                    {!address.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 w-full rounded-xl group"
                        onClick={() => setDefaultAddress(address.id)}
                      >
                        <CheckCircle className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        تنظیم به عنوان آدرس پیش‌فرض
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddress ? "ویرایش آدرس" : "افزودن آدرس جدید"}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium mb-1">نوع آدرس</label>
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
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mr-2 ${
                      formData.addressType === "home"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30"
                        : "border-gray-200 text-gray-400 dark:border-gray-700"
                    }`}
                  >
                    <Home className="w-5 h-5" />
                  </div>
                  <span>خانه</span>
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
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mr-2 ${
                      formData.addressType === "work"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30"
                        : "border-gray-200 text-gray-400 dark:border-gray-700"
                    }`}
                  >
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span>محل کار</span>
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
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="نام"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              <Input
                label="نام خانوادگی"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <Input
              label="شماره تماس"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">استان</label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
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
              />
            </div>

            <Input
              label="آدرس کامل"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="مثال: خیابان اصلی، کوچه فرعی، پلاک ۱۲، واحد ۳"
              required
            />

            <Input
              label="کد پستی"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰"
              required
            />

            <div className="flex items-center bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                className="ml-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="isDefault"
                className="text-sm text-indigo-700 dark:text-indigo-300"
              >
                تنظیم به عنوان آدرس پیش‌فرض
              </label>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
        <div className="p-2">
          <div className="flex items-start mb-4">
            <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full ml-4 flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                آیا از حذف این آدرس مطمئن هستید؟
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                این عمل قابل بازگشت نیست و آدرس به طور کامل حذف خواهد شد.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="rounded-xl"
            >
              انصراف
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              className="rounded-xl"
            >
              حذف آدرس
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
