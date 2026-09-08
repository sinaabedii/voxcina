"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

interface WelcomeBannerProps {
  userName?: string;
  onDismiss: () => void;
}

export default function WelcomeBanner({ userName, onDismiss }: WelcomeBannerProps) {
  return (
    <motion.section className="mb-8" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}>
      <motion.div
        className="bg-gradient-to-r from-voxcina-cream to-voxcina-lightCream dark:from-voxcina-blue/10 dark:to-voxcina-blue/5 p-4 rounded-2xl border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm backdrop-blur-sm"
        animate={{
          boxShadow: ["0 4px 12px rgba(26, 60, 105, 0.1)", "0 4px 20px rgba(26, 60, 105, 0.15)", "0 4px 12px rgba(26, 60, 105, 0.1)"],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1 text-voxcina-blue dark:text-voxcina-cream">سلام {userName || "کاربر"} عزیز!</h2>
            <p className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/90">به داشبورد شخصی خود خوش آمدید. از اینجا میتوانید سفارشها، آدرسها و تنظیمات حساب خود را مدیریت کنید.</p>
            <motion.div className="flex gap-2 mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <Button variant="outline" size="sm" className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20">
                مشاهده سفارشها
              </Button>
              <Button variant="primary" size="sm" className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300">
                خرید جدید
              </Button>
            </motion.div>
          </div>
          <button onClick={onDismiss} className="text-voxcina-blue/60 hover:text-voxcina-blue dark:text-voxcina-cream/60 dark:hover:text-voxcina-cream transition-colors" aria-label="بستن">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
      </motion.div>
    </motion.section>
  );
}
