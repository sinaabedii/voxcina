export const APP_NAME = "دیجی استایل";
export const APP_DESCRIPTION = "فروشگاه آنلاین پوشاک و مد";

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
    { label: "همکاری با ما", href: "/careers" },
    { label: "فرصت‌های شغلی", href: "/jobs" },
  ],
  customerService: [
    { label: "راهنمای خرید", href: "/guide" },
    { label: "نحوه ارسال", href: "/shipping" },
    { label: "پیگیری سفارش", href: "/tracking" },
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

export const SHIPPING_METHODS = [
  {
    id: "express",
    title: "ارسال سریع",
    description: "تحویل در ۱ الی ۲ روز کاری",
    price: 250000,
  },
  {
    id: "standard",
    title: "ارسال استاندارد",
    description: "تحویل در ۳ الی ۵ روز کاری",
    price: 150000,
  },
  {
    id: "economic",
    title: "ارسال اقتصادی",
    description: "تحویل در ۷ الی ۱۰ روز کاری",
    price: 90000,
  },
];

export const PAYMENT_METHODS = [
  {
    id: "online",
    title: "پرداخت آنلاین",
    description: "پرداخت با کارت‌های شتاب از طریق درگاه بانکی",
  },
  {
    id: "wallet",
    title: "کیف پول",
    description: "پرداخت از طریق کیف پول دیجی استایل",
  },
  {
    id: "cod",
    title: "پرداخت در محل",
    description: "پرداخت هنگام تحویل سفارش",
  },
];
