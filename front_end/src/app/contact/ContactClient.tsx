"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
  CheckCircle,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type MapInstance = {
  remove: () => void;
} | null;

const MapComponent = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapInstance>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      mapRef.current &&
      !mapInstanceRef.current
    ) {
      import("leaflet")
        .then((L: any) => {
          if (!mapRef.current) return;

          try {
            const map = L.map(mapRef.current).setView(
              [35.762843063507674, 51.46413943689942],
              15
            );

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(map);

            const customIcon = L.divIcon({
              className: "custom-marker",
              html: `
              <div style="
                background: #1e40af;
                width: 30px;
                height: 30px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="
                  background: white;
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  transform: rotate(45deg);
                "></div>
              </div>
            `,
              iconSize: [30, 30],
              iconAnchor: [15, 30],
              popupAnchor: [0, -30],
            });

            const marker = L.marker([35.762843063507674, 51.46413943689942], {
              icon: customIcon,
            }).addTo(map);

            marker.bindPopup(`
            <div style="text-align: center; font-family: 'Vazir', sans-serif; direction: rtl;">
              <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px;">دفتر مرکزی Voxcina</h3>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">تهران، پاسداران</p>
            </div>
          `);

            mapInstanceRef.current = map;
          } catch (error) {
            console.error("Error initializing map:", error);
          }
        })
        .catch((error) => {
          console.error("Error loading Leaflet:", error);
        });
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (error) {
          console.error("Error cleaning up map:", error);
        }
      }
    };
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <div
        ref={mapRef}
        className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden"
        style={{ minHeight: "384px" }}
      />
    </>
  );
};

