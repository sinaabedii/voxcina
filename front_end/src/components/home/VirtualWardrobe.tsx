// import React, { useState, useRef, useEffect } from "react";
// import { motion } from "framer-motion";

// interface WardrobeItem {
//   id: number;
//   name: string;
//   category: "tops" | "bottoms" | "shoes" | "accessories";
//   image: string;
//   color: string;
//   brand: string;
// }

// interface Category {
//   id: string;
//   name: string;
//   icon: string;
// }

// interface DropZone {
//   id: keyof OutfitItems;
//   name: string;
//   category: WardrobeItem["category"];
//   position: {
//     top: string;
//     left: string;
//   };
// }

// interface OutfitItems {
//   top: WardrobeItem | null;
//   bottom: WardrobeItem | null;
//   shoes: WardrobeItem | null;
//   accessories: WardrobeItem | null;
// }

// interface SavedOutfit {
//   id: number;
//   name: string;
//   items: OutfitItems;
//   date: string;
// }

// const VirtualWardrobe: React.FC = () => {
//   const [selectedCategory, setSelectedCategory] = useState<string>("all");
//   const [draggedItem, setDraggedItem] = useState<WardrobeItem | null>(null);
//   const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
//   const [outfitItems, setOutfitItems] = useState<OutfitItems>({
//     top: null,
//     bottom: null,
//     shoes: null,
//     accessories: null,
//   });
//   const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
//   const [isMobile, setIsMobile] = useState(false);
//   const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });
//   const dragRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const checkMobile = () => {
//       setIsMobile(window.innerWidth < 768);
//     };

//     checkMobile();
//     window.addEventListener("resize", checkMobile);

//     return () => window.removeEventListener("resize", checkMobile);
//   }, []);

//   const wardrobeItems: WardrobeItem[] = [
//     {
//       id: 1,
//       name: "پیراهن سفید کلاسیک",
//       category: "tops",
//       image: "/api/placeholder/150/200",
//       color: "سفید",
//       brand: "زارا",
//     },
//     {
//       id: 2,
//       name: "تی‌شرت یقه گرد",
//       category: "tops",
//       image: "/api/placeholder/150/200",
//       color: "آبی",
//       brand: "اچ اند ام",
//     },
//     {
//       id: 3,
//       name: "شلوار جین آبی",
//       category: "bottoms",
//       image: "/api/placeholder/150/200",
//       color: "آبی",
//       brand: "لیوایز",
//     },
//     {
//       id: 4,
//       name: "شلوار پارچه‌ای",
//       category: "bottoms",
//       image: "/api/placeholder/150/200",
//       color: "مشکی",
//       brand: "منگو",
//     },
//     {
//       id: 5,
//       name: "کفش اسپرت سفید",
//       category: "shoes",
//       image: "/api/placeholder/150/150",
//       color: "سفید",
//       brand: "نایک",
//     },
//     {
//       id: 6,
//       name: "کفش چرم مشکی",
//       category: "shoes",
//       image: "/api/placeholder/150/150",
//       color: "مشکی",
//       brand: "آلدو",
//     },
//     {
//       id: 7,
//       name: "کیف دستی قهوه‌ای",
//       category: "accessories",
//       image: "/api/placeholder/120/120",
//       color: "قهوه‌ای",
//       brand: "کوچ",
//     },
//     {
//       id: 8,
//       name: "عینک آفتابی",
//       category: "accessories",
//       image: "/api/placeholder/120/120",
//       color: "مشکی",
//       brand: "ری‌بن",
//     },
//   ];

//   const categories: Category[] = [
//     { id: "all", name: "همه", icon: "👕" },
//     { id: "tops", name: "بالاتنه", icon: "👔" },
//     { id: "bottoms", name: "پایین‌تنه", icon: "👖" },
//     { id: "shoes", name: "کفش", icon: "👠" },
//     { id: "accessories", name: "اکسسوری", icon: "👜" },
//   ];

//   const dropZones: DropZone[] = [
//     {
//       id: "top",
//       name: "بالاتنه",
//       category: "tops",
//       position: { top: "20%", left: "50%" },
//     },
//     {
//       id: "bottom",
//       name: "پایین‌تنه",
//       category: "bottoms",
//       position: { top: "60%", left: "50%" },
//     },
//     {
//       id: "shoes",
//       name: "کفش",
//       category: "shoes",
//       position: { top: "85%", left: "50%" },
//     },
//     {
//       id: "accessories",
//       name: "اکسسوری",
//       category: "accessories",
//       position: { top: "30%", left: "20%" },
//     },
//   ];

