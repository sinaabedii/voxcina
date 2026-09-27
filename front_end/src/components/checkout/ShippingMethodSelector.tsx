"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, RefreshCw, AlertCircle } from "lucide-react";
import { useShippingStore } from "@/store/shipping-store";
import { ShippingMethod } from "@/services/shipping/types";
import { ShippingMethodsSkeleton } from "@/components/checkout/CheckoutSkeletons";
import SelectableRadioCard from "@/components/checkout/SelectableRadioCard";
import { formatPrice } from "@/lib/utils";

/**
 * Props for ShippingMethodSelector component
 * Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 7.1, 7.2, 7.3
 */
interface ShippingMethodSelectorProps {
  selectedAddressCityCode: number | null;
  cartItemCount: number;
  cartTotal: number;
  /** Total cart weight in grams (Σ item weight × quantity) */
  cartWeightGrams?: number;
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
  cartWeightGrams,
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
        totalWeight: cartWeightGrams,
      });
    } else {
      clearMethods();
    }
  }, [selectedAddressCityCode, cartItemCount, cartTotal, cartWeightGrams, fetchShippingQuotes, clearMethods]);

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
        totalWeight: cartWeightGrams,
      });
    }
  };


  // Loading state (Requirement: 7.3)
  if (isLoading) {
    return <ShippingMethodsSkeleton />;
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
      <div className="space-y-3 md:space-y-4">
        {shippingMethods.map((method, index) => (
          <motion.div
            key={method.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <SelectableRadioCard
              selected={selectedMethodId === method.id}
              onSelect={() => onSelectMethod(method)}
              radioId={`shipping-${method.id}`}
              radioName="shipping-method"
              leading={
                method.courierLogo ? (
                  <img
                    src={method.courierLogo}
                    alt={method.courierName}
                    className="h-8 w-8 shrink-0 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : undefined
              }
              title={method.courierName}
              description={method.serviceName}
              meta={
                <span
                  className={`font-bold ${
                    selectedMethodId === method.id
                      ? "text-voxcina-blue dark:text-voxcina-cream"
                      : "text-voxcina-blue/70 dark:text-voxcina-cream/70"
                  }`}
                >
                  {formatPrice(method.price)}
                </span>
              }
              body={
                <div className="mr-7 flex items-start text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                  <Truck className="ml-2 mt-0.5 h-4 w-4 flex-shrink-0 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                  <p>{method.slaDays}</p>
                </div>
              }
            />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}
