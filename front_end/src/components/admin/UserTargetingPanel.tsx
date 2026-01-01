"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Smartphone,
  ShoppingCart,
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TargetingCriteria, UserTargetingStats } from "@/types/discount";

interface UserTargetingPanelProps {
  criteria: TargetingCriteria;
  onChange: (criteria: TargetingCriteria) => void;
  stats?: UserTargetingStats | null;
  isLoadingStats?: boolean;
  onFetchStats?: () => void;
}

const UserTargetingPanel: React.FC<UserTargetingPanelProps> = ({
  criteria,
  onChange,
  stats,
  isLoadingStats = false,
  onFetchStats,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Mobile app filter
  const [mobileAppEnabled, setMobileAppEnabled] = useState(
    criteria.hasMobileApp !== undefined
  );
  const [mobileAppValue, setMobileAppValue] = useState<boolean>(
    criteria.hasMobileApp ?? true
  );

  // Purchase history filter
  const [purchaseHistoryEnabled, setPurchaseHistoryEnabled] = useState(
    criteria.minOrders !== undefined || criteria.maxOrders !== undefined
  );
  const [minOrders, setMinOrders] = useState<string>(
    criteria.minOrders?.toString() ?? ""
  );
  const [maxOrders, setMaxOrders] = useState<string>(
    criteria.maxOrders?.toString() ?? ""
  );
  const [firstTimeBuyersOnly, setFirstTimeBuyersOnly] = useState(
    criteria.maxOrders === 0
  );

  // Registration date filter
  const [registrationDateEnabled, setRegistrationDateEnabled] = useState(
    criteria.registeredAfter !== undefined || criteria.registeredBefore !== undefined
  );
  const [registeredAfter, setRegisteredAfter] = useState<string>(
    criteria.registeredAfter ?? ""
  );
  const [registeredBefore, setRegisteredBefore] = useState<string>(
    criteria.registeredBefore ?? ""
  );

  // Inactivity filter
  const [inactivityEnabled, setInactivityEnabled] = useState(
    criteria.inactiveDays !== undefined
  );
  const [inactiveDays, setInactiveDays] = useState<string>(
    criteria.inactiveDays?.toString() ?? "30"
  );

  // Update parent criteria when local state changes
  const updateCriteria = useCallback(() => {
    const newCriteria: TargetingCriteria = {};

    if (mobileAppEnabled) {
      newCriteria.hasMobileApp = mobileAppValue;
    }

    if (purchaseHistoryEnabled) {
      if (firstTimeBuyersOnly) {
        newCriteria.maxOrders = 0;
      } else {
        if (minOrders !== "") {
          newCriteria.minOrders = parseInt(minOrders, 10);
        }
        if (maxOrders !== "") {
          newCriteria.maxOrders = parseInt(maxOrders, 10);
        }
      }
    }

    if (registrationDateEnabled) {
      if (registeredAfter) {
        newCriteria.registeredAfter = registeredAfter;
      }
      if (registeredBefore) {
        newCriteria.registeredBefore = registeredBefore;
      }
    }

    if (inactivityEnabled && inactiveDays !== "") {
      newCriteria.inactiveDays = parseInt(inactiveDays, 10);
    }

    onChange(newCriteria);
  }, [
    mobileAppEnabled,
    mobileAppValue,
    purchaseHistoryEnabled,
    firstTimeBuyersOnly,
    minOrders,
    maxOrders,
    registrationDateEnabled,
    registeredAfter,
    registeredBefore,
    inactivityEnabled,
    inactiveDays,
    onChange,
  ]);

  // Debounced update
  useEffect(() => {
    const timer = setTimeout(() => {
      updateCriteria();
    }, 300);
    return () => clearTimeout(timer);
  }, [updateCriteria]);

  // Fetch stats when criteria changes
  useEffect(() => {
    if (onFetchStats) {
      const timer = setTimeout(() => {
        onFetchStats();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [criteria, onFetchStats]);

  const inputClasses =
    "bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50";

  const checkboxClasses =
    "rounded text-voxcina-blue focus:ring-voxcina-blue dark:focus:ring-voxcina-cream";

  return (
    <div className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-xl bg-white/90 dark:bg-voxcina-blue/10 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream" />
          <span className="font-medium text-voxcina-blue dark:text-voxcina-cream">
            معیارهای هدف‌گیری
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
        ) : (
          <ChevronDown className="w-5 h-5 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
        )}
      </button>

      {/* Content */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="p-4 pt-0 space-y-4">
          {/* Mobile App Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mobileAppEnabled"
                checked={mobileAppEnabled}
                onChange={(e) => setMobileAppEnabled(e.target.checked)}
                className={checkboxClasses}
              />
              <label
                htmlFor="mobileAppEnabled"
                className="flex items-center gap-2 text-sm font-medium text-voxcina-blue dark:text-voxcina-cream cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                کاربران اپلیکیشن موبایل
              </label>
            </div>
            {mobileAppEnabled && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mr-6 flex gap-4"
              >
                <label className="flex items-center gap-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer">
                  <input
                    type="radio"
                    name="mobileApp"
                    checked={mobileAppValue === true}
                    onChange={() => setMobileAppValue(true)}
                    className={checkboxClasses}
                  />
                  دارای اپلیکیشن
                </label>
                <label className="flex items-center gap-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer">
                  <input
                    type="radio"
                    name="mobileApp"
                    checked={mobileAppValue === false}
                    onChange={() => setMobileAppValue(false)}
                    className={checkboxClasses}
                  />
                  بدون اپلیکیشن
                </label>
              </motion.div>
            )}
          </div>

          {/* Purchase History Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="purchaseHistoryEnabled"
                checked={purchaseHistoryEnabled}
                onChange={(e) => setPurchaseHistoryEnabled(e.target.checked)}
                className={checkboxClasses}
              />
              <label
                htmlFor="purchaseHistoryEnabled"
                className="flex items-center gap-2 text-sm font-medium text-voxcina-blue dark:text-voxcina-cream cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                سابقه خرید
              </label>
            </div>
            {purchaseHistoryEnabled && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mr-6 space-y-3"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
                      حداقل سفارش:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minOrders}
                      onChange={(e) => setMinOrders(e.target.value)}
                      disabled={firstTimeBuyersOnly}
                      className={`${inputClasses} w-20 ${firstTimeBuyersOnly ? "opacity-50" : ""}`}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
                      حداکثر سفارش:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={maxOrders}
                      onChange={(e) => setMaxOrders(e.target.value)}
                      disabled={firstTimeBuyersOnly}
                      className={`${inputClasses} w-20 ${firstTimeBuyersOnly ? "opacity-50" : ""}`}
                      placeholder="∞"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={firstTimeBuyersOnly}
                    onChange={(e) => {
                      setFirstTimeBuyersOnly(e.target.checked);
                      if (e.target.checked) {
                        setMinOrders("");
                        setMaxOrders("");
                      }
                    }}
                    className={checkboxClasses}
                  />
                  فقط خریداران جدید (بدون سفارش)
                </label>
              </motion.div>
            )}
          </div>

          {/* Registration Date Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="registrationDateEnabled"
                checked={registrationDateEnabled}
                onChange={(e) => setRegistrationDateEnabled(e.target.checked)}
                className={checkboxClasses}
              />
              <label
                htmlFor="registrationDateEnabled"
                className="flex items-center gap-2 text-sm font-medium text-voxcina-blue dark:text-voxcina-cream cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                تاریخ عضویت
              </label>
            </div>
            {registrationDateEnabled && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mr-6 flex items-center gap-4"
              >
                <div className="flex items-center gap-2">
                  <label className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
                    از:
                  </label>
                  <input
                    type="date"
                    value={registeredAfter}
                    onChange={(e) => setRegisteredAfter(e.target.value)}
                    className={`${inputClasses} w-40`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
                    تا:
                  </label>
                  <input
                    type="date"
                    value={registeredBefore}
                    onChange={(e) => setRegisteredBefore(e.target.value)}
                    className={`${inputClasses} w-40`}
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Inactivity Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inactivityEnabled"
                checked={inactivityEnabled}
                onChange={(e) => setInactivityEnabled(e.target.checked)}
                className={checkboxClasses}
              />
              <label
                htmlFor="inactivityEnabled"
                className="flex items-center gap-2 text-sm font-medium text-voxcina-blue dark:text-voxcina-cream cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                کاربران غیرفعال
              </label>
            </div>
            {inactivityEnabled && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mr-6 flex items-center gap-2"
              >
                <label className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
                  کاربرانی که
                </label>
                <input
                  type="number"
                  min="1"
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(e.target.value)}
                  className={`${inputClasses} w-20`}
                  placeholder="30"
                />
                <label className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
                  روز وارد نشده‌اند
                </label>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserTargetingPanel;
