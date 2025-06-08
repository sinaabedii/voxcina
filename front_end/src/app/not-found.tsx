"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Home } from "lucide-react";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <div className="min-h-screen w-full bg-secondary-100 dark:bg-voxcina-darkBlue flex flex-col">
      <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
      <div className="container mx-auto px-4 py-12 flex-grow flex items-center justify-center">
        <motion.div 
          className="max-w-4xl w-full bg-white dark:bg-voxcina-blue/95 rounded-3xl shadow-soft dark:shadow-xl border border-border/10 dark:border-voxcina-blue/30 p-6 sm:p-10 md:p-12 lg:p-16 relative overflow-hidden"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/30 dark:bg-voxcina-blue/40 rounded-full -translate-y-24 translate-x-24 blur-md"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/30 dark:bg-voxcina-blue/40 rounded-full translate-y-24 -translate-x-24 blur-md"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.div 
              className="text-9xl md:text-[12rem] font-bold text-primary/10 dark:text-primary/20 select-none"
              variants={itemVariants}
            >
              404
            </motion.div>
            
            <motion.div 
              className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 -mt-20 sm:-mt-24 md:-mt-32 mb-6"
              variants={itemVariants}
            >
              <Image
                src="/images/Logo/BlueXTransparent.png"
                alt="وکسینا"
                fill
                className="object-contain dark:brightness-0 dark:invert"
                sizes="(max-width: 640px) 7rem, (max-width: 768px) 8rem, 10rem"
                priority
              />
            </motion.div>
            
            <motion.h1 
              className="text-xl sm:text-2xl md:text-3xl font-bold text-primary dark:text-secondary-100 mb-4"
              variants={itemVariants}
            >
              صفحه مورد نظر یافت نشد!
            </motion.h1>
            
            <motion.p 
              className="text-sm sm:text-base md:text-lg text-muted-foreground dark:text-secondary-100/70 mb-8 max-w-xl"
              variants={itemVariants}
            >
              متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا ممکن است حذف شده باشد. 
              می‌توانید به صفحه اصلی بازگردید یا از جستجو استفاده کنید.
            </motion.p>
            
            <motion.div 
              className="flex gap-4 justify-center"
              variants={itemVariants}
            >
              <Link 
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 h-11 px-4 sm:px-5 py-2.5 text-xs sm:text-sm"
              >
                <Home className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                صفحه اصلی
              </Link>
              
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-secondary hover:border-primary/20 text-foreground shadow-soft transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 h-11 px-4 sm:px-5 py-2.5 text-xs sm:text-sm"
              >
                <ChevronLeft className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                مشاهده محصولات
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 