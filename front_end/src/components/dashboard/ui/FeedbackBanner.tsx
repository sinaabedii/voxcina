"use client";

import { motion } from "framer-motion";
import { CheckCircle, AlertCircle } from "lucide-react";

interface FeedbackBannerProps {
  type: "success" | "error";
  message: string;
}

export default function FeedbackBanner({ type, message }: FeedbackBannerProps) {
  const isSuccess = type === "success";
  return (
    <motion.div
      className={`mb-6 p-4 rounded-xl flex items-center border ${
        isSuccess
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30"
          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30"
      }`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className={`p-2 rounded-full ml-3 flex-shrink-0 ${isSuccess ? "bg-green-100 dark:bg-green-800/30" : "bg-red-100 dark:bg-red-800/30"}`}>
        {isSuccess ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
      </div>
      <p className={isSuccess ? "text-voxcina-blue dark:text-green-400" : "text-voxcina-blue dark:text-red-400"}>{message}</p>
    </motion.div>
  );
}
