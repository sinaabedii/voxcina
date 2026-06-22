"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Check, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { useShippingStore } from "@/store/shipping-store";
import { ShippingMethod } from "@/services/shipping/types";
import { formatPrice } from "@/lib/utils";

/**
 * Props for ShippingMethodSelector component
 * Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 7.1, 7.2, 7.3
 */
interface ShippingMethodSelectorProps {
  selectedAddressCityCode: number | null;
  cartItemCount: number;
  cartTotal: number;
  onSelectMethod: (method: ShippingMethod) => void;
  selectedMethodId?: string;
}

/**
 * ShippingMethodSelector Component
 * Displays available shipping methods fetched from Postex API
 * and allows users to select their preferred shipping option.
 * 
 * Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 7.1, 7.2, 7.3
 */
export default function ShippingMethodSelector({
  selectedAddressCityCode,
  cartItemCount,
  cartTotal,
  onSelectMethod,
  selectedMethodId,
}: ShippingMethodSelectorProps) {
  const { 
    shippingMethods, 
    isLoading, 
    error, 
    fetchShippingQuotes,
    clearMethods,
  } = useShippingStore();

  // Fetch shipping quotes when city code changes (Requirements: 7.1, 7.2)
  useEffect(() => {
    if (selectedAddressCityCode && cartItemCount > 0) {
      fetchShippingQuotes({
        toCityCode: selectedAddressCityCode,
        itemCount: cartItemCount,
        totalValue: cartTotal,
      });
    } else {
      clearMethods();
    }
  }, [selectedAddressCityCode, cartItemCount, cartTotal, fetchShippingQuotes, clearMethods]);

  // Auto-select first method when methods are loaded
  useEffect(() => {
    if (shippingMethods.length > 0 && !selectedMethodId) {
      onSelectMethod(shippingMethods[0]);
    }
  }, [shippingMethods, selectedMethodId, onSelectMethod]);

  const handleRetry = () => {
    if (selectedAddressCityCode && cartItemCount > 0) {
      fetchShippingQuotes({
        toCityCode: selectedAddressCityCode,
        itemCount: cartItemCount,
        totalValue: cartTotal,
      });
    }
  };


  // Loading state (Requirement: 7.3)
  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative w-12 h-12 mb-4">
            <div className="absolute top-0 right-0 w-full h-full border-4 border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-full animate-pulse-soft"></div>
            <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-secondary-200 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <Truck className="absolute inset-0 m-auto w-5 h-5 text-voxcina-blue/40 dark:text-secondary-200/40" />
          </div>
          <p className="text-voxcina-blue/70 dark:text-secondary-200/70 font-medium">
            در حال دریافت روش‌های ارسال...
          </p>
        </div>
      </div>
    );
  }

  // Error state with retry button (Requirement: 1.5)
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-6 text-center"
      >
        <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400 mx-auto mb-3" />
        <h3 className="font-medium text-red-800 dark:text-red-400 mb-2">
          خطا در دریافت روش‌های ارسال
        </h3>
        <p className="text-sm text-red-700 dark:text-red-500 mb-4">
          {error}
        </p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          <RefreshCw className="w-4 h-4 ml-2" />
          تلاش مجدد
        </button>
      </motion.div>
    );
  }

  // No city code selected
  if (!selectedAddressCityCode) {
    return (
      <div className="text-center py-8 text-voxcina-blue/60 dark:text-secondary-300/60">
        <Truck className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>برای مشاهده روش‌های ارسال، ابتدا آدرس تحویل را انتخاب کنید</p>
      </div>
    );
  }

  // No shipping methods available
  if (shippingMethods.length === 0) {
    return (
      <div className="text-center py-8 text-voxcina-blue/60 dark:text-secondary-300/60">
        <Truck className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>روش ارسالی برای این مقصد یافت نشد</p>
        <button
          onClick={handleRetry}
          className="mt-4 inline-flex items-center px-4 py-2 bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-cream/10 dark:text-voxcina-cream rounded-lg hover:bg-voxcina-blue/20 dark:hover:bg-voxcina-cream/20 transition-colors"
        >
          <RefreshCw className="w-4 h-4 ml-2" />
          تلاش مجدد
        </button>
      </div>
    );
  }

  // Render shipping methods (Requirements: 1.2, 5.1, 5.2, 5.3)
  return (
    <AnimatePresence>
      <div className="space-y-4">
        {shippingMethods.map((method, index) => (
          <motion.div
            key={method.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 ${
              selectedMethodId === method.id
                ? "border-voxcina-blue dark:border-voxcina-cream/70 bg-voxcina-cream/30 dark:bg-voxcina-blue/20 shadow-sm"
                : "border-voxcina-cream/30 dark:border-voxcina-blue/30 hover:border-voxcina-blue/50 dark:hover:border-voxcina-cream/30 hover:shadow-sm"
            }`}
            onClick={() => onSelectMethod(method)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="relative flex items-center">
                  <input
                    type="radio"
                    id={`shipping-${method.id}`}
                    name="shipping-method"
                    checked={selectedMethodId === method.id}
                    onChange={() => onSelectMethod(method)}
                    className="w-5 h-5 opacity-0 absolute"
                  />
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ml-2 transition-all duration-200 ${
                      selectedMethodId === method.id
                        ? "border-voxcina-blue dark:border-voxcina-cream bg-voxcina-blue dark:bg-voxcina-cream text-white dark:text-voxcina-blue"
                        : "border-voxcina-blue/30 dark:border-voxcina-cream/30"
                    }`}
                  >
                    {selectedMethodId === method.id && (
                      <Check className="w-3 h-3" />
                    )}
                  </div>
                  
                  {/* Courier Logo */}
                  {method.courierLogo && (
                    <img
                      src={method.courierLogo}
                      alt={method.courierName}
                      className="w-8 h-8 object-contain ml-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  
                  <div className="flex flex-col">
                    <label
                      htmlFor={`shipping-${method.id}`}
                      className="font-medium cursor-pointer text-voxcina-blue dark:text-voxcina-cream"
                    >
                      {method.courierName}
                    </label>
                    <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      {method.serviceName}
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={`font-bold ${
                  selectedMethodId === method.id
                    ? "text-voxcina-blue dark:text-voxcina-cream"
                    : "text-voxcina-blue/70 dark:text-voxcina-cream/70"
                }`}
              >
                {formatPrice(method.price)}
              </span>
            </div>
            
            {/* SLA / Delivery Time (Requirement: 5.2) */}
            <div className="flex mt-3 mr-10 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 items-start">
              <Truck className="h-4 w-4 text-voxcina-blue/50 dark:text-voxcina-cream/50 mt-0.5 ml-2 flex-shrink-0" />
              <p>{method.slaDays}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}
