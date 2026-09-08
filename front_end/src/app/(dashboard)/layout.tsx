"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { localStorageManager } from "@/lib/local-storage-manager";
import Sidebar from "@/components/layout/Sidebar";
import DashboardHeader from "@/components/layout/dashboard/DashboardHeader";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthorized } = useProtectedRoute({ requiredAuth: true, requiredRole: "customer" });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      const returnUrl = localStorageManager.consumeReturnUrl();
      if (returnUrl && returnUrl !== "/dashboard" && !returnUrl.startsWith("/sign-")) {
        router.push(returnUrl);
      }
    }
  }, [isAuthorized, router]);

  useEffect(() => {
    const handleRouteChange = () => setIsMobileSidebarOpen(false);
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-voxcina-blue/95 transition-all duration-300">
        <div className="text-center">
          <div className="inline-block relative w-16 h-16 mb-4">
            <div className="absolute inset-0 w-full h-full border-4 border-voxcina-cream/30 dark:border-voxcina-cream/10 rounded-full animate-pulse-soft" />
            <div className="absolute inset-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
          <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">در حال بررسی وضعیت ورود...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-voxcina-blue/95 transition-all duration-300">
      <DashboardHeader isMobileSidebarOpen={isMobileSidebarOpen} onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

      <div className="flex flex-1 relative">
        {/* Mobile overlay */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              <motion.div className="fixed inset-0 bg-voxcina-blue/30 backdrop-blur-sm z-40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileSidebarOpen(false)} />
              <motion.div
                className="fixed inset-y-0 right-0 w-72 bg-white/90 dark:bg-voxcina-blue/90 z-50 md:hidden border-l border-voxcina-cream/30 dark:border-voxcina-blue/50 backdrop-blur-sm shadow-lg"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
              >
                <div className="p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 flex items-center justify-between">
                  <Image src="/images/Logo/BlueXTransparent.png" alt="Voxcina" width={110} height={36} className="h-7 w-auto" />
                  <motion.button className="p-2 text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream rounded-full hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-colors" onClick={() => setIsMobileSidebarOpen(false)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <X size={18} />
                  </motion.button>
                </div>
                <Sidebar embedded />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="hidden md:block w-72 h-full sticky top-16 border-l border-voxcina-cream/30 dark:border-voxcina-blue/30 py-6 bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm">
          <Sidebar embedded />
        </div>

        <motion.main className="flex-grow p-4 md:p-6 lg:p-8 overflow-x-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="container mx-auto">{children}</div>
        </motion.main>
      </div>
    </div>
  );
}
