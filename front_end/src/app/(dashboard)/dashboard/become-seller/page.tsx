"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Store, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useStoreStore } from "@/store/store-store";
import { useAuthStore } from "@/store/auth-store";
import { StoreRegistrationData } from "@/types/store";

export default function BecomeSellerPage() {
  const router = useRouter();
  const { user, getProfile } = useAuthStore();
  const { checkCanBecomeSeller, registerStore, isLoading, canBecomeSeller } = useStoreStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<StoreRegistrationData>({
    name: "",
    description: "",
    phone: "",
    email: user?.email || "",
    province: "",
    city: "",
    address: "",
    postal_code: "",
    bank_name: "",
    account_number: "",
    iban: "",
    account_holder: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);

  useEffect(() => {
    checkCanBecomeSeller();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: StoreRegistrationData = {
        ...formData,
        logo: logo || undefined,
        banner: banner || undefined,
      };
      await registerStore(data);
      await getProfile(); // Refresh user data to get new role
      router.push("/dashboard/seller");
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  if (canBecomeSeller === false) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-yellow-700 dark:text-yellow-400 mb-2">
            شما قبلاً فروشنده هستید
          </h2>
          <p className="text-yellow-600 dark:text-yellow-500 mb-4">
            برای مدیریت فروشگاه خود به پنل فروشندگی مراجعه کنید.
          </p>
          <button
            onClick={() => router.push("/dashboard/seller")}
            className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            رفتن به پنل فروشندگی
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-voxcina-blue/50 rounded-2xl shadow-lg p-6 md:p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
            فروشنده شوید
          </h1>
          <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
            فروشگاه خود را ایجاد کنید و محصولاتتان را به فروش برسانید
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                }`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 ${
                    step > s ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Store Info */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream mb-4">
                اطلاعات فروشگاه
              </h2>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نام فروشگاه *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="نام فروشگاه شما"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  توضیحات فروشگاه
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="درباره فروشگاه خود بنویسید..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    تلفن *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    ایمیل *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                مرحله بعد
              </button>
            </motion.div>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream mb-4">
                آدرس فروشگاه
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    استان *
                  </label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    شهر *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  آدرس کامل *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  کد پستی *
                </label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-voxcina-blue dark:text-voxcina-cream rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-voxcina-blue/30 transition-colors"
                >
                  مرحله قبل
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  مرحله بعد
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Bank Info */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream mb-4">
                اطلاعات بانکی
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    نام بانک *
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    شماره حساب *
                  </label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  شماره شبا (IBAN) *
                </label>
                <input
                  type="text"
                  name="iban"
                  value={formData.iban}
                  onChange={handleInputChange}
                  required
                  placeholder="IR..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نام صاحب حساب *
                </label>
                <input
                  type="text"
                  name="account_holder"
                  value={formData.account_holder}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-voxcina-blue dark:text-voxcina-cream rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-voxcina-blue/30 transition-colors"
                >
                  مرحله قبل
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      در حال ثبت...
                    </>
                  ) : (
                    "ثبت فروشگاه"
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