//   const filteredItems =
//     selectedCategory === "all"
//       ? wardrobeItems
//       : wardrobeItems.filter((item) => item.category === selectedCategory);

//   // Desktop drag handlers
//   const handleDragStart = (item: WardrobeItem): void => {
//     setDraggedItem(item);
//   };

//   const handleDragEnd = (): void => {
//     setDraggedItem(null);
//   };

//   const handleDrop = (
//     e: React.DragEvent,
//     zoneId: keyof OutfitItems,
//     category: WardrobeItem["category"]
//   ): void => {
//     e.preventDefault();
//     if (draggedItem && draggedItem.category === category) {
//       setOutfitItems((prev) => ({
//         ...prev,
//         [zoneId]: draggedItem,
//       }));
//     }
//     setDraggedItem(null);
//   };

//   const handleDragOver = (e: React.DragEvent): void => {
//     e.preventDefault();
//   };

//   // Mobile touch handlers
//   const handleTouchStart = (e: React.TouchEvent, item: WardrobeItem): void => {
//     e.preventDefault();
//     setDraggedItem(item);
//     const touch = e.touches[0];
//     setTouchPosition({ x: touch.clientX, y: touch.clientY });
//   };

//   const handleTouchMove = (e: React.TouchEvent): void => {
//     if (!draggedItem) return;
//     e.preventDefault();
//     const touch = e.touches[0];
//     setTouchPosition({ x: touch.clientX, y: touch.clientY });
//   };

//   const handleTouchEnd = (e: React.TouchEvent): void => {
//     if (!draggedItem) return;
//     e.preventDefault();

//     // Find which drop zone the touch ended on
//     const touch = e.changedTouches[0];
//     const elementBelow = document.elementFromPoint(
//       touch.clientX,
//       touch.clientY
//     );

//     if (elementBelow) {
//       const dropZone = elementBelow.closest("[data-drop-zone]");
//       if (dropZone) {
//         const zoneId = dropZone.getAttribute(
//           "data-zone-id"
//         ) as keyof OutfitItems;
//         const zoneCategory = dropZone.getAttribute(
//           "data-zone-category"
//         ) as WardrobeItem["category"];

//         if (draggedItem.category === zoneCategory) {
//           setOutfitItems((prev) => ({
//             ...prev,
//             [zoneId]: draggedItem,
//           }));
//         }
//       }
//     }

//     setDraggedItem(null);
//   };

//   // Mobile click handlers
//   const handleItemClick = (item: WardrobeItem): void => {
//     if (isMobile) {
//       setSelectedItem(item);
//     }
//   };

//   const handleZoneClick = (
//     zoneId: keyof OutfitItems,
//     category: WardrobeItem["category"]
//   ): void => {
//     if (isMobile && selectedItem && selectedItem.category === category) {
//       setOutfitItems((prev) => ({
//         ...prev,
//         [zoneId]: selectedItem,
//       }));
//       setSelectedItem(null);
//     }
//   };

//   const removeFromOutfit = (zoneId: keyof OutfitItems): void => {
//     setOutfitItems((prev) => ({
//       ...prev,
//       [zoneId]: null,
//     }));
//   };

//   const saveOutfit = (): void => {
//     const outfit = Object.values(outfitItems).filter(
//       (item): item is WardrobeItem => item !== null
//     );
//     if (outfit.length > 0) {
//       const newOutfit: SavedOutfit = {
//         id: Date.now(),
//         name: `استایل ${savedOutfits.length + 1}`,
//         items: { ...outfitItems },
//         date: new Date().toLocaleDateString("fa-IR"),
//       };
//       setSavedOutfits((prev) => [...prev, newOutfit]);
//     }
//   };

//   const clearOutfit = (): void => {
//     setOutfitItems({
//       top: null,
//       bottom: null,
//       shoes: null,
//       accessories: null,
//     });
//     setSelectedItem(null);
//   };

//   const getColorStyle = (color: string): string => {
//     switch (color) {
//       case "سفید":
//         return "#ffffff";
//       case "آبی":
//         return "#0066cc";
//       case "مشکی":
//         return "#000000";
//       case "قهوه‌ای":
//         return "#8B4513";
//       default:
//         return "#cccccc";
//     }
//   };

