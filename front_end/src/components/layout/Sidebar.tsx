"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import SidebarNav from "./SidebarNav";

const sidebarVariants = {
  hidden: { x: "-100%" },
  visible: { x: 0, transition: { type: "spring" as const, damping: 25, stiffness: 300 } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export default function Sidebar({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (embedded) {
    return (
      <div className="py-4 px-4">
        <nav className="space-y-2">
          <SidebarNav pathname={pathname} onLogout={handleLogout} variant="compact" />
        </nav>
      </div>
    );
  }

  return (
    <>
      {/* Mobile trigger */}
      <div className="lg:hidden fixed top-24 sm:top-28 right-4 z-30">
        <motion.button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2.5 sm:p-3 rounded-xl bg-white/95 dark:bg-voxcina-blue/95 backdrop-blur-sm border border-voxcina-cream/30 dark:border-voxcina-blue/30 shadow-lg text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Desktop */}
      <aside className="hidden lg:block w-full min-h-screen sticky top-4 bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm rounded-2xl border border-voxcina-cream/20 dark:border-voxcina-blue/20 shadow-md overflow-hidden">
        <div className="py-6 px-4 h-full min-h-[calc(100vh-2rem)]">
          <div className="px-4 mb-6">
            <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">حساب کاربری</h2>
            <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-1">مدیریت اطلاعات و سفارش‌ها</p>
          </div>
          <nav className="space-y-2 flex-1">
            <SidebarNav pathname={pathname} onLogout={handleLogout} variant="default" />
          </nav>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
            <motion.div className="fixed inset-0 bg-voxcina-blue/30 backdrop-blur-sm" initial="hidden" animate="visible" exit="hidden" variants={backdropVariants} onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div
              className="fixed inset-y-0 right-0 w-4/5 max-w-xs bg-white/98 dark:bg-voxcina-blue/98 shadow-xl border-l border-voxcina-cream/30 dark:border-voxcina-blue/50 backdrop-blur-md flex flex-col"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={sidebarVariants}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 bg-white/90 dark:bg-voxcina-blue/90 backdrop-blur-sm">
                <h2 className="text-base font-bold text-voxcina-blue dark:text-voxcina-cream">حساب کاربری</h2>
                <motion.button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream hover:bg-voxcina-cream/30 dark:hover:bg-voxcina-blue/30 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
              <div className="flex-1 py-4 px-4 overflow-y-auto bg-white/95 dark:bg-voxcina-blue/95">
                <nav className="space-y-2 h-full">
                  <SidebarNav pathname={pathname} onNavigate={() => setIsMobileMenuOpen(false)} onLogout={() => { handleLogout(); setIsMobileMenuOpen(false); }} variant="compact" />
                </nav>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
