"use client";

import React from "react";
import { CheckCircle, XCircle, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StockStatusProps {
  inStock: boolean;
  deliveryTime?: string;
  showNotifyButton?: boolean;
  isNotifyEnabled?: boolean;
  onNotifyClick?: () => void;
  className?: string;
}

const StockStatus: React.FC<StockStatusProps> = ({
  inStock,
  deliveryTime = "ارسال طی ۲-۳ روز کاری",
  showNotifyButton = true,
  isNotifyEnabled = false,
  onNotifyClick,
  className,
}) => {
  if (inStock) {
    return (
      <div className={cn("flex items-center text-green-600 dark:text-green-400", className)}>
        <CheckCircle className="h-5 w-5 ml-2" />
        <span className="font-medium">موجود در انبار</span>
        {deliveryTime && (
          <span className="text-xs text-muted-foreground mr-2 bg-secondary/50 px-2 py-1 rounded-lg">
            {deliveryTime}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="text-destructive font-medium flex items-center">
        <XCircle className="h-5 w-5 ml-2" />
        ناموجود
      </div>
      {showNotifyButton && onNotifyClick && (
        <motion.button
          type="button"
          className={cn(
            "text-sm px-3 py-1.5 rounded-xl transition-all flex items-center",
            isNotifyEnabled
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
          onClick={onNotifyClick}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {isNotifyEnabled ? (
            <>
              <CheckCircle className="h-4 w-4 ml-1" />
              به من اطلاع بده
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 ml-1" />
              موجود شد، خبرم کن
            </>
          )}
        </motion.button>
      )}
    </div>
  );
};

export default StockStatus;