//   return (
//     <section className="container mx-auto px-4 mb-16" ref={dragRef}>
//       <motion.div
//         initial={{ opacity: 0, y: 30 }}
//         whileInView={{ opacity: 1, y: 0 }}
//         viewport={{ once: true }}
//         className="text-center mb-12"
//       >
//         <h2 className="text-3xl md:text-4xl font-bold text-voxcina-blue mb-4">
//           کمد مجازی شما
//         </h2>
//         <p className="text-voxcina-blue/70 max-w-2xl mx-auto">
//           {isMobile
//             ? "روی لباس‌ها کلیک کنید و سپس محل مناسب را انتخاب کنید"
//             : "لباس‌هایتان را ترکیب کنید و استایل‌های جدید بسازید"}
//         </p>
//       </motion.div>

//       {isMobile && selectedItem && (
//         <motion.div
//           initial={{ opacity: 0, scale: 0.9 }}
//           animate={{ opacity: 1, scale: 1 }}
//           className="fixed top-4 left-4 right-4 z-50 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3"
//         >
//           <img
//             src={selectedItem.image}
//             alt={selectedItem.name}
//             className="w-16 h-16 object-cover rounded-lg"
//           />
//           <div className="flex-1">
//             <p className="font-medium text-voxcina-blue">{selectedItem.name}</p>
//             <p className="text-sm text-voxcina-blue/70">
//               محل مناسب را انتخاب کنید
//             </p>
//           </div>
//           <button
//             onClick={() => setSelectedItem(null)}
//             className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
//           >
//             ×
//           </button>
//         </motion.div>
//       )}

//       {draggedItem && !isMobile && (
//         <motion.div
//           className="fixed pointer-events-none z-50 opacity-80"
//           style={{
//             left: touchPosition.x - 30,
//             top: touchPosition.y - 30,
//           }}
//           initial={{ scale: 0.8 }}
//           animate={{ scale: 1 }}
//         >
//           <img
//             src={draggedItem.image}
//             alt={draggedItem.name}
//             className="w-16 h-16 object-cover rounded-lg shadow-xl"
//           />
//         </motion.div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         <div className="lg:col-span-2">
//           <div className="bg-white rounded-3xl shadow-lg p-4 md:p-6">
//             <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
//               {categories.map((category) => (
//                 <motion.button
//                   key={category.id}
//                   onClick={() => setSelectedCategory(category.id)}
//                   className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full font-medium transition-all duration-300 text-sm md:text-base ${
//                     selectedCategory === category.id
//                       ? "bg-voxcina-blue text-white shadow-lg"
//                       : "bg-gray-100 text-voxcina-blue hover:bg-gray-200"
//                   }`}
//                   whileHover={{ scale: 1.05 }}
//                   whileTap={{ scale: 0.95 }}
//                 >
//                   <span>{category.icon}</span>
//                   <span>{category.name}</span>
//                 </motion.button>
//               ))}
//             </div>

//             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 max-h-96 overflow-y-auto">
//               {filteredItems.map((item) => (
//                 <motion.div
//                   key={item.id}
//                   draggable={!isMobile}
//                   onDragStart={() => !isMobile && handleDragStart(item)}
//                   onDragEnd={() => !isMobile && handleDragEnd()}
//                   onTouchStart={(e) => handleTouchStart(e, item)}
//                   onTouchMove={handleTouchMove}
//                   onTouchEnd={handleTouchEnd}
//                   onClick={() => handleItemClick(item)}
//                   className={`bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 ${
//                     selectedItem?.id === item.id
//                       ? "ring-2 ring-voxcina-blue"
//                       : ""
//                   }`}
//                   whileHover={{ scale: 1.05 }}
//                   style={{
//                     opacity: draggedItem?.id === item.id ? 0.5 : 1,
//                   }}
//                 >
//                   <div className="aspect-square bg-gray-100">
//                     <img
//                       src={item.image}
//                       alt={item.name}
//                       className="w-full h-full object-cover"
//                     />
//                   </div>
//                   <div className="p-2 md:p-3">
//                     <h4 className="font-medium text-xs md:text-sm text-voxcina-blue mb-1 truncate">
//                       {item.name}
//                     </h4>
//                     <div className="flex justify-between items-center text-xs text-voxcina-blue/70">
//                       <span className="text-[10px] md:text-xs">
//                         {item.brand}
//                       </span>
//                       <span
//                         className="w-3 h-3 rounded-full border border-gray-300"
//                         style={{ backgroundColor: getColorStyle(item.color) }}
//                       />
//                     </div>
//                   </div>
//                 </motion.div>
//               ))}
//             </div>
//           </div>
//         </div>

