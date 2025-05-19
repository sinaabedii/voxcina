"use client";


// This is a placeholder component that will be developed later
export default function SummerCategoryPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Summer Collection</h1>
      <p className="text-muted-foreground">
        This page is under development. Check back soon for our summer collection!
      </p>
    </div>
  );
}
// import { useEffect, useState, useRef } from "react";
// import { motion, useScroll, useTransform } from "framer-motion";
// import { Product, ProductColor, Review, ProductFilter } from "@/types/product";

// // Define a specific type for filters to make priceRange required
// type SummerFilters = {
//   priceRange: { min: number; max: number };
//   colors: string[];
//   sizes: string[];
//   sort: "price-asc" | "price-desc" | "newest" | "rating" | "popular";
// };

// // Demo Review data to satisfy Review interface
// const DEMO_REVIEWS: Review[] = [
//   {
//     id: "rev1",
//     productId: "1",
//     userId: "user1",
//     userName: "علی",
//     rating: 4,
//     title: "عالی",
//     comment: "محصول بسیار خوبی است، کیفیت پارچه عالی است.",
//     date: "2025-05-01",
//     likes: 5,
//     dislikes: 0,
//     verified: true,
//   },
//   {
//     id: "rev2",
//     productId: "1",
//     userId: "user2",
//     userName: "مریم",
//     rating: 5,
//     title: "خیلی شیک",
//     comment: "طراحی زیبا و مناسب تابستان.",
//     date: "2025-05-02",
//     likes: 3,
//     dislikes: 1,
//     verified: true,
//   },
// ];