export default function ContactClient() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [formStatus, setFormStatus] = useState<{
    submitted: boolean;
    success: boolean;
    message: string;
  } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      setFormStatus({
        submitted: true,
        success: false,
        message: "لطفاً تمام فیلدهای الزامی را پر کنید.",
      });
      return;
    }

    setTimeout(() => {
      setFormStatus({
        submitted: true,
        success: true,
        message:
          "پیام شما با موفقیت ارسال شد. به زودی با شما تماس خواهیم گرفت.",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });

      setTimeout(() => {
        setFormStatus(null);
      }, 5000);
    }, 1000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
  };

  return (
    <>
      <Header />

      <div className="min-h-screen max-w-6xl mx-auto  dark:bg-voxcina-darkBlue/90">
        <div className="relative overflow-hidden bg-transparent">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 20, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute -top-32 -right-32 w-64 h-64 border border-voxcina-blue/10 rounded-full"
            />
            <motion.div
              animate={{ 
                rotate: [360, 0],
                x: [0, 20, 0],
                y: [0, -10, 0]
              }}
              transition={{ 
                duration: 15, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute bottom-20 left-10 w-16 h-16 bg-gradient-to-br from-voxcina-blue/20 to-voxcina-darkBlue/20 transform rotate-45"
            />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-16 sm:py-20 md:py-24 lg:py-32 max-w-7xl">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-16 items-center">
                <div className="lg:col-span-7 order-2 lg:order-1">
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    <span className="inline-block text-xs sm:text-sm text-voxcina-blue/70 dark:text-secondary-200/70 font-medium tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-4 sm:mb-6 relative">
                      <span className="relative z-10">Voxcina</span>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="absolute bottom-0 left-0 h-px bg-voxcina-blue/50"
                      />
                    </span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-bold text-voxcina-darkBlue dark:text-white mb-4 sm:mb-6 md:mb-8 leading-none"
                  >
                    <span className="block">تماس</span>
                    <span className="block text-voxcina-blue relative">
                      با ما
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 1, delay: 1 }}
                        className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-1 sm:h-2 bg-voxcina-blue/20 origin-left"
                      />
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-secondary-200/80 leading-relaxed max-w-2xl"
                  >
                    جایی که
                    <span className="text-voxcina-blue font-semibold"> ارتباط </span>
                    به
                    <span className="text-voxcina-blue font-semibold"> همکاری </span>
                    تبدیل می‌شود
                  </motion.p>
                </div>

                <div className="lg:col-span-5 order-1 lg:order-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="relative"
                  >
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 mx-auto">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-dashed border-voxcina-blue/30"
                      />
                      
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-2 sm:inset-3 md:inset-4 rounded-full border border-voxcina-blue/50"
                      />
                      
                      <div className="absolute inset-8 sm:inset-10 md:inset-12 lg:inset-14 xl:inset-16 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue rounded-full flex items-center justify-center shadow-2xl">
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 180, 360]
                          }}
                          transition={{ 
                            duration: 8, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white"
                        >
                          V
                        </motion.div>
                      </div>

                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.25,
                            ease: "easeInOut"
                          }}
                          className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-voxcina-blue rounded-full"
                          style={{
                            top: `${50 + 40 * Math.sin((i * Math.PI) / 4)}%`,
                            left: `${50 + 40 * Math.cos((i * Math.PI) / 4)}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.5, delay: 1.2 }}
            className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-voxcina-blue/30 to-transparent origin-center"
          />
        </div>

        <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative bg-transparent">
          <div className="container mx-auto px-4 max-w-7xl">
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <motion.div
                className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-voxcina-blue/10 relative overflow-hidden group hover:bg-white/80 dark:hover:bg-voxcina-blue/10 transition-all duration-500 hover:scale-105"
                variants={itemVariants}
              >
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-8 sm:-mt-10 md:-mt-12 -mr-8 sm:-mr-10 md:-mr-12 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue text-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 relative z-10 shadow-lg">
                  <Phone className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                </div>

                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-5 text-voxcina-blue dark:text-white text-center relative z-10">
                  تلفن تماس
                </h3>

                <div className="space-y-3 sm:space-y-4 relative z-10">
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-secondary-300 mb-1 font-medium">
                      پشتیبانی فروش:
                    </p>
                    <p className="text-sm sm:text-base text-voxcina-blue dark:text-secondary-200 font-bold ltr py-1 px-3 sm:px-4 bg-white/70 dark:bg-voxcina-blue/20 rounded-lg sm:rounded-xl inline-block">
                      021-22325653
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-secondary-300 mb-1 font-medium">
                      پشتیبانی فنی:
                    </p>
                    <p className="text-sm sm:text-base text-voxcina-blue dark:text-secondary-200 font-bold ltr py-1 px-3 sm:px-4 bg-white/70 dark:bg-voxcina-blue/20 rounded-lg sm:rounded-xl inline-block">
                      021-22325653
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-voxcina-blue/10 relative overflow-hidden group hover:bg-white/80 dark:hover:bg-voxcina-blue/10 transition-all duration-500 hover:scale-105 lg:transform lg:translate-y-4 xl:translate-y-8"
                variants={itemVariants}
              >
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-voxcina-darkBlue/5 dark:bg-voxcina-darkBlue/10 rounded-full -mt-8 sm:-mt-10 md:-mt-12 -mr-8 sm:-mr-10 md:-mr-12 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-voxcina-darkBlue to-voxcina-blue text-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 relative z-10 shadow-lg">
                  <Mail className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                </div>

                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-5 text-voxcina-darkBlue dark:text-white text-center relative z-10">
                  ایمیل
                </h3>

                <div className="space-y-3 sm:space-y-4 relative z-10">
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-secondary-300 mb-1 font-medium">
                      فروش و سفارشات:
                    </p>
                    <p className="text-sm sm:text-base text-voxcina-blue dark:text-secondary-200 font-bold py-1 px-3 sm:px-4 bg-white/70 dark:bg-voxcina-blue/20 rounded-lg sm:rounded-xl inline-block">
                      info@voxcina.com
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-secondary-300 mb-1 font-medium">
                      پشتیبانی مشتریان:
                    </p>
                    <p className="text-sm sm:text-base text-voxcina-blue dark:text-secondary-200 font-bold py-1 px-3 sm:px-4 bg-white/70 dark:bg-voxcina-blue/20 rounded-lg sm:rounded-xl inline-block">
                      support@voxcina.com
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-voxcina-blue/10 relative overflow-hidden group hover:bg-white/80 dark:hover:bg-voxcina-blue/10 transition-all duration-500 hover:scale-105 sm:col-span-2 lg:col-span-1"
                variants={itemVariants}
              >
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-secondary-200/20 rounded-full -mt-8 sm:-mt-10 md:-mt-12 -mr-8 sm:-mr-10 md:-mr-12 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-secondary-600 to-secondary-400 text-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 relative z-10 shadow-lg">
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                </div>

                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-5 text-secondary-600 dark:text-white text-center relative z-10">
                  ساعات کاری
                </h3>

                <div className="space-y-3 sm:space-y-4 relative z-10">
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-secondary-300 mb-1 font-medium">
                      شنبه تا چهارشنبه:
                    </p>
                    <p className="text-sm sm:text-base text-voxcina-blue dark:text-secondary-200 font-bold py-1 px-3 sm:px-4 bg-white/70 dark:bg-voxcina-blue/20 rounded-lg sm:rounded-xl inline-block">
                      ۹ صبح تا ۵ بعدازظهر
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-secondary-300 mb-1 font-medium">
                      پنجشنبه:
                    </p>
                    <p className="text-sm sm:text-base text-voxcina-blue dark:text-secondary-200 font-bold py-1 px-3 sm:px-4 bg-white/70 dark:bg-voxcina-blue/20 rounded-lg sm:rounded-xl inline-block">
                      ۹ صبح تا ۱ بعدازظهر
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-transparent relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full">
            <motion.div
              animate={{ x: [0, 50, 0], y: [0, -25, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-10 sm:top-20 right-10 sm:right-20 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 border border-voxcina-blue/5 rounded-full"
            />
          </div>

          <div className="container mx-auto px-4 relative z-10 max-w-7xl">
            <motion.div
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-voxcina-darkBlue dark:text-white relative inline-block">
                آدرس ما
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-full"
                />
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto">
              <motion.div
                className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg border border-voxcina-blue/10 transition-all duration-500 relative overflow-hidden group hover:bg-white/80 dark:hover:bg-voxcina-blue/10 hover:scale-105"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-12 sm:-mt-16 md:-mt-20 -mr-12 sm:-mr-16 md:-mr-20 transition-all duration-500 group-hover:scale-125"></div>

                <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-5 text-voxcina-blue dark:text-white flex items-center mt-6 sm:mt-8 relative z-10">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-voxcina-blue to-voxcina-darkBlue flex items-center justify-center ml-3 flex-shrink-0">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  دفتر فروش
                </h3>
                <p className="text-sm sm:text-base text-gray-700 dark:text-secondary-300 mb-3 sm:mb-4 pr-10 sm:pr-12 relative z-10">
                  پاسداران بوستان پنجم کوی گلشن پلاک ۱۴
                </p>
                <div className="flex items-center text-sm sm:text-base text-gray-600 dark:text-secondary-300 pr-10 sm:pr-12 relative z-10">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 ml-2 text-voxcina-blue/60 dark:text-secondary-300" />
                  <span className="ltr">021-22325653</span>
                </div>
              </motion.div>

              <motion.div
                className="bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-voxcina-blue/10 transition-all duration-500 overflow-hidden h-80 sm:h-96 relative group hover:bg-white/80 dark:hover:bg-voxcina-blue/10 hover:scale-105"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <MapComponent />
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-transparent relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10 max-w-7xl">
            <motion.div
              className="text-center mb-8 sm:mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-voxcina-darkBlue dark:text-white relative inline-block">
                ارسال پیام
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 h-0.5 sm:h-1 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue rounded-full"
                />
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-secondary-200/80 max-w-2xl mx-auto mt-4">
                برای ارسال پیام، پیشنهادات، انتقادات و یا درخواست همکاری، فرم
                زیر را تکمیل کنید.
              </p>
            </motion.div>

            <motion.div
              className="max-w-4xl mx-auto bg-white/60 dark:bg-voxcina-blue/5 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-voxcina-blue/10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              {formStatus && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`p-3 sm:p-4 ${
                    formStatus.success
                      ? "bg-green-50/70 dark:bg-green-900/10 text-green-700 dark:text-green-400 border-b border-green-100 dark:border-green-900/20"
                      : "bg-red-50/70 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-b border-red-100 dark:border-red-900/20"
                  } flex items-start backdrop-blur-sm`}
                >
                  {formStatus.success ? (
                    <CheckCircle className="w-5 h-5 mt-0.5 ml-3 flex-shrink-0" />
                  ) : (
                    <MessageSquare className="w-5 h-5 mt-0.5 ml-3 flex-shrink-0" />
                  )}
                  <p className="text-sm sm:text-base">{formStatus.message}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
                    >
                      نام و نام خانوادگی <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-blue/30 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 text-sm sm:text-base placeholder-gray-500 dark:placeholder-secondary-400"
                      placeholder="نام و نام خانوادگی خود را وارد کنید"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
                    >
                      ایمیل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-blue/30 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 text-sm sm:text-base placeholder-gray-500 dark:placeholder-secondary-400"
                      placeholder="example@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
                    >
                      شماره تماس
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-blue/30 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 text-sm sm:text-base placeholder-gray-500 dark:placeholder-secondary-400"
                      placeholder="09123456789"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
                    >
                      موضوع
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-blue/30 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 text-sm sm:text-base"
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="سوال">سوال</option>
                      <option value="پیشنهاد">پیشنهاد</option>
                      <option value="انتقاد">انتقاد</option>
                      <option value="همکاری">همکاری</option>
                      <option value="پشتیبانی">پشتیبانی</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6">
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-voxcina-blue/80 dark:text-secondary-200/80 mb-2"
                  >
                    پیام <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-voxcina-blue/20 dark:border-voxcina-blue/30 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-white/80 dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-secondary-200 text-sm sm:text-base placeholder-gray-500 dark:placeholder-secondary-400 resize-none"
                    placeholder="پیام خود را بنویسید..."
                    required
                  ></textarea>
                </div>

                <div className="mt-6 sm:mt-8">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue hover:from-voxcina-darkBlue hover:to-voxcina-blue text-white font-medium rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-sm sm:text-base relative overflow-hidden group"
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                    ارسال پیام
                    <motion.div
                      className="absolute inset-0 bg-white/20 rounded-lg sm:rounded-xl"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
