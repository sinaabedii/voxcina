import { Slider } from "@/types/slider";

export const APP_NAME = "وکسینا | Voxcina";
export const SEO_DEFAULT_TITLE = "وکسینا | فروشگاه اینترنتی لباس و پوشاک | خرید آنلاین مد و استایل";
export const APP_DESCRIPTION = "وکسینا، فروشگاه آنلاین پوشاک و مد | جدیدترین لباس‌های مردانه، زنانه و بچگانه با تخفیف ویژه و ارسال سریع";

export const NAV_ITEMS = [
  {
    label: "خانه",
    href: "/",
  },
  {
    label: "مردانه",
    href: "/categories/men",
    children: [
      {
        label: "پیراهن مردانه",
        href: "/categories/men-shirts",
      },
      {
        label: "شلوار مردانه",
        href: "/categories/men-pants",
      },
      {
        label: "کت و ژاکت مردانه",
        href: "/categories/men-jackets",
      },
      {
        label: "کفش مردانه",
        href: "/categories/men-shoes",
      },
      {
        label: "اکسسوری مردانه",
        href: "/categories/men-accessories",
      },
    ],
  },
  {
    label: "زنانه",
    href: "/categories/women",
    children: [
      {
        label: "لباس زنانه",
        href: "/categories/women-dresses",
      },
      {
        label: "شلوار زنانه",
        href: "/categories/women-pants",
      },
      {
        label: "کفش زنانه",
        href: "/categories/women-shoes",
      },
      {
        label: "کیف زنانه",
        href: "/categories/women-bags",
      },
      {
        label: "اکسسوری زنانه",
        href: "/categories/women-accessories",
      },
    ],
  },
  {
    label: "بچگانه",
    href: "/categories/kids",
  },
  {
    label: "اکسسوری",
    href: "/categories/accessories",
  },
  {
    label: "ورزشی",
    href: "/categories/sports",
  },
  {
    label: "تخفیف‌ها",
    href: "/sales",
  },
];

export const FOOTER_LINKS = {
  categories: [
    { label: "مردانه", href: "/categories/men" },
    { label: "زنانه", href: "/categories/women" },
    { label: "بچگانه", href: "/categories/kids" },
    { label: "اکسسوری", href: "/categories/accessories" },
    { label: "ورزشی", href: "/categories/sports" },
  ],
  aboutUs: [
    { label: "درباره ما", href: "/about" },
    { label: "تماس با ما", href: "/contact" },
    { label: "فرصت‌های شغلی", href: "/careers" },
  ],
  customerService: [
    { label: "راهنمای خرید", href: "/shoppingGuide" }, // Changed from /guide to /shoppingGuide
    { label: "نحوه ارسال", href: "/shipping" },
    { label: "پیگیری سفارش", href: "/orderTracking" }, // Changed from /tracking to /orderTracking
    { label: "شرایط بازگشت", href: "/returns" },
    { label: "پرسش‌های متداول", href: "/faq" },
  ],
  socialMedia: [
    { label: "اینستاگرام", href: "https://instagram.com" },
    { label: "تلگرام", href: "https://telegram.org" },
    { label: "توییتر", href: "https://twitter.com" },
    { label: "یوتیوب", href: "https://youtube.com" },
  ],
};

export const SORT_OPTIONS = [
  { label: "پرفروش‌ترین", value: "popular" },
  { label: "جدیدترین", value: "newest" },
  { label: "گران‌ترین", value: "price-desc" },
  { label: "ارزان‌ترین", value: "price-asc" },
  { label: "بیشترین تخفیف", value: "discount" },
];

export const PROVINCES = [
  "تهران",
  "اصفهان",
  "مشهد",
  "شیراز",
  "تبریز",
  "کرج",
  "اهواز",
  "قم",
  "کرمانشاه",
  "ارومیه",
  "رشت",
  "زاهدان",
  "همدان",
  "کرمان",
  "یزد",
  "اردبیل",
  "بندرعباس",
  "اراک",
  "زنجان",
  "ساری",
  "قزوین",
  "خرم‌آباد",
  "گرگان",
  "سنندج",
  "بجنورد",
  "بیرجند",
  "بوشهر",
  "ایلام",
  "سمنان",
  "یاسوج",
  "شهرکرد",
];