//         <div className="space-y-6">
//           <div className="bg-white rounded-3xl shadow-lg p-4 md:p-6">
//             <h3 className="text-lg font-bold text-voxcina-blue mb-4 text-center">
//               استایل شما
//             </h3>

//             <div className="relative h-64 md:h-80 bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl overflow-hidden">
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <div className="w-20 md:w-24 h-48 md:h-60 bg-gray-200 rounded-full opacity-20"></div>
//               </div>

//               {dropZones.map((zone) => (
//                 <motion.div
//                   key={zone.id}
//                   data-drop-zone
//                   data-zone-id={zone.id}
//                   data-zone-category={zone.category}
//                   onClick={() => handleZoneClick(zone.id, zone.category)}
//                   className={`absolute w-14 h-14 md:w-16 md:h-16 border-2 border-dashed rounded-xl flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
//                     draggedItem?.category === zone.category ||
//                     selectedItem?.category === zone.category
//                       ? "border-voxcina-blue bg-voxcina-blue/10 scale-110"
//                       : "border-voxcina-blue/30 hover:border-voxcina-blue/60"
//                   } ${isMobile ? "cursor-pointer" : ""}`}
//                   style={zone.position}
//                   onDrop={(e) =>
//                     !isMobile && handleDrop(e, zone.id, zone.category)
//                   }
//                   onDragOver={(e) => !isMobile && handleDragOver(e)}
//                 >
//                   {outfitItems[zone.id] ? (
//                     <div className="relative group">
//                       <img
//                         src={outfitItems[zone.id]!.image}
//                         alt={outfitItems[zone.id]!.name}
//                         className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-lg shadow-md"
//                       />
//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           removeFromOutfit(zone.id);
//                         }}
//                         className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
//                       >
//                         ×
//                       </button>
//                     </div>
//                   ) : (
//                     <span className="text-[10px] md:text-xs text-voxcina-blue/50 text-center">
//                       {zone.name}
//                     </span>
//                   )}
//                 </motion.div>
//               ))}
//             </div>

//             <div className="flex gap-2 mt-4">
//               <motion.button
//                 onClick={saveOutfit}
//                 disabled={Object.values(outfitItems).every(
//                   (item) => item === null
//                 )}
//                 className="flex-1 bg-voxcina-blue text-white py-2 px-3 md:px-4 rounded-xl font-medium text-sm md:text-base disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-voxcina-darkBlue transition-colors"
//                 whileHover={{ scale: 1.02 }}
//                 whileTap={{ scale: 0.98 }}
//               >
//                 ذخیره استایل
//               </motion.button>
//               <motion.button
//                 onClick={clearOutfit}
//                 className="bg-gray-200 text-voxcina-blue py-2 px-3 md:px-4 rounded-xl font-medium text-sm md:text-base hover:bg-gray-300 transition-colors"
//                 whileHover={{ scale: 1.02 }}
//                 whileTap={{ scale: 0.98 }}
//               >
//                 پاک کردن
//               </motion.button>
//             </div>
//           </div>

//           {savedOutfits.length > 0 && (
//             <div className="bg-white rounded-3xl shadow-lg p-4 md:p-6">
//               <h3 className="text-base md:text-lg font-bold text-voxcina-blue mb-4">
//                 استایل‌های ذخیره شده
//               </h3>
//               <div className="space-y-3 max-h-40 overflow-y-auto">
//                 {savedOutfits.slice(-3).map((outfit) => (
//                   <motion.div
//                     key={outfit.id}
//                     className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
//                     whileHover={{ scale: 1.02 }}
//                   >
//                     <div className="flex -space-x-2">
//                       {Object.values(outfit.items)
//                         .filter((item): item is WardrobeItem => item !== null)
//                         .slice(0, 3)
//                         .map((item, index) => (
//                           <img
//                             key={index}
//                             src={item.image}
//                             alt={item.name}
//                             className="w-8 h-8 rounded-full border-2 border-white object-cover"
//                           />
//                         ))}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="font-medium text-sm text-voxcina-blue truncate">
//                         {outfit.name}
//                       </p>
//                       <p className="text-xs text-voxcina-blue/70">
//                         {outfit.date}
//                       </p>
//                     </div>
//                   </motion.div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </section>
//   );
// };

// export default VirtualWardrobe;