// // Updated DEMO_SUMMER_PRODUCTS to match Product interface
// const DEMO_SUMMER_PRODUCTS: Product[] = [
//   {
//     id: "1",
//     name: "پیراهن آستین کوتاه طرح هاوایی",
//     description: "پیراهن آستین کوتاه با طرح هاوایی، مناسب برای استایل تابستانی.",
//     price: 1290000,
//     images: ["summer-shirt-1.jpg", "summer-shirt-1-alt1.jpg", "summer-shirt-1-alt2.jpg"],
//     category: "پیراهن مردانه",
//     categoryId: "1",
//     brand: "SummerVibes",
//     inStock: true,
//     sizes: ["S", "M", "L", "XL"],
//     colors: [
//       { name: "آبی", code: "#0000FF" },
//       { name: "سبز", code: "#008000" },
//       { name: "قرمز", code: "#FF0000" },
//     ],
//     rating: 4.5,
//     reviewCount: 2,
//     isNew: true,
//     createdAt: "2025-05-01",
//     updatedAt: "2025-05-01",
//     reviews: DEMO_REVIEWS, // Fixed: Corrected DEMO_REV to DEMO_REVIEWS and added comma
//     discountPercentage: 15,
//     stockCount: 100,
//     sku: "SHIRT-HAWAII-001",
//     material: "پنبه",
//     weight: { value: 300, unit: "g" },
//   },
//   {
//     id: "2",
//     name: "تاپ آستین حلقه‌ای زنانه",
//     description: "تاپ راحت و سبک زنانه، ایده‌آل برای روزهای گرم تابستان.",
//     price: 890000,
//     images: ["summer-top-1.jpg", "summer-top-1-alt1.jpg", "summer-top-1-alt2.jpg"],
//     category: "تاپ زنانه",
//     categoryId: "2",
//     brand: "CoolBreeze",
//     inStock: true,
//     sizes: ["XS", "S", "M", "L"],
//     colors: [
//       { name: "زرد", code: "#FFFF00" },
//       { name: "صورتی", code: "#FF69B4" },
//       { name: "سفید", code: "#FFFFFF" },
//     ],
//     rating: 4.2,
//     reviewCount: 1,
//     isNew: true,
//     createdAt: "2025-05-01",
//     updatedAt: "2025-05-01",
//     reviews: [DEMO_REVIEWS[0]],
//     discountPercentage: 0,
//     stockCount: 80,
//     sku: "TOP-WOMEN-001",
//     material: "پنبه و پلی‌استر",
//     weight: { value: 200, unit: "g" },
//   },
//   {
//     id: "3",
//     name: "شلوارک جین مردانه",
//     description: "شلوارک جین با دوام و راحت، مناسب برای استفاده روزمره.",
//     price: 1490000,
//     images: ["summer-shorts-1.jpg", "summer-shorts-1-alt1.jpg", "summer-shorts-1-alt2.jpg"],
//     category: "شلوارک مردانه",
//     categoryId: "3",
//     brand: "DenimCo",
//     inStock: true,
//     sizes: ["S", "M", "L", "XL", "XXL"],
//     colors: [
//       { name: "آبی تیره", code: "#00008B" },
//       { name: "خاکستری", code: "#808080" },
//       { name: "مشکی", code: "#000000" },
//     ],
//     rating: 4.7,
//     reviewCount: 2,
//     isNew: false,
//     createdAt: "2025-05-01",
//     updatedAt: "2025-05-01",
//     reviews: DEMO_REVIEWS,
//     discountPercentage: 20,
//     stockCount: 120,
//     sku: "SHORTS-DENIM-001",
//     material: "جین",
//     weight: { value: 500, unit: "g" },
//   },
//   {
//     id: "4",
//     name: "پیراهن آستین بلند سفید مردانه",
//     description: "پیراهن سفید کلاسیک با پارچه خنک برای تابستان.",
//     price: 1590000,
//     images: ["summer-shirt-2.jpg", "summer-shirt-2-alt1.jpg", "summer-shirt-2-alt2.jpg"],
//     category: "پیراهن مردانه",
//     categoryId: "1",
//     brand: "ClassicWear",
//     inStock: true,
//     sizes: ["S", "M", "L", "XL"],
//     colors: [
//       { name: "سفید", code: "#FFFFFF" },
//       { name: "آبی روشن", code: "#ADD8E6" },
//       { name: "خاکستری روشن", code: "#D3D3D3" },
//     ],
//     rating: 4.8,
//     reviewCount: 1,
//     isNew: false,
//     createdAt: "2025-05-01",
//     updatedAt: "2025-05-01",
//     reviews: [DEMO_REVIEWS[1]],
//     discountPercentage: 0,
//     stockCount: 90,
//     sku: "SHIRT-WHITE-002",
//     material: "پنبه",
//     weight: { value: 350, unit: "g" },
//   },
//   {
//     id: "5",
//     name: "لباس ساحلی زنانه گلدار",
//     description: "لباس ساحلی گلدار با طراحی شیک و پارچه سبک.",
//     price: 1790000,
//     images: ["summer-dress-1.jpg", "summer-dress-1-alt1.jpg", "summer-dress-1-alt2.jpg"],
//     category: "لباس ساحلی",
//     categoryId: "4",
//     brand: "BeachBloom",
//     inStock: true,
//     sizes: ["XS", "S", "M", "L"],
//     colors: [
//       { name: "صورتی", code: "#FF69B4" },
//       { name: "آبی", code: "#0000FF" },
//       { name: "زرد", code: "#FFFF00" },
//     ],
//     rating: 4.3,
//     reviewCount: 1,
//     isNew: true,
//     createdAt: "2025-05-01",
//     updatedAt: "2025-05-01",
//     reviews: [DEMO_REVIEWS[0]],
//     discountPercentage: 10,
//     stockCount: 70,
//     sku: "DRESS-FLORAL-001",
//     material: "شیفون",
//     weight: { value: 250, unit: "g" },
//   },
//   {
//     id: "6",
//     name: "کلاه حصیری تابستانی",
//     description: "کلاه حصیری شیک برای محافظت از آفتاب تابستان.",
//     price: 590000,
//     images: ["summer-hat-1.jpg", "summer-hat-1-alt1.jpg", "summer-hat-1-alt2.jpg"],
//     category: "اکسسوری",
//     categoryId: "5",
//     brand: "SunShade",
//     inStock: true,
//     sizes: ["S", "M", "L"],
//     colors: [
//       { name: "بژ", code: "#F5F5DC" },
//       { name: "قهوه‌ای", code: "#8B4513" },
//       { name: "سفید", code: "#FFFFFF" },
//     ],
//     rating: 4.1,
//     reviewCount: 1,
//     isNew: false,
//     createdAt: "2025-05-01",
//     updatedAt: "2025-05-01",
//     reviews: [DEMO_REVIEWS[1]],
//     discountPercentage: 0,
//     stockCount: 150,
//     sku: "HAT-STRAW-001",
//     material: "حصیر",
//     weight: { value: 150, unit: "g" },
//   },
//   {
//     id: "7",
//     name: "شلوار راحتی نخی مردانه",
//     description: "شلوار نخی راحت برای استفاده روزمره در تابستان.",
//     price: 1290000,
//     images: ["summer-pants-1.jpg", "summer-pants-1-alt1.jpg", "summer-pants-1-alt2.jpg"],
//     category: "شلوار مردانه",
//     categoryId: "6",
//     brand: "EasyWear",
//     inStock: true,
//     sizes: ["S", "M", "L", "XL", "XXL"],
//     colors: [
//       { name: "خاکستری", code: "#808080" },
//       { name: "آبی تیره", code: "#00008B" },
//       { name: "مشکی", code: "#000000" },
//     ],
//     rating: 4.4,
//     reviewCount: 1,
//     isNew: false,
//     createdAt: "2025-05-01",
//     updatedAt: "2025-05-01",
//     reviews: [DEMO_REVIEWS[0]],
//     discountPercentage: 5,
//     stockCount: 110,
//     sku: "PANTS-COTTON-001",
//     material: "پنبه",
//     weight: { value: 400, unit: "g" },
//   },
//   {
//     id: "8",
//     name: "دامن کوتاه تابستانی",
//     description: "دامن کوتاه با طراحی مدرن و پارچه خنک.",
//     price: 980000,
//     images: ["summer-skirt-1.jpg", "summer-skirt-1-alt1.jpg", "summer-skirt-1-alt2.jpg"],
//     category: "دامن زنانه",
//     categoryId: "7",
//     brand: "ChicStyle",
//     inStock: true,
//     sizes: ["XS", "S", "M", "L"],
//     colors: [
//       { name: "صورتی", code: "#FF69B4" },
//       { name: "سفید", code: "#FFFFFF" },
//       { name: "آبی", code: "#0000FF" },
//     ],
//     rating: 4.6,
//     reviewCount: 1,
//     isNew: true,
//     createdAt: "2025-05-01",
//     updatedAt: "2025-05-01",
//     reviews: [DEMO_REVIEWS[1]],
//     discountPercentage: 0,
//     stockCount: 85,
//     sku: "SKIRT-SUMMER-001",
//     material: "پنبه و پلی‌استر",
//     weight: { value: 200, unit: "g" },
//   },
//   {
//     id: "9",
//     name: "سوئیشرت نخی سبک",
//     description: "سوئیشرت سبک و راحت برای شب‌های خنک تابستان.",
//     price: 1390000,
//     images: ["summer-sweatshirt-1.jpg", "summer-sweatshirt-1-alt1.jpg", "summer-sweatshirt-1-alt2.jpg"],
//     category: "سوئیشرت",
//     categoryId: "8",
//     brand: "CozyFit",
//     inStock: true,
//     sizes: ["S", "M", "L", "XL"],
//     colors: [
//       { name: "آبی", code: "#0000FF" },
//       { name: "خاکستری", code: "#808080" },
//       { name: "مشکی", code: "#000000" },
//     ],
//     rating: 4.2,
//     reviewCount: 1,
//     isNew: false,
//     createdAt: "2025-05-01",
//     updatedAt: "2025-05-01",
//     reviews: [DEMO_REVIEWS[0]],
//     discountPercentage: 15,
//     stockCount: 95,
//     sku: "SWEATSHIRT-LIGHT-001",
//     material: "پنبه",
//     weight: { value: 300, unit: "g" },
//   },
// ];

