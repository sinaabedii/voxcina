import React, { useState } from "react";
import { motion } from "framer-motion";

interface WardrobeItem {
  id: number;
  name: string;
  category: "tops" | "bottoms" | "shoes" | "accessories";
  image: string;
  color: string;
  brand: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface DropZone {
  id: keyof OutfitItems;
  name: string;
  category: WardrobeItem["category"];
  position: {
    top: string;
    left: string;
  };
}

interface OutfitItems {
  top: WardrobeItem | null;
  bottom: WardrobeItem | null;
  shoes: WardrobeItem | null;
  accessories: WardrobeItem | null;
}

interface SavedOutfit {
  id: number;
  name: string;
  items: OutfitItems;
  date: string;
}

const VirtualWardrobe: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [draggedItem, setDraggedItem] = useState<WardrobeItem | null>(null);
  const [outfitItems, setOutfitItems] = useState<OutfitItems>({
    top: null,
    bottom: null,
    shoes: null,
    accessories: null,
  });
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);

  const wardrobeItems: WardrobeItem[] = [
    {
      id: 1,
      name: "پیراهن سفید کلاسیک",
      category: "tops",
      image: "/api/placeholder/150/200",
      color: "سفید",
      brand: "زارا",
    },
    {
      id: 2,
      name: "تی‌شرت یقه گرد",
      category: "tops",
      image: "/api/placeholder/150/200",
      color: "آبی",
      brand: "اچ اند ام",
    },
    {
      id: 3,
      name: "شلوار جین آبی",
      category: "bottoms",
      image: "/api/placeholder/150/200",
      color: "آبی",
      brand: "لیوایز",
    },
    {
      id: 4,
      name: "شلوار پارچه‌ای",
      category: "bottoms",
      image: "/api/placeholder/150/200",
      color: "مشکی",
      brand: "منگو",
    },
    {
      id: 5,
      name: "کفش اسپرت سفید",
      category: "shoes",
      image: "/api/placeholder/150/150",
      color: "سفید",
      brand: "نایک",
    },
    {
      id: 6,
      name: "کفش چرم مشکی",
      category: "shoes",
      image: "/api/placeholder/150/150",
      color: "مشکی",
      brand: "آلدو",
    },
    {
      id: 7,
      name: "کیف دستی قهوه‌ای",
      category: "accessories",
      image: "/api/placeholder/120/120",
      color: "قهوه‌ای",
      brand: "کوچ",
    },
    {
      id: 8,
      name: "عینک آفتابی",
      category: "accessories",
      image: "/api/placeholder/120/120",
      color: "مشکی",
      brand: "ری‌بن",
    },
  ];

  const categories: Category[] = [
    { id: "all", name: "همه", icon: "👕" },
    { id: "tops", name: "بالاتنه", icon: "👔" },
    { id: "bottoms", name: "پایین‌تنه", icon: "👖" },
    { id: "shoes", name: "کفش", icon: "👠" },
    { id: "accessories", name: "اکسسوری", icon: "👜" },
  ];

  const dropZones: DropZone[] = [
    {
      id: "top",
      name: "بالاتنه",
      category: "tops",
      position: { top: "20%", left: "50%" },
    },
    {
      id: "bottom",
      name: "پایین‌تنه",
      category: "bottoms",
      position: { top: "60%", left: "50%" },
    },
    {
      id: "shoes",
      name: "کفش",
      category: "shoes",
      position: { top: "85%", left: "50%" },
    },
    {
      id: "accessories",
      name: "اکسسوری",
      category: "accessories",
      position: { top: "30%", left: "20%" },
    },
  ];

  const filteredItems =
    selectedCategory === "all"
      ? wardrobeItems
      : wardrobeItems.filter((item) => item.category === selectedCategory);

  const handleDragStart = (item: WardrobeItem): void => {
    setDraggedItem(item);
  };

  const handleDragEnd = (): void => {
    setDraggedItem(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    zoneId: keyof OutfitItems,
    category: WardrobeItem["category"]
  ): void => {
    e.preventDefault();
    if (draggedItem && draggedItem.category === category) {
      setOutfitItems((prev) => ({
        ...prev,
        [zoneId]: draggedItem,
      }));
    }
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent): void => {
    e.preventDefault();
  };

  const removeFromOutfit = (zoneId: keyof OutfitItems): void => {
    setOutfitItems((prev) => ({
      ...prev,
      [zoneId]: null,
    }));
  };

  const saveOutfit = (): void => {
    const outfit = Object.values(outfitItems).filter(
      (item): item is WardrobeItem => item !== null
    );
    if (outfit.length > 0) {
      const newOutfit: SavedOutfit = {
        id: Date.now(),
        name: `استایل ${savedOutfits.length + 1}`,
        items: { ...outfitItems },
        date: new Date().toLocaleDateString("fa-IR"),
      };
      setSavedOutfits((prev) => [...prev, newOutfit]);
    }
  };

  const clearOutfit = (): void => {
    setOutfitItems({
      top: null,
      bottom: null,
      shoes: null,
      accessories: null,
    });
  };

  const getColorStyle = (color: string): string => {
    switch (color) {
      case "سفید":
        return "#ffffff";
      case "آبی":
        return "#0066cc";
      case "مشکی":
        return "#000000";
      case "قهوه‌ای":
        return "#8B4513";
      default:
        return "#cccccc";
    }
  };

  return (
    <section className="container mx-auto px-4 mb-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-voxcina-blue mb-4">
          کمد مجازی شما
        </h2>
        <p className="text-voxcina-blue/70 max-w-2xl mx-auto">
          لباس‌هایتان را ترکیب کنید و استایل‌های جدید بسازید
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((category) => (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                    selectedCategory === category.id
                      ? "bg-voxcina-blue text-white shadow-lg"
                      : "bg-gray-100 text-voxcina-blue hover:bg-gray-200"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </motion.button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item)}
                  onDragEnd={handleDragEnd}
                  className="bg-white rounded-xl shadow-md overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  style={{
                    opacity: draggedItem?.id === item.id ? 0.5 : 1,
                    transform:
                      draggedItem?.id === item.id ? "rotate(5deg)" : "none",
                  }}
                >
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-sm text-voxcina-blue mb-1 truncate">
                      {item.name}
                    </h4>
                    <div className="flex justify-between items-center text-xs text-voxcina-blue/70">
                      <span>{item.brand}</span>
                      <span
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: getColorStyle(item.color) }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-voxcina-blue mb-4 text-center">
              استایل شما
            </h3>

            <div className="relative h-80 bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-60 bg-gray-200 rounded-full opacity-20"></div>
              </div>

              {dropZones.map((zone) => (
                <motion.div
                  key={zone.id}
                  className={`absolute w-16 h-16 border-2 border-dashed rounded-xl flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                    draggedItem?.category === zone.category
                      ? "border-voxcina-blue bg-voxcina-blue/10 scale-110"
                      : "border-voxcina-blue/30 hover:border-voxcina-blue/60"
                  }`}
                  style={zone.position}
                  onDrop={(e) => handleDrop(e, zone.id, zone.category)}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                >
                  {outfitItems[zone.id] ? (
                    <div className="relative group">
                      <img
                        src={outfitItems[zone.id]!.image}
                        alt={outfitItems[zone.id]!.name}
                        className="w-14 h-14 object-cover rounded-lg shadow-md"
                      />
                      <button
                        onClick={() => removeFromOutfit(zone.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-voxcina-blue/50 text-center">
                      {zone.name}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <motion.button
                onClick={saveOutfit}
                disabled={Object.values(outfitItems).every(
                  (item) => item === null
                )}
                className="flex-1 bg-voxcina-blue text-white py-2 px-4 rounded-xl font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-voxcina-darkBlue transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                ذخیره استایل
              </motion.button>
              <motion.button
                onClick={clearOutfit}
                className="bg-gray-200 text-voxcina-blue py-2 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                پاک کردن
              </motion.button>
            </div>
          </div>

          {savedOutfits.length > 0 && (
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-voxcina-blue mb-4">
                استایل‌های ذخیره شده
              </h3>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {savedOutfits.slice(-3).map((outfit) => (
                  <motion.div
                    key={outfit.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex -space-x-2">
                      {Object.values(outfit.items)
                        .filter((item): item is WardrobeItem => item !== null)
                        .slice(0, 3)
                        .map((item, index) => (
                          <img
                            key={index}
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8 rounded-full border-2 border-white object-cover"
                          />
                        ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-voxcina-blue truncate">
                        {outfit.name}
                      </p>
                      <p className="text-xs text-voxcina-blue/70">
                        {outfit.date}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-8 bg-gradient-to-r from-voxcina-blue/10 to-primary-100/10 rounded-2xl p-6"
      >
        <h3 className="text-lg font-bold text-voxcina-blue mb-3">
          چگونه استفاده کنم؟
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-voxcina-blue/80">
          <div className="flex items-start gap-3">
            <span className="bg-voxcina-blue text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              1
            </span>
            <p>لباس‌هایتان را از کمد بگیرید و drag کنید</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-voxcina-blue text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              2
            </span>
            <p>آن‌ها را به محل مناسب در مانکن drop کنید</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-voxcina-blue text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              3
            </span>
            <p>استایل جدیدتان را ذخیره کنید</p>
          </div>
        </div>

        {draggedItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-3 bg-voxcina-blue/20 rounded-xl flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-voxcina-blue rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">📦</span>
            </div>
            <div>
              <p className="font-medium text-voxcina-blue">
                در حال کشیدن: {draggedItem.name}
              </p>
              <p className="text-xs text-voxcina-blue/70">
                این آیتم را به قسمت{" "}
                {draggedItem.category === "tops"
                  ? "بالاتنه"
                  : draggedItem.category === "bottoms"
                  ? "پایین‌تنه"
                  : draggedItem.category === "shoes"
                  ? "کفش"
                  : "اکسسوری"}{" "}
                بکشید
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
};

export default VirtualWardrobe;
