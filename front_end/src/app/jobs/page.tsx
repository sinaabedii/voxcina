"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  MapPin,
  CheckCircle,
  Send,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
} from "lucide-react";
import Link from "next/link";
import { LuBriefcaseBusiness } from "react-icons/lu";

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto py-24 px-4 text-center">
          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            فرصت‌های شغلی
          </motion.h1>
          <motion.p
            className="text-xl max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            به تیم ما بپیوندید و در کنار افراد خلاق و پرانگیزه، آینده تجارت
            الکترونیک را بسازید.
          </motion.p>
        </div>
      </div>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              چرا پیوستن به ما؟
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div
              className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <LuBriefcaseBusiness className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                محیط کاری پویا
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                در محیطی پر از چالش، نوآوری و یادگیری مستمر فعالیت خواهید کرد و
                فرصت رشد و پیشرفت خواهید داشت.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                فرهنگ سازمانی عالی
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                ما به داشتن فرهنگی مبتنی بر همکاری، احترام متقابل و تعادل بین
                کار و زندگی افتخار می‌کنیم.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                مزایای رقابتی
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                از حقوق مناسب، بیمه‌های تکمیلی، امکان دورکاری و برنامه‌های
                آموزشی پیشرفته بهره‌مند شوید.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-8 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white dark:bg-gray-700 rounded-xl shadow-md p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow relative">
                <Search
                  className="absolute right-3 top-3 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="جستجوی فرصت شغلی"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <select
                    className="appearance-none px-4 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                    className="absolute left-2 top-3 text-gray-400"
                    size={16}
                  />
                </div>

                <div className="relative">
                  <select
                    className="appearance-none px-4 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                    className="absolute left-2 top-3 text-gray-400"
                    size={16}
                  />
                </div>

                <div className="relative">
                  <select
                    className="appearance-none px-4 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    value={activeFilters.type}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                  >
                    <option value="">همه انواع</option>
                    {types.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute left-2 top-3 text-gray-400"
                    size={16}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {filteredJobs.length > 0
                ? `${filteredJobs.length} فرصت شغلی یافت شد`
                : "فرصت شغلی یافت نشد"}
            </h2>

            {(activeFilters.department ||
              activeFilters.location ||
              activeFilters.type ||
              searchQuery) && (
              <button
                onClick={() => {
                  setActiveFilters({ department: "", location: "", type: "" });
                  setSearchQuery("");
                }}
                className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
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
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
                  variants={itemVariants}
                >
                  <div
                    className="p-6 cursor-pointer"
                    onClick={() =>
                      setExpandedJob(expandedJob === job.id ? null : job.id)
                    }
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap gap-3 mt-2">
                          <span className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Briefcase className="w-4 h-4 ml-1" />
                            {job.department}
                          </span>
                          <span className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4 ml-1" />
                            {job.location}
                          </span>
                          <span className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4 ml-1" />
                            {job.postedAt}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center mt-4 md:mt-0">
                        <span className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full ml-4">
                          {job.type}
                        </span>
                        {expandedJob === job.id ? (
                          <ChevronUp className="w-5 h-5 text-indigo-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-indigo-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedJob === job.id && (
                    <motion.div
                      className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="prose prose-indigo dark:prose-invert max-w-none">
                        <p className="text-gray-700 dark:text-gray-300 mb-6">
                          {job.description}
                        </p>

                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                          الزامات:
                        </h4>
                        <ul className="space-y-2 mb-6">
                          {job.requirements.map((req, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {req}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                          مزایا:
                        </h4>
                        <ul className="space-y-2 mb-6">
                          {job.benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {benefit}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-8">
                          <Link
                            href={`/careers?jobId=${job.id}`}
                            className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
                          >
                            <Send className="w-5 h-5 ml-2" />
                            ارسال رزومه برای این موقعیت
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Briefcase className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                فرصت شغلی با این مشخصات یافت نشد
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                لطفاً معیارهای جستجو یا فیلترهای خود را تغییر دهید
              </p>
              <button
                onClick={() => {
                  setActiveFilters({ department: "", location: "", type: "" });
                  setSearchQuery("");
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                نمایش همه فرصت‌های شغلی
              </button>
            </motion.div>
          )}
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              فرآیند استخدام
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
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
                className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md text-center relative"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {index < 3 && (
                  <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-indigo-200 dark:bg-indigo-800 z-0"></div>
                )}
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                  {step.icon}
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              سوالات متداول
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
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
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {faq.answer}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h2
            className="text-3xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            آینده شغلی خود را با ما بسازید
          </motion.h2>
          <motion.p
            className="text-xl mb-8"
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
            <Link
              href="/careers"
              className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <Send className="w-5 h-5 ml-2" />
              ارسال رزومه
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
