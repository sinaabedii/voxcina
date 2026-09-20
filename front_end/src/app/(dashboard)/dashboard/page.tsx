"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardStore } from "@/store/dashboard-store";
import RecentOrders from "@/components/dashboard/RecentOrders";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import StatsGrid from "@/components/dashboard/StatsGrid";
import SectionHeader from "@/components/dashboard/ui/SectionHeader";
import PageTitle from "@/components/dashboard/ui/PageTitle";
import { staggerContainer, slideUpItem } from "@/lib/motion";

export default function DashboardPage() {
  const { user, getProfile, isLoading: userLoading } = useAuthStore();
  const { orders, fetchUserOrders } = useDashboardStore();
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      try {
        await Promise.all([getProfile(), fetchUserOrders()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [getProfile, fetchUserOrders]);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 9000);
    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(
    () => ({
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => ["pending", "processing", "shipping"].includes(o.status)).length,
      completedOrders: orders.filter((o) => o.status === "delivered").length,
      savedAddresses: user?.addresses?.length || 0,
    }),
    [orders, user?.addresses],
  );

  if (loading || userLoading) {
    return <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 text-center text-lg">در حال بارگذاری...</div>;
  }

  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 transition-all duration-500 ease-in-out">
      <PageTitle title="داشبورد شخصی" className="mb-8" />

      {showWelcome && <WelcomeBanner userName={user?.name?.split(" ")[0]} onDismiss={() => setShowWelcome(false)} />}

      <StatsGrid stats={stats} />

      <motion.section className="mb-8" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={slideUpItem} className="mb-4">
          <SectionHeader title="سفارشهای اخیر" icon={<Clock className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream/80" />} />
        </motion.div>
        <motion.div variants={slideUpItem}>
          <RecentOrders orders={orders} />
        </motion.div>
      </motion.section>
    </div>
  );
}