export const DEMO_BANNERS = [
  {
    id: 1,
    title: "کالکشن جدید ",
    description: "تا ۳۰٪ تخفیف برای محصولات جدید",
    imageUrl: "/images/banners/summer-collection.jpg",
    href: "/categories/summer",
  },
  {
    id: 2,
    title: "فروش ویژه کفش‌های اسپرت",
    description: "تخفیف استثنایی برای انواع کفش‌های ورزشی",
    imageUrl: "/images/banners/sport-shoes.jpg",
    href: "/categories/sport-shoes",
  },
  {
    id: 3,
    title: "پیشنهاد‌های شگفت‌انگیز",
    description: "هر روز محصولات ویژه با تخفیف باور نکردنی",
    imageUrl: "/images/banners/special-offer.jpg",
    href: "/sales",
  },
];

export const PAYMENT_METHODS = [
  {
    id: "online",
    title: "پرداخت آنلاین",
    description: "پرداخت با کارت‌های شتاب از طریق درگاه بانکی",
  },
];

export const PAYMENT_GATEWAYS = [
  {
    id: "zibal",
    name: "زیبال",
    logo: "/images/payment/zibal.png",
    enabled: true,
  },
  {
    id: "digipay",
    name: "دیجی‌پی",
    logo: "/images/payment/digipay.png",
    enabled: true,
  },
  {
    id: "zarinpal",
    name: "زرین‌پال",
    logo: "/images/payment/zarinpal.png",
    enabled: false, // Not implemented yet
  },
  {
    id: "mellat",
    name: "به‌پرداخت ملت",
    logo: "/images/payment/mellat.png",
    enabled: false, // Not implemented yet
  },
];

export const fallbackSliders: Slider[] = [
  {
    id: "1",
    title: "کالکشن پاییز 2025",
    subtitle: "رنگ‌های گرم و طراحی‌های منحصربفرد",
    description: "با الهام از طبیعت پاییز، مجموعه‌ای از پوشاک با کیفیت عالی",
    image: "/images/slider/slider_autumn.avif",
    buttonText: "کاوش کنید",
    buttonLink: "/collections/autumn-2025",
    badge: "جدید",
    bgColor: "from-amber-900 via-orange-800 to-red-900",
    accentColor: "from-amber-400 to-orange-500",
    discount: "-30%",
    features: ["ارسال رایگان", "ضمانت اصالت", "بازگشت آسان"],
    stats: { items: "250+", brands: "15", reviews: "4.9" },
  },
  {
    id: "2",
    title: "تخفیف ویژه برندها",
    subtitle: "تا 70% تخفیف روی محبوب‌ترین برندها",
    description: "فرصت استثنایی برای خرید از برندهای معتبر جهانی",
    image: "/images/slider/special-offers-and-discounts.webp",
    buttonText: "خرید کنید",
    buttonLink: "/sales/brands",
    badge: "فروش ویژه",
    bgColor: "from-rose-900 via-pink-800 to-purple-900",
    accentColor: "from-rose-400 to-pink-500",
    discount: "-70%",
    features: ["محدودیت زمانی", "برندهای اصل", "تنوع بالا"],
    stats: { items: "500+", brands: "30", reviews: "4.8" },
  },
  {
    id: "3",
    title: "استایل اداری شیک",
    subtitle: "برای روزهای کاری پرانرژی",
    description: "ترکیب زیبایی و حرفه‌ای بودن در یک مجموعه",
    image: "/images/slider/office-wear-for-men.webp",
    buttonText: "مشاهده استایل‌ها",
    buttonLink: "/collections/office",
    badge: "ترند",
    bgColor: "from-slate-900 via-gray-800 to-zinc-900",
    accentColor: "from-slate-400 to-gray-500",
    discount: "NEW",
    features: ["طراحی مدرن", "راحتی کامل", "کیفیت عالی"],
    stats: { items: "150+", brands: "10", reviews: "4.7" },
  },
  {
    id: "4",
    title: "لوازم جانبی لوکس",
    subtitle: "کیف، کفش و جواهرات برندهای معتبر",
    description: "تکمیل کننده استایل شما با محصولات لوکس",
    image: "/images/slider/acces-loxs.jpg",
    buttonText: "مجموعه لوکس",
    buttonLink: "/collections/luxury",
    badge: "پریمیوم",
    bgColor: "from-indigo-900 via-purple-800 to-pink-900",
    accentColor: "from-indigo-400 to-purple-500",
    discount: "VIP",
    features: ["برندهای لوکس", "گارانتی اصالت", "بسته‌بندی ویژه"],
    stats: { items: "100+", brands: "20", reviews: "5.0" },
  },
];
