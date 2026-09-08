"use client";

import { motion } from "framer-motion";
import { Package, MapPin, Calendar } from "lucide-react";
import StatCard from "./ui/StatCard";
import SectionHeader from "./ui/SectionHeader";
import { staggerContainer, slideUpItem } from "@/lib/motion";
import { BadgeCheck } from "lucide-react";

interface StatsGridProps {
  stats: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    savedAddresses: number;
  };
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <motion.section className="mb-8" variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={slideUpItem}>
        <SectionHeader title="آمار کلی" icon={<BadgeCheck className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80" />} className="mb-4" />
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <motion.div variants={slideUpItem} whileHover={{ y: -5 }} transition={{ duration: 0.3 }}>
          <StatCard title="سفارشها" icon={<Package className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80" />} value={stats.totalOrders} subtitle={`${stats.pendingOrders} سفارش در انتظار ارسال`} href="/dashboard/orders" ariaLabel="مشاهده سفارشها" />
        </motion.div>

        <motion.div variants={slideUpItem} whileHover={{ y: -5 }} transition={{ duration: 0.3 }}>
          <StatCard title="آدرسها" icon={<MapPin className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80" />} value={stats.savedAddresses} subtitle="آدرس ذخیره شده" href="/dashboard/addresses" ariaLabel="مدیریت آدرسها" />
        </motion.div>

        <motion.div variants={slideUpItem} whileHover={{ y: -5 }} transition={{ duration: 0.3 }}>
          <StatCard title="تحویل شدهها" icon={<Calendar className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80" />} value={stats.completedOrders} subtitle="سفارش تکمیل شده" href="/dashboard/orders?status=delivered" ariaLabel="مشاهده سفارشهای تحویل شده" />
        </motion.div>
      </div>
    </motion.section>
  );
}
