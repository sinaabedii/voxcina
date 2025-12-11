"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Store, Save, Loader2, MapPin, Phone, Mail, Building2 } from "lucide-react";
import { useStoreStore } from "@/store/store-store";
import { useAuthStore } from "@/store/auth-store";
import { StoreUpdateData } from "@/types/store";

export default function StoreSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { myStore, fetchMyStore, updateMyStore, isLoading } = useStoreStore();
  const [formData, setFormData] = useState<StoreUpdateData>({});

  useEffect(() => {
    if (user?.role !== "seller") {
      router.push("/dashboard/become-seller");
      return;
    }
    fetchMyStore();
  }, [user]);

  useEffect(() => {
    if (myStore) {
      setFormData({
        name: myStore.name,
        description: myStore.description,
        phone: myStore.phone,
        email: myStore.email,
        address: myStore.address,
        bank_info: myStore.bank_info,
      });
    }
  }, [myStore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMyStore(formData);
    } catch (error) {
      console.error("Failed to update store:", error);
    }
  };

  if (isLoading || !myStore) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
          تنظیمات فروشگاه
        </h1>
        <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
          اطلاعات فروشگاه خود را مدیریت کنید
        </p>
      </div>

      {/* Store Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl ${
          myStore.status === "approved"
            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            : myStore.status === "pending"
            ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
            : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        }`}
      >
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6" />
          <div>
            <p className="font-semibold">
              وضعیت فروشگاه:{" "}
              {myStore.status === "approved"
                ? "تایید شده"
                : myStore.status === "pending"
                ? "در انتظار تایید"
                : "رد شده"}
            </p>
            {myStore.status === "pending" && (
              <p className="text-sm opacity-80">
                فروشگاه شما در حال بررسی توسط ادمین است
              </p>
            )}
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-voxcina-blue/50 rounded-xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream mb-4 flex items-center gap-2">
            <Store className="w-5 h-5" />
            اطلاعات اصلی
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                نام فروشگاه
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                توضیحات
              </label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  تلفن
                </label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  ایمیل
                </label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Address */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-voxcina-blue/50 rounded-xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            آدرس
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  استان
                </label>
                <input
                  type="text"
                  value={formData.address?.province || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address!, province: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  شهر
                </label>
                <input
                  type="text"
                  value={formData.address?.city || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address!, city: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                آدرس کامل
              </label>
              <textarea
                value={formData.address?.address || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address!, address: e.target.value },
                  })
                }
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                کد پستی
              </label>
              <input
                type="text"
                value={formData.address?.postal_code || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address!, postal_code: e.target.value },
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </motion.div>

        {/* Bank Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-voxcina-blue/50 rounded-xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            اطلاعات بانکی
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نام بانک
                </label>
                <input
                  type="text"
                  value={formData.bank_info?.bank_name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bank_info: { ...formData.bank_info!, bank_name: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  شماره حساب
                </label>
                <input
                  type="text"
                  value={formData.bank_info?.account_number || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bank_info: { ...formData.bank_info!, account_number: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                شماره شبا (IBAN)
              </label>
              <input
                type="text"
                value={formData.bank_info?.iban || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bank_info: { ...formData.bank_info!, iban: e.target.value },
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                نام صاحب حساب
              </label>
              <input
                type="text"
                value={formData.bank_info?.account_holder || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bank_info: { ...formData.bank_info!, account_holder: e.target.value },
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </motion.div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              در حال ذخیره...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              ذخیره تغییرات
            </>
          )}
        </button>
      </form>
    </div>
  );
}
