export const APP_NAME = "وکسینا | Voxcina";
export const SEO_DEFAULT_TITLE = "وکسینا | فروشگاه اینترنتی لباس و پوشاک | خرید آنلاین مد و استایل";
export const APP_DESCRIPTION = "وکسینا، فروشگاه آنلاین پوشاک و مد | جدیدترین لباس‌های مردانه، زنانه و بچگانه با تخفیف ویژه و ارسال سریع";

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
    { label: "بلاگ", href: "/blog" },
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
    { label: "اینستاگرام", href: "https://instagram.com/voxcina" },
    { label: "تلگرام", href: "https://telegram.org" },
    { label: "توییتر", href: "https://x.com/voxcina" },
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

export const PAYMENT_METHODS = [
  {
    id: "online",
    title: "پرداخت آنلاین",
    description: "پرداخت با کارت‌های شتاب از طریق درگاه بانکی",
  },
];

export const PAYMENT_GATEWAYS: Array<{
  id: string;
  name: string;
  logo: string;
  mobileLogo?: string;
  enabled: boolean;
  description: string;
  features: string[];
}> = [
  {
    id: "zibal",
    name: "زیبال",
    logo: "/images/payment/zibal.svg",
    enabled: true,
    description: "پرداخت آنلاین با کارت بانکی",
    features: ["online"],
  },
  {
    id: "digipay",
    name: "دیجی‌پی",
    logo: "/images/payment/digipay.svg",
    enabled: true,
    description: "اعتبار خرید، کیف پول یا پرداخت ۴ قسطه بدون نیاز به ضامن",
    features: ["credit", "wallet", "installments"],
  },
  {
    id: "snappay",
    name: "اسنپ‌پی",
    logo: "/images/payment/snappay-official-desktop.svg",
    mobileLogo: "/images/payment/snappay-official-mobile.svg",
    enabled: true,
    description: "پرداخت اعتباری و اقساطی اسنپ‌پی",
    features: [],
  },
  {
    id: "zarinpal",
    name: "زرین‌پال",
    logo: "/images/payment/zarinpal.svg",
    enabled: false,
    description: "",
    features: [],
  },
  {
    id: "mellat",
    name: "به‌پرداخت ملت",
    logo: "/images/payment/mellat.svg",
    enabled: false,
    description: "",
    features: [],
  },
];
