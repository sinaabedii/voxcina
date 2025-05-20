"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ChevronLeft,
  Share,
  Heart,
  Bookmark,
  Tag,
  Clock,
  TrendingUp,
  Store,
  ArrowRight,
  Calendar,
  ShoppingBag,
} from "lucide-react";

// اطلاعات جزئیات ترندها با فیلدهای بیشتر نسبت به صفحه اصلی
const TREND_DETAILS = {
  "oversized-clothing": {
    id: "oversized-clothing",
    name: "لباس‌های گشاد و راحت",
    category: "clothing",
    description:
      "لباس‌های گشاد و راحت که آزادی حرکت بیشتری را فراهم می‌کنند، از ترندهای اصلی امسال هستند.",
    longDescription:
      "لباس‌های گشاد و راحت (Oversized) یکی از بزرگترین ترندهای مد در سال ۱۴۰۴ هستند. این سبک لباس، نه تنها راحتی بیشتری را برای پوشنده فراهم می‌کند، بلکه ظاهری شیک و مدرن نیز ایجاد می‌کند. لباس‌های گشاد امروزی با برش‌های هوشمندانه و جزئیات ظریف، از حالت بی‌شکل و نامرتب گذشته فاصله گرفته‌اند و به عنوان یکی از ارکان اصلی استایل مینیمالیستی و خیابانی شناخته می‌شوند.\n\nطراحان برتر جهان در کلکسیون‌های اخیر خود، تمرکز ویژه‌ای بر روی لباس‌های گشاد داشته‌اند. این نوع لباس‌ها را می‌توان در قالب کت‌های بزرگ، شلوارهای پاچه گشاد، بلوزهای حجیم و حتی پیراهن‌های مردانه بزرگ که به عنوان لباس زنانه استفاده می‌شوند، مشاهده کرد.",
    image: "trend-oversized.jpg",
    gallery: [
      "oversized-1.jpg",
      "oversized-2.jpg",
      "oversized-3.jpg",
      "oversized-4.jpg",
    ],
    popularity: 92,
    tags: ["oversized", "comfort", "casual", "streetwear", "minimal"],
    season: "تمام فصول",
    startedYear: 2023,
    idealFor: ["مهمانی‌های غیررسمی", "روزمره", "محیط کار خلاقانه"],
    keyPieces: [
      "تی‌شرت‌های اورسایز",
      "شلوارهای گشاد",
      "ژاکت‌های حجیم",
      "پیراهن‌های بزرگ مردانه",
    ],
    stylingTips: [
      "برای ایجاد تعادل، فقط یک قطعه گشاد را با لباس‌های فیت‌تر ست کنید",
      "از اکسسوری‌های ظریف برای نرم کردن حجم زیاد لباس استفاده کنید",
      "کمربند‌ها می‌توانند به تعریف سیلوئت کمک کنند",
      "کفش‌های پاشنه‌دار می‌توانند تعادل خوبی با لباس‌های گشاد ایجاد کنند",
    ],
    brands: [
      { name: "Zara", priceRange: "متوسط", link: "#" },
      { name: "H&M", priceRange: "اقتصادی", link: "#" },
      { name: "COS", priceRange: "متوسط رو به بالا", link: "#" },
      { name: "Balenciaga", priceRange: "لوکس", link: "#" },
    ],
    relatedTrends: ["wide-leg-pants", "natural-fabrics"],
  },

  "bold-colors": {
    id: "bold-colors",
    name: "رنگ‌های جسورانه",
    category: "colors",
    description:
      "رنگ‌های جسورانه و درخشان، به خصوص رنگ‌های فسفری و نئون، در سال ۱۴۰۴ بسیار محبوب هستند.",
    longDescription:
      "پس از سال‌ها سلطه رنگ‌های خنثی و پاستلی، سال ۱۴۰۴ شاهد بازگشت شکوهمند رنگ‌های جسورانه و درخشان است. رنگ‌های نئون، فسفری، و ترکیب‌های ناهمگون و چشمگیر، از ویژگی‌های اصلی مد امسال هستند. این ترند در تمامی جنبه‌های مد، از لباس گرفته تا اکسسوری و حتی آرایش، خودنمایی می‌کند.\n\nرنگ‌های اصلی محبوب امسال شامل سبز فسفری، آبی الکتریکی، صورتی درخشان، زرد لیمویی و نارنجی آتشین هستند. طراحان از این رنگ‌ها نه تنها به صورت تک‌رنگ، بلکه در ترکیب‌های جسورانه و گاه متضاد نیز استفاده می‌کنند، که بیانگر روحیه خوش‌بینی و سرزندگی پس از دوران همه‌گیری است.",
    image: "trend-bold-colors.jpg",
    gallery: [
      "bold-colors-1.jpg",
      "bold-colors-2.jpg",
      "bold-colors-3.jpg",
      "bold-colors-4.jpg",
    ],
    popularity: 78,
    tags: ["colors", "neon", "vibrant", "fashion-forward", "statement"],
    season: "بهار و تابستان",
    startedYear: 2024,
    idealFor: ["مهمانی‌ها", "فستیوال‌ها", "استایل‌های خیابانی", "عکاسی"],
    keyPieces: [
      "کت‌های نئون",
      "تاپ‌های رنگارنگ",
      "اکسسوری‌های فسفری",
      "کفش‌های رنگی درخشان",
    ],
    stylingTips: [
      "برای شروع، از اکسسوری‌های رنگی با لباس‌های خنثی استفاده کنید",
      "رنگ‌های مکمل را با هم ست کنید برای ایجاد تضاد چشمگیر",
      "رنگ‌های نئون را با مشکی ترکیب کنید تا تعادل ایجاد شود",
      "از ترکیب بیش از دو رنگ درخشان در یک استایل خودداری کنید",
    ],
    brands: [
      { name: "Bershka", priceRange: "اقتصادی", link: "#" },
      { name: "Versace", priceRange: "لوکس", link: "#" },
      { name: "Kenzo", priceRange: "متوسط رو به بالا", link: "#" },
      { name: "Pull & Bear", priceRange: "اقتصادی", link: "#" },
    ],
    relatedTrends: ["statement-accessories"],
  },
  "statement-accessories": {
    id: "statement-accessories",
    name: "اکسسوری‌های خاص",
    category: "accessories",
    description:
      "اکسسوری‌های بزرگ و منحصر به فرد که بیانگر شخصیت هستند، ترند جدید محسوب می‌شوند.",
    longDescription:
      "اکسسوری‌های خاص و چشمگیر در سال ۱۴۰۴ به اوج محبوبیت خود رسیده‌اند. این اکسسوری‌ها شامل گوشواره‌های بزرگ، گردنبندهای حجیم، کیف‌های طرح‌دار و عینک‌های آفتابی با فریم‌های رنگارنگ می‌شوند. [ادامه توضیحات]",
    image: "trend-accessories.jpg",
    gallery: [
      "accessories-1.jpg",
      "accessories-2.jpg",
      "accessories-3.jpg",
      "accessories-4.jpg",
    ],
    popularity: 75,
    tags: ["accessories", "statement", "fashion", "unique", "bold"],
    season: "تمام فصول",
    startedYear: 2023,
    idealFor: ["مهمانی‌ها", "رویدادهای خاص", "استایل روزانه متفاوت"],
    keyPieces: [
      "گوشواره‌های بزرگ",
      "گردنبندهای حجیم",
      "کیف‌های طرح‌دار",
      "عینک‌های آفتابی رنگارنگ",
    ],
    stylingTips: [
      "یک اکسسوری بزرگ را کانون توجه استایل خود قرار دهید",
      "از ترکیب چندین اکسسوری بزرگ با هم خودداری کنید",
      "اکسسوری‌های خاص را با لباس‌های ساده ست کنید",
      "رنگ اکسسوری را با یکی از رنگ‌های لباس خود هماهنگ کنید",
    ],
    brands: [
      { name: "Accessorize", priceRange: "متوسط", link: "#" },
      { name: "H&M", priceRange: "اقتصادی", link: "#" },
      { name: "Gucci", priceRange: "لوکس", link: "#" },
      { name: "Etsy", priceRange: "متنوع", link: "#" },
    ],
    relatedTrends: ["bold-colors", "oversized-clothing"],
  },

  "natural-fabrics": {
    id: "natural-fabrics",
    name: "پارچه‌های طبیعی",
    category: "fabric",
    description:
      "پارچه‌های طبیعی مانند کتان، پنبه ارگانیک و ابریشم، به دلیل راحتی و سازگاری با محیط زیست بسیار محبوب شده‌اند.",
    longDescription:
      "در سال ۱۴۰۴، با افزایش آگاهی نسبت به مسائل زیست‌محیطی، پارچه‌های طبیعی محبوبیت بیشتری پیدا کرده‌اند. [ادامه توضیحات]",
    image: "trend-natural-fabrics.jpg",
    gallery: [
      "natural-fabrics-1.jpg",
      "natural-fabrics-2.jpg",
      "natural-fabrics-3.jpg",
      "natural-fabrics-4.jpg",
    ],
    popularity: 83,
    tags: ["natural", "comfort", "sustainable", "eco-friendly", "organic"],
    season: "تمام فصول",
    startedYear: 2022,
    idealFor: ["روزمره", "محیط کار", "مهمانی‌های غیررسمی"],
    keyPieces: [
      "بلوزهای کتان",
      "لباس‌های پنبه‌ای ارگانیک",
      "شال‌های ابریشمی",
      "لباس‌های کنفی",
    ],
    stylingTips: [
      "از لایه‌های نازک پارچه‌های طبیعی برای استایل چند لایه استفاده کنید",
      "ترکیب بافت‌های مختلف پارچه‌های طبیعی جذابیت بیشتری ایجاد می‌کند",
      "لباس‌های کتان را به صورت کمی چروک بپوشید تا طبیعی‌تر به نظر برسند",
      "رنگ‌های خنثی بهترین انتخاب برای پارچه‌های طبیعی هستند",
    ],
    brands: [
      { name: "Muji", priceRange: "متوسط", link: "#" },
      { name: "Mango", priceRange: "متوسط", link: "#" },
      { name: "Patagonia", priceRange: "متوسط رو به بالا", link: "#" },
      { name: "Eileen Fisher", priceRange: "لوکس", link: "#" },
    ],
    relatedTrends: ["oversized-clothing", "sustainability"],
  },

  "chunky-boots": {
    id: "chunky-boots",
    name: "بوت‌های پاشنه کلفت",
    category: "footwear",
    description:
      "بوت‌های پاشنه کلفت و بزرگ، ترند امسال در کفش‌ها هستند که به استایل‌های روزمره عمق می‌بخشند.",
    longDescription:
      "بوت‌های پاشنه کلفت در سال ۱۴۰۴ به یکی از اصلی‌ترین عناصر مد تبدیل شده‌اند. [ادامه توضیحات]",
    image: "trend-chunky-boots.jpg",
    gallery: [
      "chunky-boots-1.jpg",
      "chunky-boots-2.jpg",
      "chunky-boots-3.jpg",
      "chunky-boots-4.jpg",
    ],
    popularity: 70,
    tags: ["footwear", "boots", "chunky", "practical", "comfort"],
    season: "پاییز و زمستان",
    startedYear: 2023,
    idealFor: ["استایل خیابانی", "روزمره", "مهمانی‌های غیررسمی"],
    keyPieces: [
      "بوت‌های چلسی پاشنه کلفت",
      "بوت‌های کامبات",
      "بوت‌های پلتفرم",
      "بوت‌های مچ‌دار کلفت",
    ],
    stylingTips: [
      "بوت‌های کلفت را با شلوارهای کوتاه یا دامن‌ها بپوشید تا بیشتر دیده شوند",
      "تضاد بوت‌های محکم با لباس‌های ظریف جذابیت ایجاد می‌کند",
      "برای استایل متعادل، قسمت بالاتنه را ظریف‌تر انتخاب کنید",
      "بوت‌های مشکی همه‌کاره‌ترین انتخاب هستند",
    ],
    brands: [
      { name: "Dr. Martens", priceRange: "متوسط رو به بالا", link: "#" },
      { name: "Steve Madden", priceRange: "متوسط", link: "#" },
      { name: "Vagabond", priceRange: "متوسط", link: "#" },
      { name: "Zara", priceRange: "متوسط", link: "#" },
    ],
    relatedTrends: ["bold-colors", "oversized-clothing"],
  },

  "wide-leg-pants": {
    id: "wide-leg-pants",
    name: "شلوارهای پاچه گشاد",
    category: "clothing",
    description:
      "شلوارهای پاچه گشاد و راحت، جایگزین مناسبی برای شلوارهای اسکینی هستند و در سال ۱۴۰۴ بسیار دیده می‌شوند.",
    longDescription:
      "شلوارهای پاچه گشاد یکی از برجسته‌ترین ترندهای سال ۱۴۰۴ هستند. [ادامه توضیحات]",
    image: "trend-wide-leg.jpg",
    gallery: [
      "wide-leg-1.jpg",
      "wide-leg-2.jpg",
      "wide-leg-3.jpg",
      "wide-leg-4.jpg",
    ],
    popularity: 88,
    tags: ["pants", "comfort", "wide-leg", "loose-fit", "versatile"],
    season: "تمام فصول",
    startedYear: 2023,
    idealFor: ["روزمره", "محیط کار", "مهمانی‌های غیررسمی", "سفر"],
    keyPieces: [
      "شلوار پاچه گشاد جین",
      "شلوار پارچه‌ای گشاد",
      "شلوار کتان پاچه گشاد",
      "شلوار راحتی گشاد",
    ],
    stylingTips: [
      "شلوارهای پاچه گشاد را با تاپ‌های چسبان ست کنید تا تعادل ایجاد شود",
      "برای قد بلندتر به نظر رسیدن، شلوار پاچه گشاد بلند با کفش پاشنه‌دار بپوشید",
      "کمربند به تعریف سیلوئت در شلوارهای گشاد کمک می‌کند",
      "ژاکت کوتاه یا کراپ با شلوار پاچه گشاد ترکیب خوبی ایجاد می‌کند",
    ],
    brands: [
      { name: "Uniqlo", priceRange: "اقتصادی", link: "#" },
      { name: "COS", priceRange: "متوسط", link: "#" },
      { name: "& Other Stories", priceRange: "متوسط", link: "#" },
      { name: "Mango", priceRange: "متوسط", link: "#" },
    ],
    relatedTrends: ["oversized-clothing", "natural-fabrics"],
  },

  // سایر ترندها با همین ساختار اضافه می‌شوند
};