// export default function SummerCollection() {
//   // Updated: Use SummerFilters type to ensure priceRange is required
//   const [filters, setFilters] = useState<SummerFilters>({
//     priceRange: { min: 0, max: 5000000 },
//     colors: [],
//     sizes: [],
//     sort: "newest",
//   });

//   const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [products, setProducts] = useState<Product[]>([]);
//   const heroRef = useRef(null);

//   const { scrollYProgress } = useScroll({
//     target: heroRef,
//     offset: ["start start", "end start"],
//   });

//   const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
//   const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

//   const fadeIn = {
//     hidden: { opacity: 0, y: 20 },
//     visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
//   };

//   const staggerContainer = {
//     hidden: { opacity: 0 },
//     visible: {
//       opacity: 1,
//       transition: {
//         staggerChildren: 0.1,
//       },
//     },
//   };

//   const itemVariant = {
//     hidden: { opacity: 0, y: 20 },
//     visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
//   };

//   useEffect(() => {
//     const fetchProducts = async () => {
//       setIsLoading(true);
//       setTimeout(() => {
//         setProducts(DEMO_SUMMER_PRODUCTS);
//         setIsLoading(false);
//       }, 1000);
//     };

//     fetchProducts();
//   }, []);

//   const handleFilterChange = (filterType: string, value: any) => {
//     setFilters((prev) => ({
//       ...prev,
//       [filterType]: value,
//     }));
//   };

//   const showProductDetails = (product: Product) => {
//     setSelectedProduct(product);
//     document.body.style.overflow = "hidden";
//   };

//   const closeProductDetails = () => {
//     setSelectedProduct(null);
//     document.body.style.overflow = "unset";
//   };

//   return (
//     <div className="min-h-screen pb-16 overflow-x-hidden">
//       <section
//         ref={heroRef}
//         className="relative h-[60vh] md:h-[80vh] overflow-hidden"
//       >
//         <motion.div
//           className="absolute inset-0 bg-[url('/images/banners/summer-collection-hero.jpg')] bg-cover bg-center"
//           style={{ y: heroY }}
//         />
//         <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60 mix-blend-multiply" />

//         <motion.div
//           className="relative h-full w-full container mx-auto flex items-center"
//           style={{ opacity: heroOpacity }}
//         >
//           <div className="max-w-2xl text-white z-10 p-6 md:p-0">
//             <motion.span
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.7 }}
//               className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-sm text-sm mb-4 border border-white/20"
//             >
//               #تابستان_۱۴۰۴
//             </motion.span>

//             <motion.h1
//               initial={{ opacity: 0, y: 30 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.7, delay: 0.2 }}
//               className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
//             >
//               کالکشن{" "}
//               <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200">
//                 تابستانه ۱۴۰۴
//               </span>
//             </motion.h1>

