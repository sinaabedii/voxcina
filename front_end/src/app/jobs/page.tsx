"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  MapPin,
  CheckCircle,
  Send,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
} from "lucide-react";
import Link from "next/link";
import { LuBriefcaseBusiness } from "react-icons/lu";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function JobsPage() {
  const [activeFilters, setActiveFilters] = useState({
    department: "",
    location: "",
    type: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const jobs = [
    {
      id: "job1",
      title: "مدیر محصول",
      department: "محصول",
      location: "تهران",
      type: "تمام وقت",
      postedAt: "۱۵ روز پیش",
      description:
        "ما به دنبال یک مدیر محصول با تجربه هستیم که بتواند محصولات ما را از مرحله ایده تا تولید هدایت کند. شما مسئول تعریف محصول، بررسی بازار، اولویت‌بندی ویژگی‌ها و همکاری با تیم‌های مختلف خواهید بود.",
      requirements: [
        "حداقل ۳ سال تجربه در مدیریت محصول",
        "آشنایی با متدولوژی‌های چابک (Agile)",
        "مهارت‌های ارتباطی و تحلیلی قوی",
        "تجربه کار در حوزه تجارت الکترونیک",
      ],
      benefits: [
        "حقوق و مزایای رقابتی",
        "بیمه تکمیلی",
        "دورکاری انعطاف‌پذیر",
        "فرصت‌های یادگیری و رشد حرفه‌ای",
      ],
    },
    {
      id: "job2",
      title: "توسعه‌دهنده فرانت‌اند",
      department: "فنی",
      location: "دورکاری",
      type: "تمام وقت",
      postedAt: "۷ روز پیش",
      description:
        "به یک توسعه‌دهنده فرانت‌اند ماهر برای طراحی و توسعه رابط کاربری وب‌سایت و اپلیکیشن‌های ما نیازمندیم. شما با تیم طراحی و توسعه‌دهندگان بک‌اند همکاری خواهید کرد تا رابط‌های کاربری زیبا و کارآمد ایجاد کنید.",
      requirements: [
        "تسلط بر HTML، CSS و JavaScript",
        "تجربه کار با React یا Next.js",
        "آشنایی با Tailwind CSS",
        "تسلط بر ابزارهای کنترل نسخه مانند Git",
      ],
      benefits: [
        "حقوق و مزایای رقابتی",
        "امکان دورکاری کامل",
        "ساعات کاری انعطاف‌پذیر",
        "بیمه تکمیلی و خدمات رفاهی",
      ],
    },
    {
      id: "job3",
      title: "متخصص بازاریابی دیجیتال",
      department: "بازاریابی",
      location: "تهران",
      type: "تمام وقت",
      postedAt: "۳ روز پیش",
      description:
        "ما به دنبال یک متخصص بازاریابی دیجیتال با تجربه هستیم که بتواند استراتژی‌های بازاریابی آنلاین ما را تدوین و اجرا کند. شما مسئول کمپین‌های تبلیغاتی، بازاریابی محتوایی و تحلیل نتایج خواهید بود.",
      requirements: [
        "حداقل ۲ سال تجربه در بازاریابی دیجیتال",
        "تسلط بر ابزارهای تحلیل و گزارش‌گیری مانند Google Analytics",
        "تجربه در مدیریت کمپین‌های تبلیغاتی آنلاین",
        "آشنایی با اصول SEO و بهینه‌سازی نرخ تبدیل",
      ],
      benefits: [
        "حقوق و مزایای رقابتی",
        "پاداش‌های عملکردی",
        "محیط کاری پویا و خلاق",
        "امکان رشد سریع در سازمان",
      ],
    },
    {
      id: "job4",
      title: "کارشناس خدمات مشتریان",
      department: "پشتیبانی",
      location: "اصفهان",
      type: "نیمه وقت",
      postedAt: "۱ روز پیش",
      description:
        "به یک کارشناس خدمات مشتریان با مهارت‌های ارتباطی عالی نیازمندیم. شما مسئول پاسخگویی به سوالات مشتریان، رسیدگی به مشکلات و ارائه راه‌حل‌های مناسب خواهید بود.",
      requirements: [
        "مهارت‌های ارتباطی و نوشتاری عالی",
        "توانایی حل مسئله و مدیریت زمان",
        "صبر و تعهد به رضایت مشتری",
        "آشنایی با سیستم‌های CRM",
      ],
      benefits: [
        "حقوق ساعتی رقابتی",
        "ساعات کاری انعطاف‌پذیر",
        "محیط کاری دوستانه",
        "امکان تبدیل به تمام وقت در آینده",
      ],
    },
    {
      id: "job5",
      title: "مدیر لجستیک",
      department: "عملیات",
      location: "تهران",
      type: "تمام وقت",
      postedAt: "۱۰ روز پیش",
      description:
        "ما به دنبال یک مدیر لجستیک باتجربه هستیم که بتواند زنجیره تأمین و فرآیندهای لجستیکی شرکت را بهینه‌سازی کند. شما مسئول مدیریت انبار، حمل و نقل و بهبود فرآیندهای عملیاتی خواهید بود.",
      requirements: [
        "حداقل ۵ سال تجربه در مدیریت لجستیک",
        "تسلط بر سیستم‌های مدیریت انبار",
        "توانایی تحلیل و بهبود فرآیندها",
        "تجربه در مدیریت تیم‌های عملیاتی",
      ],
      benefits: [
        "حقوق و مزایای رقابتی",
        "پاداش‌های عملکردی",
        "بیمه تکمیلی و خدمات رفاهی",
        "فرصت‌های یادگیری و رشد حرفه‌ای",
      ],
    },
  ];

  const filteredJobs = jobs.filter((job) => {
    if (
      activeFilters.department &&
      job.department !== activeFilters.department
    ) {
      return false;
    }

    if (activeFilters.location && job.location !== activeFilters.location) {
      return false;
    }

    if (activeFilters.type && job.type !== activeFilters.type) {
      return false;
    }

    if (searchQuery) {
      return (
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return true;
  });

  const departments = [...new Set(jobs.map((job) => job.department))];
  const locations = [...new Set(jobs.map((job) => job.location))];
  const types = [...new Set(jobs.map((job) => job.type))];

  const handleFilterChange = (filterType: string, value: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterType]:
        prev[filterType as keyof typeof prev] === value ? "" : value,
    }));
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
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
  };
  return (
    <>
      <Header />

      <div className="min-h-screen bg-voxcina-cream dark:bg-voxcina-darkBlue/90">
        <div className="bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue text-white relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-64 h-64 bg-white/10 rounded-full -top-20 -left-20 blur-3xl"></div>
            <div className="absolute w-96 h-96 bg-primary-400/10 rounded-full -bottom-40 -right-20 blur-3xl"></div>
          </div>
          <div className="container mx-auto py-20 md:py-28 px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative inline-block mb-6"
            >
              <span className="text-xl text-secondary-200 font-light">
                Voxcina
              </span>
              <div className="w-full h-1 bg-secondary-200/30 mt-1 rounded-full"></div>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-6 relative"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <span className="relative z-10">فرصت‌های شغلی</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200/20 rounded-full -z-0 opacity-40"></span>
            </motion.h1>

            <motion.p
              className="text-xl max-w-3xl mx-auto text-secondary-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              به تیم ما بپیوندید و در کنار افراد خلاق و پرانگیزه، آینده تجارت
              الکترونیک را بسازید.
            </motion.p>

            <motion.div
              className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-voxcina-cream to-transparent dark:from-voxcina-darkBlue/90 dark:to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
            ></motion.div>
          </div>
        </div>

        <section className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto relative z-10">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">چرا پیوستن به ما؟</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <LuBriefcaseBusiness className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200 relative z-10 text-center">
                  محیط کاری پویا
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10 text-center">
                  در محیطی پر از چالش، نوآوری و یادگیری مستمر فعالیت خواهید کرد
                  و فرصت رشد و پیشرفت خواهید داشت.
                </p>
              </motion.div>

              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <Users className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200 relative z-10 text-center">
                  فرهنگ سازمانی عالی
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10 text-center">
                  ما به داشتن فرهنگی مبتنی بر همکاری، احترام متقابل و تعادل بین
                  کار و زندگی افتخار می‌کنیم.
                </p>
              </motion.div>

              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 p-8 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ y: -5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200 relative z-10 text-center">
                  مزایای رقابتی
                </h3>

                <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10 text-center">
                  از حقوق مناسب، بیمه‌های تکمیلی، امکان دورکاری و برنامه‌های
                  آموزشی پیشرفته بهره‌مند شوید.
                </p>
              </motion.div>
            </div>
          </div>
        </section>
        <section className="py-8 px-4 bg-secondary-100/50 dark:bg-voxcina-blue/5 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft overflow-hidden backdrop-blur-sm border border-secondary-200 dark:border-voxcina-darkBlue/30 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow relative">
                  <Search
                    className="absolute right-3 top-3 text-voxcina-blue/60 dark:text-secondary-300"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="جستجوی فرصت شغلی"
                    className="w-full px-4 py-3 pr-10 border border-secondary-200 dark:border-voxcina-blue/30 rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-secondary-100/30 dark:bg-voxcina-blue/5 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <select
                      className="appearance-none px-4 py-3 pr-8 border border-secondary-200 dark:border-voxcina-blue/30 rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-secondary-100/30 dark:bg-voxcina-blue/5 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft"
                      value={activeFilters.department}
                      onChange={(e) =>
                        handleFilterChange("department", e.target.value)
                      }
                    >
                      <option value="">همه دپارتمان‌ها</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute left-2 top-3 text-voxcina-blue/60 dark:text-secondary-300"
                      size={16}
                    />
                  </div>

                  <div className="relative">
                    <select
                      className="appearance-none px-4 py-3 pr-8 border border-secondary-200 dark:border-voxcina-blue/30 rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-secondary-100/30 dark:bg-voxcina-blue/5 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft"
                      value={activeFilters.location}
                      onChange={(e) =>
                        handleFilterChange("location", e.target.value)
                      }
                    >
                      <option value="">همه موقعیت‌ها</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute left-2 top-3 text-voxcina-blue/60 dark:text-secondary-300"
                      size={16}
                    />
                  </div>

                  <div className="relative">
                    <select
                      className="appearance-none px-4 py-3 pr-8 border border-secondary-200 dark:border-voxcina-blue/30 rounded-xl focus:ring-2 focus:ring-voxcina-blue/30 focus:border-voxcina-blue dark:focus:ring-secondary-200/30 dark:focus:border-secondary-200 bg-secondary-100/30 dark:bg-voxcina-blue/5 text-voxcina-blue dark:text-secondary-200 shadow-inner-soft"
                      value={activeFilters.type}
                      onChange={(e) =>
                        handleFilterChange("type", e.target.value)
                      }
                    >
                      <option value="">همه انواع</option>
                      {types.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute left-2 top-3 text-voxcina-blue/60 dark:text-secondary-300"
                      size={16}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">
                  {filteredJobs.length > 0
                    ? `${filteredJobs.length} فرصت شغلی یافت شد`
                    : "فرصت شغلی یافت نشد"}
                </span>
                <span className="absolute bottom-1 left-0 w-full h-2 bg-secondary-200/50 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>

              {(activeFilters.department ||
                activeFilters.location ||
                activeFilters.type ||
                searchQuery) && (
                <button
                  onClick={() => {
                    setActiveFilters({
                      department: "",
                      location: "",
                      type: "",
                    });
                    setSearchQuery("");
                  }}
                  className="text-voxcina-blue dark:text-secondary-300 text-sm hover:text-voxcina-blue/80 dark:hover:text-secondary-200 transition-colors"
                >
                  پاک کردن فیلترها
                </button>
              )}
            </div>

            {filteredJobs.length > 0 ? (
              <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {filteredJobs.map((job) => (
                  <motion.div
                    key={job.id}
                    className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft overflow-hidden backdrop-blur-sm border border-secondary-200 dark:border-voxcina-darkBlue/30 transition-all duration-300 hover:shadow-medium group"
                    variants={itemVariants}
                  >
                    <div
                      className="p-6 cursor-pointer transition-colors group-hover:bg-secondary-100/30 dark:group-hover:bg-voxcina-blue/5"
                      onClick={() =>
                        setExpandedJob(expandedJob === job.id ? null : job.id)
                      }
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-voxcina-blue dark:text-secondary-200">
                            {job.title}
                          </h3>
                          <div className="flex flex-wrap gap-3 mt-2">
                            <span className="inline-flex items-center text-sm text-voxcina-blue/70 dark:text-secondary-300 bg-secondary-100/50 dark:bg-voxcina-blue/20 px-3 py-1 rounded-xl">
                              <Briefcase className="w-4 h-4 ml-1" />
                              {job.department}
                            </span>
                            <span className="inline-flex items-center text-sm text-voxcina-blue/70 dark:text-secondary-300 bg-secondary-100/50 dark:bg-voxcina-blue/20 px-3 py-1 rounded-xl">
                              <MapPin className="w-4 h-4 ml-1" />
                              {job.location}
                            </span>
                            <span className="inline-flex items-center text-sm text-voxcina-blue/70 dark:text-secondary-300 bg-secondary-100/50 dark:bg-voxcina-blue/20 px-3 py-1 rounded-xl">
                              <Clock className="w-4 h-4 ml-1" />
                              {job.postedAt}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center mt-4 md:mt-0">
                          <span className="px-4 py-1.5 text-sm bg-voxcina-blue/10 dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-secondary-200 rounded-xl border border-voxcina-blue/20 dark:border-voxcina-blue/40 ml-4">
                            {job.type}
                          </span>
                          {expandedJob === job.id ? (
                            <ChevronUp className="w-5 h-5 text-voxcina-blue dark:text-secondary-300" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-voxcina-blue dark:text-secondary-300" />
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedJob === job.id && (
                      <motion.div
                        className="px-6 pb-6 border-t border-secondary-200 dark:border-voxcina-blue/20 pt-4"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="prose prose-voxcina dark:prose-invert max-w-none">
                          <p className="text-voxcina-blue/80 dark:text-secondary-300 mb-6">
                            {job.description}
                          </p>

                          <h4 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 mb-3">
                            الزامات:
                          </h4>
                          <ul className="space-y-2 mb-6">
                            {job.requirements.map((req, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle className="w-5 h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-2 mt-0.5 flex-shrink-0" />
                                <span className="text-voxcina-blue/70 dark:text-secondary-300">
                                  {req}
                                </span>
                              </li>
                            ))}
                          </ul>

                          <h4 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 mb-3">
                            مزایا:
                          </h4>
                          <ul className="space-y-2 mb-6">
                            {job.benefits.map((benefit, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle className="w-5 h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-2 mt-0.5 flex-shrink-0" />
                                <span className="text-voxcina-blue/70 dark:text-secondary-300">
                                  {benefit}
                                </span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-8">
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="inline-block"
                            >
                              <Link
                                href={`/careers?jobId=${job.id}`}
                                className="inline-flex items-center px-5 py-3 bg-voxcina-blue hover:bg-voxcina-darkBlue text-white dark:bg-voxcina-blue/90 dark:hover:bg-voxcina-blue rounded-xl shadow-soft hover:shadow-medium transition-all"
                              >
                                <Send className="w-5 h-5 ml-2" />
                                ارسال رزومه برای این موقعیت
                              </Link>
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft p-8 text-center backdrop-blur-sm border border-secondary-200 dark:border-voxcina-darkBlue/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Briefcase className="w-16 h-16 mx-auto text-voxcina-blue/40 dark:text-secondary-300/40 mb-4" />
                <h3 className="text-xl font-bold text-voxcina-blue dark:text-secondary-200 mb-2">
                  فرصت شغلی با این مشخصات یافت نشد
                </h3>
                <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-6 max-w-lg mx-auto">
                  لطفاً معیارهای جستجو یا فیلترهای خود را تغییر دهید
                </p>
                <motion.button
                  onClick={() => {
                    setActiveFilters({
                      department: "",
                      location: "",
                      type: "",
                    });
                    setSearchQuery("");
                  }}
                  className="px-5 py-2 bg-voxcina-blue hover:bg-voxcina-darkBlue text-white dark:bg-voxcina-blue/90 dark:hover:bg-voxcina-blue font-medium rounded-xl shadow-soft hover:shadow-medium transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  نمایش همه فرصت‌های شغلی
                </motion.button>
              </motion.div>
            )}
          </div>
        </section>
        <section className="py-16 px-4 bg-secondary-100/50 dark:bg-voxcina-blue/5 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">فرآیند استخدام</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 max-w-2xl mx-auto mt-4">
                مراحل استخدام ما شفاف و ساده است. در هر مرحله، تلاش می‌کنیم تا
                بهترین تجربه را برای شما فراهم کنیم.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  title: "ارسال رزومه",
                  description:
                    "رزومه خود را برای موقعیت شغلی مورد نظر از طریق فرم آنلاین ارسال کنید.",
                  icon: <Send className="w-8 h-8" />,
                },
                {
                  title: "بررسی اولیه",
                  description:
                    "تیم منابع انسانی ما رزومه شما را بررسی کرده و در صورت تناسب با شما تماس می‌گیرد.",
                  icon: <CheckCircle className="w-8 h-8" />,
                },
                {
                  title: "مصاحبه تخصصی",
                  description:
                    "در این مرحله، مصاحبه‌ای تخصصی با مدیر بخش مربوطه خواهید داشت.",
                  icon: <Users className="w-8 h-8" />,
                },
                {
                  title: "پیشنهاد همکاری",
                  description:
                    "در صورت تأیید نهایی، پیشنهاد همکاری را دریافت خواهید کرد.",
                  icon: <Briefcase className="w-8 h-8" />,
                },
              ].map((step, index) => (
                <motion.div
                  key={index}
                  className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm transition-all duration-300 hover:shadow-medium relative overflow-hidden group"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  {index < 3 && (
                    <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-secondary-200 dark:bg-voxcina-blue/30 z-0"></div>
                  )}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                  <div className="w-16 h-16 bg-secondary-200/70 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-soft">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-voxcina-blue dark:text-secondary-200 text-center relative z-10">
                    {step.title}
                  </h3>
                  <p className="text-voxcina-blue/70 dark:text-secondary-300 text-sm text-center relative z-10">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-4xl relative z-10">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">سوالات متداول</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <div className="w-24 h-1 bg-voxcina-blue/30 dark:bg-secondary-200/30 mx-auto mt-2 rounded-full"></div>
            </motion.div>

            <div className="space-y-6">
              {[
                {
                  question: "روند بررسی رزومه چقدر طول می‌کشد؟",
                  answer:
                    "معمولاً بررسی اولیه رزومه‌ها بین ۷ تا ۱۴ روز کاری طول می‌کشد. در صورت تناسب با موقعیت شغلی، با شما تماس خواهیم گرفت.",
                },
                {
                  question: "آیا امکان دورکاری وجود دارد؟",
                  answer:
                    "بله، بسته به موقعیت شغلی، امکان دورکاری کامل یا نیمه‌حضوری وجود دارد. این موضوع در شرح موقعیت شغلی ذکر شده است.",
                },
                {
                  question:
                    "اگر موقعیت مناسب من در حال حاضر وجود نداشته باشد، چه کنم؟",
                  answer:
                    "می‌توانید رزومه خود را از طریق بخش «ارسال رزومه» برای ما ارسال کنید. ما آن را در بانک رزومه خود نگهداری کرده و در صورت وجود موقعیت مناسب با شما تماس خواهیم گرفت.",
                },
                {
                  question: "مزایای رفاهی شرکت شامل چه مواردی می‌شود؟",
                  answer:
                    "مزایای رفاهی ما شامل بیمه تکمیلی، تسهیلات ورزشی، بن‌های خرید، اعتبار آموزشی سالانه، مرخصی استحقاقی و مناسبتی، و پاداش‌های عملکردی است.",
                },
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm overflow-hidden group transition-all duration-300 hover:shadow-medium relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full -mt-16 -mr-16 transition-all duration-500 group-hover:scale-125"></div>

                  <h3 className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 mb-3 relative z-10">
                    {faq.question}
                  </h3>
                  <p className="text-voxcina-blue/70 dark:text-secondary-300 relative z-10">
                    {faq.answer}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        <section className="py-16 px-4 bg-gradient-to-r from-voxcina-blue to-voxcina-darkBlue text-white relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-secondary-200/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <motion.h2
              className="text-3xl font-bold mb-6 relative inline-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="relative z-10">
                آینده شغلی خود را با ما بسازید
              </span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200/20 rounded-full -z-0 opacity-40"></span>
            </motion.h2>
            <motion.p
              className="text-xl mb-8 text-secondary-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              به تیم در حال رشد ما بپیوندید و در یک محیط پویا و حرفه‌ای مشغول به
              کار شوید.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="inline-block"
              >
                <Link
                  href="/careers"
                  className="inline-flex items-center px-6 py-3 bg-white text-voxcina-blue hover:bg-secondary-100 font-medium rounded-xl shadow-medium hover:shadow-strong transition-all"
                >
                  <Send className="w-5 h-5 ml-2" />
                  ارسال رزومه
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <div className="h-16 bg-gradient-to-t from-voxcina-blue to-voxcina-blue/70 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute top-0 right-1/3 w-64 h-64 bg-secondary-200/10 rounded-full blur-3xl"></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-secondary-200/20"></div>
        </div>
      </div>
      <Footer />
    </>
  );
}
