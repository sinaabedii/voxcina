"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, Sparkles, ArrowLeft } from "lucide-react";

const STORAGE_KEY = "voxcina_assistant_widget_dismissed";

export default function AssistantWidget() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Check if widget was previously dismissed
    const isDismissed = localStorage.getItem(STORAGE_KEY);
    if (!isDismissed) {
      // Show widget after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Close button - Outside card on mobile for better visibility */}
          <button
            onClick={handleDismiss}
            className="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-700 hover:bg-gray-600 border-2 border-white/80 flex items-center justify-center transition-colors z-20 shadow-lg"
            aria-label="بستن"
          >
            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" strokeWidth={3} />
          </button>

          <Link href="/assistant">
            <motion.div
              className="relative group cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Glow effect */}
              <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-voxcina-blue to-blue-400 rounded-xl sm:rounded-2xl blur-md sm:blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-300" />
              
              {/* Main Card */}
              <div className="relative bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xl border border-gray-100 overflow-hidden">
                {/* Content */}
                <div className="relative z-10 flex items-center gap-2 sm:gap-3">
                  {/* AI Icon */}
                  <motion.div
                    className="flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-voxcina-blue to-blue-600 flex items-center justify-center shadow-md"
                    animate={{ 
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </motion.div>

                  {/* Text - Compact on mobile */}
                  <div className="flex-1 min-w-0">
                    {/* Mobile: Single line */}
                    <div className="sm:hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-800">دستیار AI</span>
                        <span className="px-1.5 py-0.5 text-[8px] bg-voxcina-blue text-white rounded font-medium">جدید</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-[10px] text-voxcina-blue font-medium mt-0.5">
                        <span>امتحان کن</span>
                        <ArrowLeft className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    
                    {/* Desktop: Full content */}
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-voxcina-blue">جدید</span>
                        <span className="px-1.5 py-0.5 text-[9px] bg-voxcina-blue text-white rounded font-medium">
                          AI
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-gray-800 mb-0.5 leading-tight">
                        دستیار هوشمند ووکسا
                      </h3>
                      <p className="text-[10px] text-gray-500 leading-relaxed mb-1.5">
                        استایل شخصی‌تو پیدا کن!
                      </p>
                      
                      {/* CTA */}
                      <div className="flex items-center gap-1 text-[10px] text-voxcina-blue font-semibold group-hover:text-blue-600 transition-colors">
                        <span>همین الان امتحان کن</span>
                        <motion.div
                          animate={{ x: isHovered ? -3 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom decoration */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-blue-400" />
              </div>
            </motion.div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