//             <motion.p
//               initial={{ opacity: 0, y: 30 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.7, delay: 0.4 }}
//               className="text-lg md:text-xl mb-8 text-gray-100"
//             >
//               با مجموعه منحصر به فرد تابستانه ما، استایل تابستانی خود را به سطح
//               جدیدی ارتقا دهید. ترکیبی از رنگ‌های روشن، پارچه‌های سبک و
//               طراحی‌های مدرن که برای روزهای گرم تابستان ایده‌آل هستند.
//             </motion.p>

//             <motion.div
//               initial={{ opacity: 0, y: 30 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.7, delay: 0.6 }}
//               className="flex flex-wrap gap-4"
//             >
//               <a
//                 href="#products"
//                 className="bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-opacity-90 transition-all duration-300 hover:shadow-lg inline-block"
//               >
//                 مشاهده محصولات
//               </a>

//               <a
//                 href="#trends"
//                 className="backdrop-blur-md bg-white/10 text-white border border-white/20 px-8 py-4 rounded-full font-medium hover:bg-white/20 transition-all duration-300 inline-block"
//               >
//                 ترندهای تابستان
//               </a>
//             </motion.div>
//           </div>
//         </motion.div>

//         <motion.div
//           className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 1.2, duration: 0.8 }}
//         >
//           <span className="text-white/70 mb-2 text-sm">اسکرول کنید</span>
//           <span className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-1">
//             <motion.span
//               className="w-1.5 h-1.5 bg-white rounded-full"
//               animate={{ y: [0, 12, 0] }}
//               transition={{
//                 repeat: Infinity,
//                 duration: 1.5,
//                 ease: "easeInOut",
//               }}
//             />
//           </span>
//         </motion.div>
//       </section>

//       <section id="trends" className="container mx-auto py-20">
//         <motion.div
//           initial="hidden"
//           whileInView="visible"
//           viewport={{ once: true, margin: "-100px" }}
//           variants={fadeIn}
//           className="text-center mb-16"
//         >
//           <motion.h2
//             className="text-3xl md:text-4xl font-bold mb-6"
//             variants={fadeIn}
//           >
//             ترندهای تابستان ۱۴۰۴
//           </motion.h2>
//           <motion.p
//             className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
//             variants={fadeIn}
//           >
//             تابستان امسال با چه ترندهایی همراه است؟ رنگ‌های روشن، پارچه‌های سبک،
//             و طرح‌های جذاب که در فشن شو‌های معتبر دنیا به نمایش گذاشته شده‌اند.
//           </motion.p>
//         </motion.div>

//         <motion.div
//           className="grid grid-cols-1 md:grid-cols-3 gap-8"
//           variants={staggerContainer}
//           initial="hidden"
//           whileInView="visible"
//           viewport={{ once: true, margin: "-100px" }}
//         >
//           {SUMMER_TRENDS.map((trend, index) => (
//             <motion.div
//               key={index}
//               className="relative rounded-xl overflow-hidden aspect-[4/5] group"
//               variants={itemVariant}
//             >
//               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70 z-10" />
//               <div
//                 className="absolute inset-0 bg-[url('/images/trends/trend-placeholder.jpg')] bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
//                 style={{
//                   backgroundImage: `url('/images/trends/${trend.image}')`,
//                 }}
//               />

//               <div className="absolute inset-x-0 bottom-0 p-6 z-20 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
//                 <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm mb-3">
//                   {trend.category}
//                 </span>
//                 <h3 className="text-2xl font-bold text-white mb-2">
//                   {trend.title}
//                 </h3>
//                 <p className="text-white/80 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
//                   {trend.description}
//                 </p>
//                 <div className="h-0.5 w-0 bg-amber-300 group-hover:w-24 transition-all duration-500" />
//               </div>
//             </motion.div>
//           ))}
//         </motion.div>
//       </section>

//       <section id="products" className="container mx-auto py-16">
//         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
//           <div className="lg:col-span-1">
//             <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
//               <h3 className="text-xl font-bold mb-6 pb-3 border-b">فیلترها</h3>

//               <div className="mb-8">
//                 <h4 className="font-medium mb-4">محدوده قیمت</h4>
//                 <div className="flex flex-col space-y-2">
//                   <div className="flex justify-between text-sm text-gray-500">
//                     <span>۰ تومان</span>
//                     <span>۵,۰۰۰,۰۰۰ تومان</span>
//                   </div>
//                   <input
//                     type="range"
//                     min="0"
//                     max="5000000"
//                     step="100000"
//                     className="w-full accent-primary"
//                     value={filters.priceRange.max}
//                     onChange={(e) =>
//                       handleFilterChange("priceRange", {
//                         min: 0,
//                         max: parseInt(e.target.value),
//                       })
//                     }
//                   />
//                   <div className="text-sm">
//                     تا{" "}
//                     <span className="font-medium">
//                       {filters.priceRange.max.toLocaleString("fa-IR")} تومان
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               <div className="mb-8">
//                 <h4 className="font-medium mb-4">رنگ</h4>
//                 <div className="flex flex-wrap gap-2">
//                   {[
//                     { name: "سفید", code: "#FFFFFF" },
//                     { name: "مشکی", code: "#000000" },
//                     { name: "قرمز", code: "#FF0000" },
//                     { name: "آبی", code: "#0000FF" },
//                     { name: "سبز", code: "#008000" },
//                     { name: "زرد", code: "#FFFF00" },
//                     { name: "صورتی", code: "#FF69B4" },
//                     { name: "بنفش", code: "#800080" },
//                   ].map((color, index) => (
//                     <button
//                       key={index}
//                       className={`w-8 h-8 rounded-full`}
//                       style={{ backgroundColor: color.code }}
//                       onClick={() => {
//                         const newColors = filters.colors.includes(color.name)
//                           ? filters.colors.filter((c) => c !== color.name)
//                           : [...filters.colors, color.name];
//                         handleFilterChange("colors", newColors);
//                       }}
//                     />
//                   ))}
//                 </div>
//               </div>

