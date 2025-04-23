"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  CheckCircle2,
  Users,
  TrendingUp,
  Award,
  Upload,
  FileText,
  Send,
} from "lucide-react";
import Link from "next/link";

export default function CareersPage() {
  const [activeTab, setActiveTab] = useState("suppliers");
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    businessType: "",
    message: "",
    resume: null,
    acceptTerms: false,
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (type === "file") {
      if (e.target.files && e.target.files[0]) {
        setFormData((prev) => ({
          ...prev,
          [name]: e.target.files ? e.target.files[0] : null,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submitted:", formData);

    setTimeout(() => {
      setFormSubmitted(true);

      setFormData({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        businessType: "",
        message: "",
        resume: null,
        acceptTerms: false,
      });

      setTimeout(() => {
        setFormSubmitted(false);
      }, 5000);
    }, 1000);
  };

  const suppliers = [
    {
      title: "تأمین‌کنندگان محصولات",
      description:
        "اگر تولیدکننده یا وارد کننده محصولات با کیفیت هستید، ما مشتاق همکاری با شما هستیم. ما به دنبال شرکای تجاری هستیم که محصولات با کیفیت و قیمت مناسب ارائه می‌دهند.",
      benefits: [
        "دسترسی به بازار گسترده مشتریان",
        "همکاری بلندمدت و پایدار",
        "پرداخت به موقع و منظم",
        "امکان معرفی برند شما در پلتفرم ما",
      ],
    },
    {
      title: "خدمات لجستیک و حمل و نقل",
      description:
        "شرکت‌های ارائه دهنده خدمات لجستیک، حمل و نقل و انبارداری می‌توانند با ما همکاری کنند. ما به دنبال شرکای لجستیکی هستیم که خدمات با کیفیت و به موقع ارائه می‌دهند.",
      benefits: [
        "حجم بالای سفارشات روزانه",
        "همکاری منظم و مستمر",
        "پرداخت به موقع و منظم",
        "امکان رشد همزمان با گسترش کسب و کار ما",
      ],
    },
    {
      title: "خدمات فناوری و نرم‌افزاری",
      description:
        "اگر شرکت فناوری یا استارتاپی هستید که خدمات نرم‌افزاری، هوش مصنوعی، تحلیل داده یا فناوری‌های مرتبط با تجارت الکترونیک ارائه می‌دهید، ما از همکاری با شما استقبال می‌کنیم.",
      benefits: [
        "فرصت اجرای پروژه‌های بزرگ و مقیاس‌پذیر",
        "دسترسی به داده‌های ارزشمند برای بهبود فناوری‌ها",
        "امکان همکاری بلندمدت و استراتژیک",
        "معرفی و تبلیغ خدمات شما در پلتفرم ما",
      ],
    },
  ];

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
            همکاری با ما
          </motion.h1>
          <motion.p
            className="text-xl max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            ما به دنبال برقراری روابط پایدار و سودمند با شرکا، تأمین‌کنندگان و
            متخصصان حوزه‌های مختلف هستیم.
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
              چرا با ما همکاری کنید؟
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
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                بازار بزرگ
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                ما با داشتن بیش از ۵۰۰ هزار کاربر فعال ماهانه، بازار بزرگی برای
                محصولات و خدمات شما فراهم می‌کنیم.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                رشد مداوم
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                کسب و کار ما هر سال بیش از ۳۰٪ رشد می‌کند و این فرصت رشد مناسبی
                برای شرکای تجاری ما ایجاد می‌کند.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                برند معتبر
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                همکاری با برند ما که به عنوان یکی از ۱۰ شرکت برتر در حوزه خود
                شناخته می‌شود، اعتبار کسب و کار شما را افزایش می‌دهد.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              انواع همکاری
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
          </motion.div>

          <div className="bg-white dark:bg-gray-700 rounded-xl shadow-md overflow-hidden max-w-5xl mx-auto">
            <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-600">
              <button
                className={`px-6 py-4 font-medium text-sm transition-colors ${
                  activeTab === "suppliers"
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600/20"
                }`}
                onClick={() => setActiveTab("suppliers")}
              >
                تأمین‌کنندگان و شرکای تجاری
              </button>
              <button
                className={`px-6 py-4 font-medium text-sm transition-colors ${
                  activeTab === "careers"
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600/20"
                }`}
                onClick={() => setActiveTab("careers")}
              >
                فرصت‌های شغلی و استخدام
              </button>
            </div>

            <div className="p-6 md:p-8">
              {activeTab === "suppliers" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                    همکاری با تأمین‌کنندگان و شرکای تجاری
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-8">
                    ما به دنبال ایجاد روابط تجاری پایدار و سودمند با
                    تأمین‌کنندگان، تولیدکنندگان و ارائه‌دهندگان خدمات هستیم. اگر
                    محصولات یا خدمات باکیفیتی ارائه می‌دهید، از همکاری با شما
                    استقبال می‌کنیم.
                  </p>

                  <div className="space-y-8">
                    {suppliers.map((item, index) => (
                      <div
                        key={index}
                        className="border-b border-gray-200 dark:border-gray-600 pb-8 last:border-0 last:pb-0"
                      >
                        <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                          {item.title}
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                          {item.description}
                        </p>
                        <h5 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
                          مزایای همکاری:
                        </h5>
                        <ul className="space-y-2">
                          {item.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start">
                              <CheckCircle2 className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {benefit}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "careers" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                    فرصت‌های شغلی و استخدام
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-8">
                    ما به دنبال جذب افراد با استعداد، خلاق و متعهد در حوزه‌های
                    مختلف هستیم. اگر به دنبال محیط کاری پویا، چالش‌برانگیز و
                    فرصت‌های رشد حرفه‌ای هستید، به تیم ما بپیوندید.
                  </p>

                  <h4 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    مزایای کار در شرکت ما:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        محیط کاری پویا و دوستانه
                      </span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        فرصت‌های یادگیری و رشد حرفه‌ای
                      </span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        حقوق و مزایای رقابتی
                      </span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        بیمه‌های تکمیلی و خدمات رفاهی
                      </span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        همکاری با یک تیم متخصص و حرفه‌ای
                      </span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 ml-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        انعطاف‌پذیری در ساعات کاری
                      </span>
                    </div>
                  </div>

                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 mb-6">
                    <h4 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                      موقعیت‌های شغلی فعلی:
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400 ml-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            مدیر محصول
                          </h5>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            تمام وقت - تهران
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400 ml-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            توسعه‌دهنده فرانت‌اند
                          </h5>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            تمام وقت/دورکاری - تهران
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400 ml-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            متخصص بازاریابی دیجیتال
                          </h5>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            تمام وقت - تهران
                          </p>
                        </div>
                      </li>
                    </ul>
                    <div className="mt-4">
                      <Link
                        href="/jobs"
                        className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                      >
                        مشاهده همه فرصت‌های شغلی
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              {activeTab === "suppliers"
                ? "درخواست همکاری تجاری"
                : "ارسال رزومه"}
            </h2>
            <div className="w-24 h-1 bg-indigo-500 mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {activeTab === "suppliers"
                ? "برای آغاز همکاری، لطفاً فرم زیر را تکمیل کنید. کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت."
                : "برای پیوستن به تیم ما، لطفاً رزومه خود را از طریق فرم زیر ارسال کنید."}
            </p>
          </motion.div>

          <motion.div
            className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {formSubmitted && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 flex items-start">
                <CheckCircle2 className="w-5 h-5 mt-0.5 ml-3 flex-shrink-0" />
                <p>
                  {activeTab === "suppliers"
                    ? "درخواست همکاری شما با موفقیت ثبت شد. کارشناسان ما به زودی با شما تماس خواهند گرفت."
                    : "رزومه شما با موفقیت ارسال شد. در صورت تناسب با موقعیت‌های موجود، با شما تماس خواهیم گرفت."}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTab === "suppliers" && (
                  <div className="md:col-span-2">
                    <label
                      htmlFor="companyName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      نام شرکت <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="نام شرکت یا کسب و کار خود را وارد کنید"
                      required
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="contactName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    نام و نام خانوادگی <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="نام و نام خانوادگی خود را وارد کنید"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    ایمیل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="example@email.com"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    شماره تماس <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="09123456789"
                    required
                  />
                </div>

                {activeTab === "suppliers" ? (
                  <div>
                    <label
                      htmlFor="businessType"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      نوع کسب و کار <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="businessType"
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="product">
                        تولیدکننده/تأمین‌کننده محصول
                      </option>
                      <option value="logistics">
                        خدمات لجستیک و حمل و نقل
                      </option>
                      <option value="technology">
                        خدمات فناوری و نرم‌افزاری
                      </option>
                      <option value="other">سایر</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="businessType"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      موقعیت شغلی مورد نظر{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="businessType"
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="product-manager">مدیر محصول</option>
                      <option value="frontend">توسعه‌دهنده فرانت‌اند</option>
                      <option value="marketing">متخصص بازاریابی دیجیتال</option>
                      <option value="other">سایر</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {activeTab === "suppliers"
                    ? "توضیحات تکمیلی"
                    : "درباره خودتان"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={
                    activeTab === "suppliers"
                      ? "درباره شرکت، محصولات یا خدمات خود توضیح دهید..."
                      : "درباره تجربیات، مهارت‌ها و علاقه‌مندی‌های خود توضیح دهید..."
                  }
                  required
                ></textarea>
              </div>

              {activeTab === "careers" && (
                <div className="mt-6">
                  <label
                    htmlFor="resume"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    آپلود رزومه <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                    <label
                      htmlFor="resume"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {formData.resume
                          ? `فایل انتخاب شده: ${(formData.resume as any)?.name}`
                          : "کلیک کنید یا فایل خود را اینجا رها کنید (PDF, DOCX)"}
                      </span>
                      <input
                        type="file"
                        id="resume"
                        name="resume"
                        onChange={handleChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        required
                      />
                    </label>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      حداکثر اندازه فایل: 5MB
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-start">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="h-4 w-4 mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ml-2"
                  required
                />
                <label
                  htmlFor="acceptTerms"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  با ارسال این فرم، موافقت خود را با
                  <Link
                    href="/privacy"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline mx-1"
                  >
                    شرایط و قوانین
                  </Link>
                  سایت اعلام می‌کنم.
                </label>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                >
                  <Send className="w-5 h-5 ml-2" />
                  {activeTab === "suppliers"
                    ? "ارسال درخواست همکاری"
                    : "ارسال رزومه"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto">
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

          <div className="max-w-3xl mx-auto">
            {[
              {
                question: "مراحل همکاری با شما چگونه است؟",
                answer:
                  "پس از تکمیل فرم درخواست همکاری، کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت. سپس جلسه‌ای برای آشنایی بیشتر و بررسی جزئیات همکاری ترتیب داده می‌شود. در صورت توافق طرفین، قرارداد همکاری تنظیم و امضا خواهد شد.",
              },
              {
                question: "آیا امکان همکاری به صورت نمایندگی وجود دارد؟",
                answer:
                  "بله، ما برنامه گسترش نمایندگی در سراسر کشور داریم. برای دریافت اطلاعات بیشتر و شرایط اخذ نمایندگی، لطفاً با ما تماس بگیرید.",
              },
              {
                question: "چه مدارکی برای آغاز همکاری نیاز است؟",
                answer:
                  "برای همکاری با ما، نیاز به مدارک هویتی، مدارک ثبتی شرکت، مجوزهای فعالیت و نمونه محصولات یا مستندات خدمات خود دارید. پس از تماس اولیه، لیست دقیق مدارک مورد نیاز به شما اعلام خواهد شد.",
              },
              {
                question: "روند بررسی رزومه‌ها چگونه است؟",
                answer:
                  "پس از دریافت رزومه، تیم منابع انسانی ما آن را بررسی می‌کند. در صورت تناسب با موقعیت‌های شغلی موجود، برای مصاحبه با شما تماس گرفته خواهد شد. این فرآیند معمولاً بین یک تا دو هفته طول می‌کشد.",
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                className="mb-6 bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {faq.answer}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-700 dark:text-gray-300">
              سوال دیگری دارید؟
              <Link
                href="/contact"
                className="text-indigo-600 dark:text-indigo-400 hover:underline mr-1"
              >
                با ما تماس بگیرید
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4">
              همین امروز همکاری خود را آغاز کنید
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto">
              ما مشتاق همکاری با شما هستیم. فرصت‌های بی‌نظیری در انتظار شماست.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
              <Link
                href="#"
                onClick={() => setActiveTab("suppliers")}
                className="px-6 py-3 bg-white text-indigo-600 font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                همکاری تجاری
              </Link>
              <Link
                href="#"
                onClick={() => setActiveTab("careers")}
                className="px-6 py-3 bg-transparent border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition-all"
              >
                فرصت‌های شغلی
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