export default function TrendDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [trendDetail, setTrendDetail] = useState<any>(null);
  const [relatedTrends, setRelatedTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // شبیه‌سازی دریافت اطلاعات از سرور
    const fetchTrendDetails = async () => {
      setIsLoading(true);

      // تاخیر مصنوعی برای شبیه‌سازی دریافت اطلاعات
      setTimeout(() => {
        const trend = TREND_DETAILS[params.id as keyof typeof TREND_DETAILS];

        if (trend) {
          setTrendDetail(trend);

          // دریافت ترندهای مرتبط
          if (trend.relatedTrends && trend.relatedTrends.length) {
            const related = trend.relatedTrends
              .map(
                (id: string) => TREND_DETAILS[id as keyof typeof TREND_DETAILS]
              )
              .filter(Boolean);

            setRelatedTrends(related);
          }
        }

        setIsLoading(false);
      }, 1000);
    };

    fetchTrendDetails();
  }, [params.id]);

  const toggleLike = () => setIsLiked(!isLiked);
  const toggleSave = () => setIsSaved(!isSaved);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-voxcina-cream dark:bg-voxcina-darkBlue/90">
        <div className="relative w-24 h-24">
          <div className="absolute top-0 right-0 w-full h-full border-4 border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-full animate-pulse-soft"></div>
          <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-secondary-200 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-voxcina-blue/40 dark:text-secondary-200/40 text-xl font-medium">
            Voxcina
          </div>
        </div>
      </div>
    );
  }

  if (!trendDetail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-voxcina-cream dark:bg-voxcina-darkBlue/90 p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-secondary-100 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-10 h-10 text-voxcina-blue/50 dark:text-secondary-200/50" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-voxcina-blue dark:text-secondary-200">
            ترند مورد نظر یافت نشد
          </h1>
          <p className="mb-6 text-voxcina-blue/70 dark:text-secondary-300">
            متأسفانه اطلاعات ترند مورد نظر شما در سیستم موجود نیست.
          </p>
          <Link
            href="/trends"
            className="inline-flex items-center bg-voxcina-blue text-white px-5 py-2.5 rounded-xl hover:bg-voxcina-darkBlue transition-colors shadow-soft"
          >
            <ArrowRight className="ml-2 w-4 h-4" />
            بازگشت به صفحه ترندها
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-voxcina-cream dark:bg-voxcina-darkBlue/90 pb-16 overflow-x-hidden">
      {/* Breadcrumb */}
      <div className="bg-voxcina-blue/5 dark:bg-voxcina-blue/10 py-3 border-b border-secondary-200 dark:border-voxcina-darkBlue/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center text-sm text-voxcina-blue/70 dark:text-secondary-300">
            <Link
              href="/"
              className="hover:text-voxcina-blue dark:hover:text-secondary-200 transition-colors"
            >
              خانه
            </Link>
            <ChevronLeft className="w-4 h-4 mx-2" />
            <Link
              href="/trends"
              className="hover:text-voxcina-blue dark:hover:text-secondary-200 transition-colors"
            >
              ترندها
            </Link>
            <ChevronLeft className="w-4 h-4 mx-2" />
            <span className="text-voxcina-blue dark:text-secondary-200">
              {trendDetail.name}
            </span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="order-2 lg:order-1"
          >
            <div className="grid grid-cols-1 gap-4">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/20 dark:bg-voxcina-blue/10 shadow-medium border border-secondary-200 dark:border-voxcina-darkBlue/30">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700"
                  style={{
                    backgroundImage: `url('/images/trends/gallery/${trendDetail.gallery[activeImageIndex]}')`,
                  }}
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                {trendDetail.gallery.map((image: string, index: number) => (
                  <motion.div
                    key={index}
                    className={`aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      activeImageIndex === index
                        ? "border-voxcina-blue dark:border-secondary-200 shadow-medium"
                        : "border-secondary-200 dark:border-voxcina-darkBlue/30 hover:border-voxcina-blue/60 dark:hover:border-secondary-200/60"
                    }`}
                    onClick={() => setActiveImageIndex(index)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url('/images/trends/gallery/${image}')`,
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Details */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="order-1 lg:order-2"
          >
            <div className="flex items-center mb-4">
              <span className="inline-block px-3 py-1 bg-voxcina-blue/10 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 rounded-full text-sm border border-voxcina-blue/20 dark:border-voxcina-blue/30 shadow-soft">
                {trendDetail.category === "clothing"
                  ? "پوشاک"
                  : trendDetail.category === "accessories"
                  ? "اکسسوری"
                  : trendDetail.category === "footwear"
                  ? "کفش"
                  : trendDetail.category === "colors"
                  ? "رنگ‌ها"
                  : trendDetail.category === "fabric"
                  ? "پارچه‌ها"
                  : trendDetail.category === "sustainability"
                  ? "پایداری"
                  : trendDetail.category}
              </span>
              <div className="flex-grow"></div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <motion.button
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isLiked
                      ? "bg-red-50 dark:bg-red-900/20 text-red-500"
                      : "bg-secondary-100 dark:bg-voxcina-blue/20 text-voxcina-blue/60 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-voxcina-blue/30"
                  } transition-colors`}
                  onClick={toggleLike}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Heart
                    className="w-5 h-5"
                    fill={isLiked ? "currentColor" : "none"}
                  />
                </motion.button>
                <motion.button
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isSaved
                      ? "bg-voxcina-blue text-white"
                      : "bg-secondary-100 dark:bg-voxcina-blue/20 text-voxcina-blue/60 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-voxcina-blue/30"
                  } transition-colors`}
                  onClick={toggleSave}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Bookmark
                    className="w-5 h-5"
                    fill={isSaved ? "currentColor" : "none"}
                  />
                </motion.button>
                <motion.button
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary-100 dark:bg-voxcina-blue/20 text-voxcina-blue/60 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-voxcina-blue/30 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Share className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200">
              {trendDetail.name}
            </h1>

            <div className="flex items-center mb-6">
              <div className="flex items-center ml-6">
                <TrendingUp className="w-5 h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-1" />
                <span className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                  <span className="font-bold text-voxcina-blue dark:text-secondary-200">
                    {trendDetail.popularity}%
                  </span>{" "}
                  محبوبیت
                </span>
              </div>
              <div className="flex items-center ml-6">
                <Calendar className="w-5 h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-1" />
                <span className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                  از سال{" "}
                  <span className="font-bold text-voxcina-blue dark:text-secondary-200">
                    {trendDetail.startedYear}
                  </span>
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-voxcina-blue/60 dark:text-secondary-300 ml-1" />
                <span className="text-sm text-voxcina-blue/70 dark:text-secondary-300">
                  فصل{" "}
                  <span className="font-bold text-voxcina-blue dark:text-secondary-200">
                    {trendDetail.season}
                  </span>
                </span>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4 text-voxcina-blue dark:text-secondary-200">
                درباره این ترند
              </h2>
              <div className="text-voxcina-blue/80 dark:text-secondary-300 leading-relaxed space-y-4">
                {trendDetail.longDescription
                  .split("\n\n")
                  .map((paragraph: string, idx: number) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4 text-voxcina-blue dark:text-secondary-200">
                ایده‌آل برای
              </h2>
              <div className="flex flex-wrap gap-2">
                {trendDetail.idealFor.map((item: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-voxcina-blue/10 shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 text-voxcina-blue/80 dark:text-secondary-300 text-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4 text-voxcina-blue dark:text-secondary-200">
                برچسب‌ها
              </h2>
              <div className="flex flex-wrap gap-2">
                {trendDetail.tags.map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-voxcina-blue/10 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 text-sm"
                  >
                    <Tag className="w-3.5 h-3.5 ml-1" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/shop"
                className="inline-flex items-center bg-voxcina-blue hover:bg-voxcina-darkBlue text-white py-3 px-6 rounded-xl transition-colors shadow-soft hover:shadow-medium"
              >
                <ShoppingBag className="w-5 h-5 ml-2" />
                مشاهده محصولات مرتبط
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Styling Tips Section */}
      <section className="py-16 bg-secondary-100/50 dark:bg-voxcina-blue/5 relative">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
              <span className="relative z-10">راهنمای استایل</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
            </h2>
            <p className="text-voxcina-blue/70 dark:text-secondary-300 max-w-2xl mx-auto">
              چگونه این ترند را به بهترین شکل در استایل روزمره خود استفاده کنید
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {trendDetail.stylingTips.map((tip: string, idx: number) => (
              <motion.div
                key={idx}
                className="bg-white/90 dark:bg-voxcina-blue/10 p-6 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm h-full flex flex-col"
                variants={itemVariant}
                whileHover={{ y: -5 }}
              >
                <div className="w-12 h-12 rounded-full bg-voxcina-blue/10 dark:bg-voxcina-blue/20 flex items-center justify-center text-voxcina-blue dark:text-secondary-200 text-xl font-bold mb-4">
                  {idx + 1}
                </div>
                <p className="text-voxcina-blue/80 dark:text-secondary-300 flex-grow">
                  {tip}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Key Pieces Section */}
      <section className="py-16 container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
            <span className="relative z-10">قطعات کلیدی</span>
            <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
          </h2>
          <p className="text-voxcina-blue/70 dark:text-secondary-300 max-w-2xl mx-auto">
            لباس‌ها و اکسسوری‌های اصلی این ترند که باید در کمد لباس خود داشته
            باشید
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-6 text-voxcina-blue dark:text-secondary-200">
                آیتم‌های ضروری
              </h3>
              <ul className="space-y-4">
                {trendDetail.keyPieces.map((piece: string, idx: number) => (
                  <motion.li
                    key={idx}
                    className="flex items-center"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="w-8 h-8 bg-secondary-200/70 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center text-voxcina-blue dark:text-secondary-200 ml-3 flex-shrink-0">
                      <span className="text-sm font-bold">{idx + 1}</span>
                    </div>
                    <span className="text-voxcina-blue/80 dark:text-secondary-300">
                      {piece}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="bg-white/90 dark:bg-voxcina-blue/10 rounded-2xl shadow-soft border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-6 text-voxcina-blue dark:text-secondary-200">
                برندهای پیشنهادی
              </h3>
              <ul className="space-y-4">
                {trendDetail.brands.map((brand: any, idx: number) => (
                  <motion.li
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-secondary-100 dark:border-voxcina-darkBlue/20 last:border-0"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-voxcina-blue/10 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                        <Store className="w-4 h-4 text-voxcina-blue dark:text-secondary-200" />
                      </div>
                      <div>
                        <h4 className="font-medium text-voxcina-blue dark:text-secondary-200">
                          {brand.name}
                        </h4>
                        <p className="text-xs text-voxcina-blue/60 dark:text-secondary-400">
                          {brand.priceRange}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={brand.link}
                      className="text-voxcina-blue dark:text-secondary-200 text-sm hover:text-primary-500 dark:hover:text-primary-300 transition-colors"
                    >
                      مشاهده
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Related Trends Section */}
      {relatedTrends.length > 0 && (
        <section className="py-16 bg-secondary-100/50 dark:bg-voxcina-blue/5 relative">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-voxcina-blue/5 dark:bg-voxcina-blue/10 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-voxcina-blue dark:text-secondary-200 relative inline-block">
                <span className="relative z-10">ترندهای مرتبط</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
              </h2>
              <p className="text-voxcina-blue/70 dark:text-secondary-300 max-w-2xl mx-auto">
                ترندهای دیگری که می‌توانید با این ترند ترکیب کنید
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {relatedTrends.map((trend, index) => (
                <motion.div
                  key={trend.id}
                  className="rounded-2xl overflow-hidden bg-white/90 dark:bg-voxcina-blue/10 shadow-soft hover:shadow-medium transition-all duration-300 border border-secondary-200 dark:border-voxcina-darkBlue/30 backdrop-blur-sm group"
                  variants={itemVariant}
                  whileHover={{ y: -5 }}
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage: `url('/images/trends/${trend.image}')`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-voxcina-darkBlue/80 to-transparent flex items-end">
                      <div className="p-6">
                        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm mb-3 border border-white/10 shadow-soft">
                          {trend.category === "clothing"
                            ? "پوشاک"
                            : trend.category === "accessories"
                            ? "اکسسوری"
                            : trend.category === "footwear"
                            ? "کفش"
                            : trend.category === "colors"
                            ? "رنگ‌ها"
                            : trend.category === "fabric"
                            ? "پارچه‌ها"
                            : trend.category === "sustainability"
                            ? "پایداری"
                            : trend.category}
                        </span>
                        <h3 className="text-white text-xl font-bold">
                          {trend.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-6">
                      {trend.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="bg-voxcina-blue/10 dark:bg-voxcina-blue/20 text-voxcina-blue dark:text-secondary-200 px-3 py-1 rounded-full text-xs">
                          #{trend.tags[0]}
                        </span>
                      </div>

                      <motion.div
                        whileHover={{ x: -3 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Link
                          href={`/trends/${trend.id}`}
                          className="text-voxcina-blue dark:text-secondary-200 hover:text-voxcina-darkBlue dark:hover:text-white font-medium flex items-center transition-colors"
                        >
                          <span>اطلاعات بیشتر</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </Link>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="container mx-auto py-16 px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="bg-gradient-to-r from-voxcina-blue to-primary-600 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay"></div>

          <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl"></div>

          <motion.div
            className="relative z-10 max-w-2xl mx-auto"
            variants={fadeIn}
          >
            <motion.span
              className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm mb-4 border border-white/5 shadow-soft"
              variants={fadeIn}
            >
              استایل شخصی
            </motion.span>

            <motion.h3
              className="text-3xl md:text-4xl font-bold text-white mb-4 relative"
              variants={fadeIn}
            >
              <span className="relative z-10">استایل خود را بسازید</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-white/20 rounded-full -z-0 opacity-20"></span>
            </motion.h3>

            <motion.p
              className="text-secondary-100 mb-8 max-w-lg mx-auto"
              variants={fadeIn}
            >
              با ترکیب ترندهای مختلف، استایل منحصر به فرد خود را ایجاد کنید و با
              اعتماد به نفس در هر مناسبتی حاضر شوید.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto"
              variants={fadeIn}
            >
              <motion.a
                href="/shop"
                className="bg-white text-voxcina-blue px-8 py-4 rounded-xl hover:bg-white/90 transition-colors font-medium shadow-soft hover:shadow-medium flex-1 text-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                خرید محصولات
              </motion.a>

              <motion.a
                href="/fashion-consultant"
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl hover:bg-white/10 transition-colors font-medium flex-1 text-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                مشاوره استایل
              </motion.a>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer Decoration */}
      <div className="h-16 bg-gradient-to-t from-voxcina-blue to-voxcina-blue/70 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-1/3 w-64 h-64 bg-secondary-200/10 rounded-full blur-3xl"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-secondary-200/20"></div>
      </div>
    </div>
  );
}