//               <div className="mb-8">
//                 <h4 className="font-medium mb-4">سایز</h4>
//                 <div className="flex flex-wrap gap-2">
//                   {["XS", "S", "M", "L", "XL", "XXL"].map((size, index) => (
//                     <button
//                       key={size}
//                       className={`w-10 h-10 flex items-center justify-center border rounded-md ${
//                         filters.sizes.includes(size)
//                           ? "bg-primary text-white border-primary"
//                           : "border-gray-300 dark:border-gray-600"
//                       }`}
//                       onClick={() => {
//                         const newSizes = filters.sizes.includes(size)
//                           ? filters.sizes.filter((s) => s !== size)
//                           : [...filters.sizes, size];
//                         handleFilterChange("sizes", newSizes);
//                       }}
//                     >
//                       {size}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               <div>
//                 <h4 className="font-medium mb-4">مرتب‌سازی بر اساس</h4>
//                 <select
//                   className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent"
//                   value={filters.sort}
//                   onChange={(e) => handleFilterChange("sort", e.target.value)}
//                 >
//                   <option value="newest">جدیدترین</option>
//                   <option value="price-asc">قیمت: کم به زیاد</option>
//                   <option value="price-desc">قیمت: زیاد به کم</option>
//                   <option value="rating">محبوب‌ترین</option>
//                 </select>
//               </div>
//             </div>
//           </div>

//           <div className="lg:col-span-3">
//             <div className="flex justify-between items-center mb-8">
//               <h2 className="text-2xl md:text-3xl font-bold">
//                 محصولات تابستانه
//               </h2>
//               <div className="text-sm text-gray-500">
//                 {products.length} محصول
//               </div>
//             </div>

//             {isLoading ? (
//               <div className="h-96 flex items-center justify-center">
//                 <div className="relative w-16 h-16">
//                   <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
//                   <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
//                 </div>
//               </div>
//             ) : (
//               <motion.div
//                 className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
//                 variants={staggerContainer}
//                 initial="hidden"
//                 whileInView="visible"
//                 viewport={{ once: true, margin: "-100px" }}
//               >
//                 {products.map((product) => (
//                   <motion.div
//                     key={product.id}
//                     className="group cursor-pointer"
//                     variants={itemVariant}
//                     onClick={() => showProductDetails(product)}
//                   >
//                     <div className="relative rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-300 h-full">
//                       <div className="aspect-[3/4] relative overflow-hidden bg-gray-100">
//                         <div
//                           className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
//                           style={{
//                             backgroundImage: `url('/images/products/${product.images[0]}')`,
//                           }}
//                         />

//                         {product.isNew && (
//                           <div className="absolute top-3 right-3 bg-amber-400 text-black px-3 py-1 rounded-full text-xs font-medium z-10">
//                             جدید
//                           </div>
//                         )}
//                         {product.discountPercentage && product.discountPercentage > 0 && (
//                           <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10">
//                             {product.discountPercentage}% تخفیف
//                           </div>
//                         )}

//                         <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
//                           <div className="flex justify-between">
//                             <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
//                               <svg
//                                 xmlns="http://www.w3.org/2000/svg"
//                                 className="h-5 w-5"
//                                 fill="none"
//                                 viewBox="0 0 24 24"
//                                 stroke="currentColor"
//                               >
//                                 <path
//                                   strokeLinecap="round"
//                                   strokeLinejoin="round"
//                                   strokeWidth={2}
//                                   d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
//                                 />
//                               </svg>
//                             </button>

//                             <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
//                               <svg
//                                 xmlns="http://www.w3.org/2000/svg"
//                                 className="h-5 w-5"
//                                 fill="none"
//                                 viewBox="0 0 24 24"
//                                 stroke="currentColor"
//                               >
//                                 <path
//                                   strokeLinecap="round"
//                                   strokeLinejoin="round"
//                                   strokeWidth={2}
//                                   d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
//                                 />
//                               </svg>
//                             </button>
//                           </div>
//                         </div>
//                       </div>

