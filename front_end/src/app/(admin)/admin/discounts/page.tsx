"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  Percent,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Tag,
  Copy,
  CheckCircle,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";

export default function AdminDiscountsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState("");
  const [newDiscount, setNewDiscount] = useState({
    code: "",
    type: "percentage",
    value: "",
    minOrder: "",
    maxUses: "",
    usedCount: 0,
    startDate: "",
    endDate: "",
    isActive: true,
    forProducts: [],
    forCategories: [],
  });

  // Mock discounts data - would be fetched from API in real application
  const [discounts, setDiscounts] = useState([
    {
      id: "disc-1",
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      minOrder: 100000,
      maxUses: 1000,
      usedCount: 358,
      startDate: "1402/05/01",
      endDate: "1402/08/30",
      isActive: true,
      forProducts: [],
      forCategories: [],
    },
    {
      id: "disc-2",
      code: "SUMMER20",
      type: "percentage",
      value: 20,
      minOrder: 200000,
      maxUses: 500,
      usedCount: 245,
      startDate: "1402/04/01",
      endDate: "1402/06/31",
      isActive: false,
      forProducts: [],
      forCategories: ["الکترونیک"],
    },
    {
      id: "disc-3",
      code: "FIXED50K",
      type: "fixed",
      value: 50000,
      minOrder: 500000,
      maxUses: 300,
      usedCount: 87,
      startDate: "1402/06/01",
      endDate: "1402/09/30",
      isActive: true,
      forProducts: [],
      forCategories: [],
    },
    {
      id: "disc-4",
      code: "MOBILE15",
      type: "percentage",
      value: 15,
      minOrder: 0,
      maxUses: 1000,
      usedCount: 124,
      startDate: "1402/05/15",
      endDate: "1402/07/15",
      isActive: true,
      forProducts: [],
      forCategories: ["موبایل"],
    },
    {
      id: "disc-5",
      code: "BLACK30",
      type: "percentage",
      value: 30,
      minOrder: 300000,
      maxUses: 200,
      usedCount: 198,
      startDate: "1402/09/01",
      endDate: "1402/09/05",
      isActive: true,
      forProducts: [],
      forCategories: [],
    },
    {
      id: "disc-6",
      code: "FIXED20K",
      type: "fixed",
      value: 20000,
      minOrder: 150000,
      maxUses: 500,
      usedCount: 320,
      startDate: "1402/04/15",
      endDate: "1402/07/15",
      isActive: false,
      forProducts: [],
      forCategories: [],
    },
    {
      id: "disc-7",
      code: "WINTER25",
      type: "percentage",
      value: 25,
      minOrder: 250000,
      maxUses: 400,
      usedCount: 0,
      startDate: "1402/10/01",
      endDate: "1402/12/29",
      isActive: true,
      forProducts: [],
      forCategories: [],
    },
  ]);

  // Filter and search discounts
  const filteredDiscounts = discounts.filter((discount) =>
    discount.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const discountsPerPage = 5;
  const totalPages = Math.ceil(filteredDiscounts.length / discountsPerPage);
  const indexOfLastDiscount = currentPage * discountsPerPage;
  const indexOfFirstDiscount = indexOfLastDiscount - discountsPerPage;
  const currentDiscounts = filteredDiscounts.slice(indexOfFirstDiscount, indexOfLastDiscount);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Add new discount
  const handleAddDiscount = () => {
    const newDiscountWithId = {
      ...newDiscount,
      id: `disc-${discounts.length + 1}`,
      value: parseFloat(newDiscount.value),
      minOrder: parseFloat(newDiscount.minOrder) || 0,
      maxUses: parseInt(newDiscount.maxUses) || 0,
      usedCount: 0,
    };
    
    setDiscounts([...discounts, newDiscountWithId]);
    setNewDiscount({
      code: "",
      type: "percentage",
      value: "",
      minOrder: "",
      maxUses: "",
      usedCount: 0,
      startDate: "",
      endDate: "",
      isActive: true,
      forProducts: [],
      forCategories: [],
    });
    setIsAddModalOpen(false);
  };

  // Update discount
  const handleUpdateDiscount = () => {
    const updatedDiscounts = discounts.map((discount) =>
      discount.id === editingDiscount.id ? {
        ...editingDiscount,
        value: parseFloat(editingDiscount.value),
        minOrder: parseFloat(editingDiscount.minOrder) || 0,
        maxUses: parseInt(editingDiscount.maxUses) || 0,
      } : discount
    );
    setDiscounts(updatedDiscounts);
    setEditingDiscount(null);
  };

  // Delete discount
  const handleDeleteDiscount = (id: string) => {
    if (window.confirm("آیا از حذف این کد تخفیف اطمینان دارید؟")) {
      const updatedDiscounts = discounts.filter((discount) => discount.id !== id);
      setDiscounts(updatedDiscounts);
    }
  };

  // Copy discount code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  // Toggle discount active status
  const toggleDiscountStatus = (id: string) => {
    const updatedDiscounts = discounts.map((discount) =>
      discount.id === id ? { ...discount, isActive: !discount.isActive } : discount
    );
    setDiscounts(updatedDiscounts);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
  };

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-4 md:mb-0 relative inline-block">
          <span className="relative z-10">مدیریت کدهای تخفیف</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>

        <Button
          variant="primary"
          size="sm"
          className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4 ml-1" />
          افزودن کد تخفیف
        </Button>
      </motion.div>

      <motion.div
        className="mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-5 h-5 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
          </div>
          <input
            type="text"
            className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-10 p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50 shadow-sm"
            placeholder="جستجوی کد تخفیف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Discounts List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {currentDiscounts.length > 0 ? (
          <div className="space-y-4">
            {currentDiscounts.map((discount) => (
              <motion.div
                key={discount.id}
                variants={itemVariants}
                className="transition-all duration-300"
              >
                <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-voxcina-cream/50 dark:bg-voxcina-blue/20 flex-shrink-0 flex items-center justify-center">
                        <Percent className="w-6 h-6 text-voxcina-blue/70 dark:text-voxcina-cream/70" />
                      </div>
                      <div className="mr-3 flex-grow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                              {discount.code}
                            </h3>
                            <button
                              className="mr-2 text-voxcina-blue/50 dark:text-voxcina-cream/50 hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
                              onClick={() => copyToClipboard(discount.code)}
                            >
                              {copiedCode === discount.code ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="flex items-center space-x-1 space-x-reverse">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                discount.isActive
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                              }`}
                            >
                              {discount.isActive ? "فعال" : "غیرفعال"}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                          <div className="flex items-center">
                            <Tag className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60 ml-1" />
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              {discount.type === "percentage" 
                                ? `${discount.value}٪ تخفیف`
                                : `${discount.value.toLocaleString()} تومان تخفیف`}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60 ml-1" />
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              تا {discount.endDate}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              {discount.usedCount} / {discount.maxUses} استفاده
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              حداقل سفارش: {discount.minOrder.toLocaleString()} تومان
                            </span>
                          </div>
                        </div>
                        {discount.forCategories.length > 0 && (
                          <div className="mt-1 text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                            فقط برای: {discount.forCategories.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col space-y-1 mr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                          onClick={() => setEditingDiscount({...discount})}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`${
                            discount.isActive
                              ? "text-red-500/70 hover:text-red-500 dark:text-red-400/70 dark:hover:text-red-400"
                              : "text-green-500/70 hover:text-green-500 dark:text-green-400/70 dark:hover:text-green-400"
                          } rounded-lg`}
                          onClick={() => toggleDiscountStatus(discount.id)}
                        >
                          {discount.isActive ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500/70 hover:text-red-500 dark:text-red-400/70 dark:hover:text-red-400 rounded-lg"
                          onClick={() => handleDeleteDiscount(discount.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
                <Percent className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                کد تخفیفی یافت نشد
              </h3>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
                هیچ کد تخفیفی با جستجوی مورد نظر یافت نشد
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
              >
                پاک کردن جستجو
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center space-x-1 space-x-reverse bg-white dark:bg-voxcina-blue/30 rounded-xl p-1 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-lg ${
                  currentPage === 1
                    ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                    : "text-voxcina-blue dark:text-voxcina-cream"
                }`}
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (number) => (
                  <Button
                    key={number}
                    variant={currentPage === number ? "primary" : "ghost"}
                    size="sm"
                    className={`rounded-lg ${
                      currentPage === number
                        ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
                        : "text-voxcina-blue dark:text-voxcina-cream"
                    }`}
                    onClick={() => paginate(number)}
                  >
                    {number}
                  </Button>
                )
              )}

              <Button
                variant="ghost"
                size="sm"
                className={`rounded-lg ${
                  currentPage === totalPages
                    ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                    : "text-voxcina-blue dark:text-voxcina-cream"
                }`}
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Add Discount Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
          <motion.div
            className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
                افزودن کد تخفیف جدید
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  کد تخفیف
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={newDiscount.code}
                  onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نوع تخفیف
                </label>
                <select
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={newDiscount.type}
                  onChange={(e) => setNewDiscount({ ...newDiscount, type: e.target.value })}
                >
                  <option value="percentage">درصدی</option>
                  <option value="fixed">مبلغ ثابت</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  {newDiscount.type === "percentage" ? "درصد تخفیف" : "مبلغ تخفیف (تومان)"}
                </label>
                <input
                  type="number"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={newDiscount.value}
                  onChange={(e) => setNewDiscount({ ...newDiscount, value: e.target.value })}
                  min={0}
                  max={newDiscount.type === "percentage" ? 100 : undefined}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  حداقل مبلغ سفارش (تومان)
                </label>
                <input
                  type="number"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={newDiscount.minOrder}
                  onChange={(e) => setNewDiscount({ ...newDiscount, minOrder: e.target.value })}
                  min={0}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  حداکثر تعداد استفاده
                </label>
                <input
                  type="number"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={newDiscount.maxUses}
                  onChange={(e) => setNewDiscount({ ...newDiscount, maxUses: e.target.value })}
                  min={0}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    تاریخ شروع
                  </label>
                  <input
                    type="text"
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                    value={newDiscount.startDate}
                    onChange={(e) => setNewDiscount({ ...newDiscount, startDate: e.target.value })}
                    placeholder="1402/01/01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    تاریخ پایان
                  </label>
                  <input
                    type="text"
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                    value={newDiscount.endDate}
                    onChange={(e) => setNewDiscount({ ...newDiscount, endDate: e.target.value })}
                    placeholder="1402/12/29"
                  />
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  className="rounded text-voxcina-blue focus:ring-voxcina-blue mr-2"
                  checked={newDiscount.isActive}
                  onChange={(e) => setNewDiscount({ ...newDiscount, isActive: e.target.checked })}
                />
                <label
                  htmlFor="isActive"
                  className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80"
                >
                  کد تخفیف فعال است
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                onClick={() => setIsAddModalOpen(false)}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
                onClick={handleAddDiscount}
                disabled={!newDiscount.code || !newDiscount.value || !newDiscount.startDate || !newDiscount.endDate}
              >
                افزودن کد تخفیف
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Discount Modal */}
      {editingDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
          <motion.div
            className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
                ویرایش کد تخفیف
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                onClick={() => setEditingDiscount(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  کد تخفیف
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingDiscount.code}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, code: e.target.value.toUpperCase() })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نوع تخفیف
                </label>
                <select
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingDiscount.type}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, type: e.target.value })}
                >
                  <option value="percentage">درصدی</option>
                  <option value="fixed">مبلغ ثابت</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  {editingDiscount.type === "percentage" ? "درصد تخفیف" : "مبلغ تخفیف (تومان)"}
                </label>
                <input
                  type="number"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingDiscount.value}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, value: e.target.value })}
                  min={0}
                  max={editingDiscount.type === "percentage" ? 100 : undefined}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  حداقل مبلغ سفارش (تومان)
                </label>
                <input
                  type="number"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingDiscount.minOrder}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, minOrder: e.target.value })}
                  min={0}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  حداکثر تعداد استفاده
                </label>
                <input
                  type="number"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingDiscount.maxUses}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, maxUses: e.target.value })}
                  min={0}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    تاریخ شروع
                  </label>
                  <input
                    type="text"
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                    value={editingDiscount.startDate}
                    onChange={(e) => setEditingDiscount({ ...editingDiscount, startDate: e.target.value })}
                    placeholder="1402/01/01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                    تاریخ پایان
                  </label>
                  <input
                    type="text"
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                    value={editingDiscount.endDate}
                    onChange={(e) => setEditingDiscount({ ...editingDiscount, endDate: e.target.value })}
                    placeholder="1402/12/29"
                  />
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  className="rounded text-voxcina-blue focus:ring-voxcina-blue mr-2"
                  checked={editingDiscount.isActive}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, isActive: e.target.checked })}
                />
                <label
                  htmlFor="isActiveEdit"
                  className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80"
                >
                  کد تخفیف فعال است
                </label>
              </div>
              
              <div>
                <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                  تعداد استفاده شده: {editingDiscount.usedCount}
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                onClick={() => setEditingDiscount(null)}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
                onClick={handleUpdateDiscount}
                disabled={!editingDiscount.code || !editingDiscount.value || !editingDiscount.startDate || !editingDiscount.endDate}
              >
                به‌روزرسانی
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 