//                       <div className="p-4">
//                         <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-1">
//                           {product.name}
//                         </h3>
//                         <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
//                           {product.category}
//                         </p>

//                         <div className="flex justify-between items-center">
//                           <div className="flex items-center">
//                             {product.discountPercentage && product.discountPercentage > 0 ? (
//                               <>
//                                 <span className="text-primary font-bold">
//                                   {Math.round(
//                                     product.price * (1 - product.discountPercentage / 100)
//                                   ).toLocaleString("fa-IR")}{" "}
//                                   تومان
//                                 </span>
//                                 <span className="text-gray-400 line-through text-sm mr-2">
//                                   {product.price.toLocaleString("fa-IR")}
//                                 </span>
//                               </>
//                             ) : (
//                               <span className="text-gray-800 dark:text-gray-200 font-bold">
//                                 {product.price.toLocaleString("fa-IR")} تومان
//                               </span>
//                             )}
//                           </div>

//                           <div className="flex">
//                             {[1, 2, 3, 4, 5].map((star) => (
//                               <svg
//                                 key={star}
//                                 xmlns="http://www.w3.org/2000/svg"
//                                 className={`h-4 w-4 ${
//                                   star <= product.rating
//                                     ? "text-amber-400"
//                                     : "text-gray-300"
//                                 }`}
//                                 fill="currentColor"
//                                 viewBox="0 0 24 24"
//                               >
//                                 <path
//                                   strokeLinecap="round"
//                                   strokeLinejoin="round"
//                                   strokeWidth={2}
//                                   d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
//                                 />
//                               </svg>
//                             ))}
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </motion.div>
//                 ))}
//               </motion.div>
//             )}

//             <div className="flex justify-center mt-12">
//               <nav className="flex items-center space-x-2 space-x-reverse">
//                 <button className="w-10 h-10 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center">
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="h-5 w-5"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                     stroke="currentColor"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M15 19l-7-7 7-7"
//                     />
//                   </svg>
//                 </button>

//                 {[1, 2, 3].map((page) => (
//                   <button
//                     key={page}
//                     className={`w-10 h-10 rounded-md flex items-center justify-center ${
//                       page === 1
//                         ? "bg-primary text-white"
//                         : "border border-gray-300 dark:border-gray-600"
//                     }`}
//                   >
//                     {page}
//                   </button>
//                 ))}

//                 <button className="w-10 h-10 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center">
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="h-5 w-5"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                     stroke="currentColor"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M9 5l7 7-7 7"
//                     />
//                   </svg>
//                 </button>
//               </nav>
//             </div>
//           </div>
//         </div>
//       </section>

//       <section className="py-20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
//         <div className="container mx-auto">
//           <motion.div
//             initial="hidden"
//             whileInView="visible"
//             viewport={{ once: true, margin: "-100px" }}
//             variants={fadeIn}
//             className="text-center mb-16"
//           >
//             <motion.span
//               className="inline-block py-1 px-3 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm mb-4"
//               variants={fadeIn}
//             >
//               الهام‌بخش استایل تابستانی
//             </motion.span>

//             <motion.h2
//               className="text-3xl md:text-4xl font-bold mb-6"
//               variants={fadeIn}
//             >
//               لوک‌بوک تابستان ۱۴۰۴
//             </motion.h2>

//             <motion.p
//               className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
//               variants={fadeIn}
//             >
//               با الهام از رنگ‌های گرم تابستان، سواحل دریا و مناظر طبیعی، کالکشن
//               تابستانه ما ترکیبی از راحتی و شیک بودن است.
//             </motion.p>
//           </motion.div>

//           <motion.div
//             className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
//             variants={staggerContainer}
//             initial="hidden"
//             whileInView="visible"
//             viewport={{ once: true, margin: "-100px" }}
//           >
//             {LOOKBOOK_ITEMS.map((item, index) => (
//               <motion.div
//                 key={index}
//                 className={`rounded-xl overflow-hidden relative ${
//                   index === 0 ? "md:col-span-2 md:row-span-2" : ""
//                 }`}
//                 variants={itemVariant}
//               >
//                 <div className="aspect-square md:aspect-auto md:h-full relative group">
//                   <div
//                     className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
//                     style={{
//                       backgroundImage: `url('/images/lookbook/lookbook-${
//                         index + 1
//                       }.jpg')`,
//                     }}
//                   />
//                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

//                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
//                     <button className="bg-white/90 backdrop-blur-sm text-black px-6 py-3 rounded-full font-medium hover:bg-white transition-colors">
//                       مشاهده جزئیات
//                     </button>
//                   </div>

//                   {item.caption && (
//                     <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
//                       <h3 className="text-xl font-bold text-white">
//                         {item.caption}
//                       </h3>
//                       {item.description && (
//                         <p className="text-white/80 mt-2">{item.description}</p>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               </motion.div>
//             ))}
//           </motion.div>
//         </div>
//       </section>

//       <section className="container mx-auto py-20">
//         <motion.div
//           initial="hidden"
//           whileInView="visible"
//           viewport={{ once: true, margin: "-100px" }}
//           variants={fadeIn}
//           className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
//         >
//           <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10 mix-blend-overlay"></div>

//           <div className="absolute -top-20 -left-20 w-64 h-64 bg-yellow-300/20 rounded-full blur-3xl"></div>
//           <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>

//           <motion.div
//             className="relative z-10 max-w-2xl mx-auto"
//             variants={fadeIn}
//           >
//             <motion.h3
//               className="text-3xl md:text-4xl font-bold text-white mb-4"
//               variants={fadeIn}
//             >
//               از جدیدترین محصولات تابستانی باخبر شوید
//             </motion.h3>

//             <motion.p
//               className="text-white/80 mb-8 max-w-lg mx-auto"
//               variants={fadeIn}
//             >
//               با عضویت در خبرنامه ما، از جدیدترین محصولات، تخفیف‌های ویژه و
//               ترندهای تابستانی زودتر از همه باخبر شوید
//             </motion.p>

//             <motion.div className="max-w-md mx-auto" variants={fadeIn}>
//               <div className="flex flex-col sm:flex-row gap-3">
//                 <div className="relative flex-1">
//                   <input
//                     type="email"
//                     placeholder="ایمیل خود را وارد کنید"
//                     className="w-full px-5 py-4 rounded-xl outline-none text-right pr-10 bg-white/10 backdrop-blur-md border border-white/10 text-white placeholder-white/50 focus:bg-white/15 transition-all duration-300"
//                   />
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                     stroke="currentColor"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
//                     />
//                   </svg>
//                 </div>
//                 <button className="bg-white text-amber-600 px-8 py-4 rounded-xl hover:bg-white/90 transition-colors font-medium">
//                   عضویت
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         </motion.div>
//       </section>

//       {selectedProduct && (
//         <div className="fixed inset-0 z-50 overflow-y-auto">
//           <div
//             className="fixed inset-0 bg-black/60 backdrop-blur-sm"
//             onClick={closeProductDetails}
//           ></div>

//           <div className="relative min-h-screen flex items-center justify-center p-4">
//             <motion.div
//               className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden relative z-10"
//               initial={{ opacity: 0, scale: 0.95 }}
//               animate={{ opacity: 1, scale: 1 }}
//               exit={{ opacity: 0, scale: 0.95 }}
//               transition={{ duration: 0.3 }}
//             >
//               <button
//                 className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
//                 onClick={closeProductDetails}
//               >
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   className="h-6 w-6"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   stroke="currentColor"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M6 18L18 6M6 6l12 12"
//                   />
//                 </svg>
//               </button>

//               <div className="grid grid-cols-1 md:grid-cols-2">
//                 <div className="bg-gray-100 dark:bg-gray-900 aspect-square md:aspect-auto relative">
//                   <div
//                     className="absolute inset-0 bg-cover bg-center"
//                     style={{
//                       backgroundImage: `url('/images/products/${selectedProduct.images[0]}')`,
//                     }}
//                   />

//                   {selectedProduct.isNew && (
//                     <div className="absolute top-4 right-4 bg-amber-400 text-black px-3 py-1 rounded-full text-xs font-medium z-10">
//                       جدید
//                     </div>
//                   )}
//                   {selectedProduct.discountPercentage && selectedProduct.discountPercentage > 0 && (
//                     <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10">
//                       {selectedProduct.discountPercentage}% تخفیف
//                     </div>
//                   )}

//                   <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 space-x-reverse">
//                     {selectedProduct.images.slice(0, 4).map((img, index) => (
//                       <button
//                         key={index}
//                         className={`w-12 h-12 rounded-md overflow-hidden border-2 ${
//                           index === 0 ? "border-primary" : "border-transparent"
//                         }`}
//                       >
//                         <div
//                           className="w-full h-full bg-cover bg-center"
//                           style={{
//                             backgroundImage: `url('/images/products/${img}')`,
//                           }}
//                         />
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 <div className="p-6 md:p-8 flex flex-col h-full">
//                   <div>
//                     <div className="flex justify-between items-start mb-4">
//                       <div>
//                         <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">
//                           {selectedProduct.name}
//                         </h2>
//                         <p className="text-gray-500 dark:text-gray-400">
//                           {selectedProduct.category}
//                         </p>
//                       </div>

//                       <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1">
//                         <svg
//                           xmlns="http://www.w3.org/2000/svg"
//                           className="h-5 w-5 text-amber-400 ml-1"
//                           fill="currentColor"
//                           viewBox="0 0 24 24"
//                         >
//                           <path
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             strokeWidth={2}
//                             d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
//                           />
//                         </svg>
//                         <span className="font-medium">
//                           {selectedProduct.rating}
//                         </span>
//                         <span className="text-gray-500 dark:text-gray-400 text-sm mr-1">
//                           ({selectedProduct.reviewCount} نظر)
//                         </span>
//                       </div>
//                     </div>

//                     <div className="mb-6">
//                       <div className="flex items-baseline mb-2">
//                         {selectedProduct.discountPercentage && selectedProduct.discountPercentage > 0 ? (
//                           <>
//                             <span className="text-2xl md:text-3xl font-bold text-primary">
//                               {Math.round(
//                                 selectedProduct.price *
//                                   (1 - selectedProduct.discountPercentage / 100)
//                               ).toLocaleString("fa-IR")}{" "}
//                               تومان
//                             </span>
//                             <span className="text-gray-400 line-through text-lg mr-3">
//                               {selectedProduct.price.toLocaleString("fa-IR")}{" "}
//                               تومان
//                             </span>
//                           </>
//                         ) : (
//                           <span className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
//                             {selectedProduct.price.toLocaleString("fa-IR")}{" "}
//                             تومان
//                           </span>
//                         )}
//                       </div>

//                       {selectedProduct.discountPercentage && selectedProduct.discountPercentage > 0 && (
//                         <div className="text-sm text-green-600 dark:text-green-400">
//                           شما{" "}
//                           {Math.round(
//                             selectedProduct.price *
//                               (selectedProduct.discountPercentage / 100)
//                           ).toLocaleString("fa-IR")}{" "}
//                           تومان سود می‌کنید
//                         </div>
//                       )}
//                     </div>

//                     <div className="mb-6">
//                       <h3 className="font-medium mb-3">توضیحات محصول</h3>
//                       <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
//                         {selectedProduct.description}
//                       </p>
//                     </div>
//                   </div>

//                   <div className="mt-auto">
//                     <div className="mb-6">
//                       <h3 className="font-medium mb-3">انتخاب رنگ</h3>
//                       <div className="flex space-x-3 space-x-reverse">
//                         {selectedProduct.colors?.map((color, index) => (
//                           <button
//                             key={index}
//                             className={`w-10 h-10 rounded-full ${
//                               index === 0
//                                 ? "ring-2 ring-offset-2 ring-primary"
//                                 : ""
//                             }`}
//                             style={{ backgroundColor: color.code }}
//                           />
//                         ))}
//                       </div>
//                     </div>

//                     <div className="mb-8">
//                       <h3 className="font-medium mb-3">انتخاب سایز</h3>
//                       <div className="flex space-x-3 space-x-reverse">
//                         {selectedProduct.sizes?.map((size, index) => (
//                           <button
//                             key={size}
//                             className={`w-12 h-12 flex items-center justify-center border rounded-md ${
//                               index === 0
//                                 ? "bg-primary text-white border-primary"
//                                 : "border-gray-300 dark:border-gray-600"
//                             }`}
//                           >
//                             {size}
//                           </button>
//                         ))}
//                       </div>
//                     </div>

//                     <div className="grid grid-cols-2 gap-4">
//                       <button className="bg-primary text-white py-4 rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center">
//                         <svg
//                           xmlns="http://www.w3.org/2000/svg"
//                           className="h-5 w-5 ml-2"
//                           fill="none"
//                           viewBox="0 0 24 24"
//                           stroke="currentColor"
//                         >
//                           <path
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             strokeWidth={2}
//                             d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
//                           />
//                         </svg>
//                         افزودن به سبد خرید
//                       </button>
//                       <button className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white py-4 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center">
//                         <svg
//                           xmlns="http://www.w3.org/2000/svg"
//                           className="h-5 w-5 ml-2"
//                           fill="none"
//                           viewBox="0 0 24 24"
//                           stroke="currentColor"
//                         >
//                           <path
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             strokeWidth={2}
//                             d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
//                           />
//                         </svg>
//                         ذخیره
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </motion.div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// const SUMMER_TRENDS = [
//   {
//     title: "فشن پایدار",
//     category: "ترند جهانی",
//     description:
//       "پوشاک سازگار با محیط زیست با مواد بازیافتی و پایدار که برای تابستان مناسب هستند.",
//     image: "trend-1.jpg",
//   },
//   {
//     title: "استایل بوهو-شیک",
//     category: "ترند ساحلی",
//     description:
//       "ترکیبی از طرح‌های آزاد، پارچه‌های سبک و رنگ‌های طبیعی برای یک تابستان راحت و شیک.",
//     image: "trend-2.jpg",
//   },
//   {
//     title: "رنگ‌های نئون",
//     category: "ترند رنگ",
//     description: "رنگ‌های درخشان و جذاب که تابستان امسال را روشن می‌کنند.",
//     image: "trend-3.jpg",
//   },
// ];

// const LOOKBOOK_ITEMS = [
//   {
//     caption: "استایل ساحلی لوکس",
//     description: "ترکیبی از راحتی و لوکس بودن برای تعطیلات ساحلی",
//   },
//   {
//     caption: "استایل شهری تابستانه",
//   },
//   {
//     caption: "مهمانی‌های تابستانی",
//   },
//   {
//     caption: "استایل عصرانه",
//   },
//   {
//     caption: "اکسسوری‌های تابستانی",
//   },
// ];