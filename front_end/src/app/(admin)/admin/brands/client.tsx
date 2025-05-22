"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  BadgePercent,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  PackageOpen,
  X,
  Building,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { adminApi } from "@/services/admin-api";
import toast from "react-hot-toast";

// Define the Brand interface to match what we get from the API
interface Brand {
  id?: string;
  _id?: string; // MongoDB may return this instead of id
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logo?: string | File; // Allow either string (URL) or File object
  isActive?: boolean;
  productsCount?: number;
  featuredProduct?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ClientBrandsPageProps {
  initialBrands: Brand[];
}

export default function ClientBrandsPage({ initialBrands }: ClientBrandsPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [loading, setLoading] = useState(false);
  const [newBrand, setNewBrand] = useState<Brand>({
    name: "",
    slug: "",
    description: "",
    website: "",
    logo: "",
    isActive: true,
  });

  // Refresh brands from API when needed
  const fetchBrands = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getBrands();
      
      // Map backend data to expected format if needed
      const brandsData = Array.isArray(response) ? response : response.data || [];
      
      // Ensure consistent ID field (backend may return _id instead of id)
      const mappedBrands = brandsData.map((brand: any) => ({
        ...brand,
        id: brand.id || brand._id,
        // Set default values for fields that might not exist in the backend response
        productsCount: brand.productsCount || 0,
        featuredProduct: brand.featuredProduct || "-",
        isActive: brand.isActive !== undefined ? brand.isActive : true
      }));
      
      setBrands(mappedBrands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      toast.error("خطا در دریافت اطلاعات برندها");
    } finally {
      setLoading(false);
    }
  };

  // Filter and search brands
  const filteredBrands = brands.filter((brand) =>
    brand.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const brandsPerPage = 5;
  const totalPages = Math.ceil(filteredBrands.length / brandsPerPage);
  const indexOfLastBrand = currentPage * brandsPerPage;
  const indexOfFirstBrand = indexOfLastBrand - brandsPerPage;
  const currentBrands = filteredBrands.slice(indexOfFirstBrand, indexOfLastBrand);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Add new brand
  const handleAddBrand = async () => {
    try {
      // Make sure required fields are filled
      if (!newBrand.name || !newBrand.slug) {
        toast.error("نام و نامک (slug) الزامی هستند");
        return;
      }
      
      await adminApi.createBrand(newBrand);
      toast.success("برند با موفقیت اضافه شد");
      setNewBrand({
        name: "",
        slug: "",
        description: "",
        website: "",
        logo: "",
        isActive: true,
      });
      setIsAddModalOpen(false);
      fetchBrands(); // Refresh the list
    } catch (error) {
      console.error("Error adding brand:", error);
      toast.error("خطا در افزودن برند");
    }
  };

  // Update brand
  const handleUpdateBrand = async () => {
    if (!editingBrand || !editingBrand.id) return;
    
    try {
      // Make sure required fields are filled
      if (!editingBrand.name || !editingBrand.slug) {
        toast.error("نام و نامک (slug) الزامی هستند");
        return;
      }
      
      // Use the correct ID field (id or _id)
      const brandId = editingBrand.id || editingBrand._id;
      
      if (!brandId) {
        toast.error("شناسه برند نامعتبر است");
        return;
      }
      
      await adminApi.updateBrand(brandId.toString(), editingBrand);
      toast.success("برند با موفقیت به‌روزرسانی شد");
      setEditingBrand(null);
      fetchBrands(); // Refresh the list
    } catch (error) {
      console.error("Error updating brand:", error);
      toast.error("خطا در به‌روزرسانی برند");
    }
  };

  // Delete brand
  const handleDeleteBrand = async (id: string) => {
    if (window.confirm("آیا از حذف این برند اطمینان دارید؟")) {
      try {
        await adminApi.deleteBrand(id);
        toast.success("برند با موفقیت حذف شد");
        fetchBrands(); // Refresh the list
      } catch (error) {
        console.error("Error deleting brand:", error);
        toast.error("خطا در حذف برند");
      }
    }
  };

  // Handle file upload for logo
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (isNew) {
      setNewBrand({ ...newBrand, logo: file });
    } else if (editingBrand) {
      setEditingBrand({ ...editingBrand, logo: file });
    }
  };

  // Move brand up/down in order
  const moveUpDown = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === filteredBrands.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const brand = filteredBrands[index];
    const targetBrand = filteredBrands[newIndex];

    // In a real implementation, you'd update the order via API
    // For now, we'll just update the local state
    const updatedBrands = [...brands];
    const brandIndex = updatedBrands.findIndex(b => b.id === brand.id);
    const targetIndex = updatedBrands.findIndex(b => b.id === targetBrand.id);
    
    // Swap positions
    [updatedBrands[brandIndex], updatedBrands[targetIndex]] = 
    [updatedBrands[targetIndex], updatedBrands[brandIndex]];
    
    setBrands(updatedBrands);
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
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
  };

  // Handle status change
  const handleStatusChange = async (brandId: string, newStatus: boolean) => {
    try {
      // Find the brand
      const brand = brands.find(b => b.id === brandId);
      if (!brand) return;
      
      // Update the brand
      await adminApi.updateBrand(brandId, { ...brand, isActive: newStatus });
      
      // Update local state
      const updatedBrands = brands.map((brand) =>
        brand.id === brandId ? { ...brand, isActive: newStatus } : brand
      );
      setBrands(updatedBrands);
      
      if (editingBrand && editingBrand.id === brandId) {
        setEditingBrand({ ...editingBrand, isActive: newStatus });
      }
      
      toast.success("وضعیت برند با موفقیت تغییر کرد");
    } catch (error) {
      console.error("Error updating brand status:", error);
      toast.error("خطا در تغییر وضعیت برند");
    }
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
          <span className="relative z-10">مدیریت برندها</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>

        <Button
          variant="primary"
          size="sm"
          className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4 ml-1" />
          افزودن برند
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
            placeholder="جستجوی برند..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Brands List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {loading ? (
          // Loading state
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
                <div className="animate-spin w-8 h-8 border-3 border-voxcina-blue/30 dark:border-voxcina-cream/30 border-t-voxcina-blue dark:border-t-voxcina-cream rounded-full"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                در حال بارگذاری...
              </h3>
            </CardContent>
          </Card>
        ) : currentBrands.length > 0 ? (
          <div className="space-y-4">
            {currentBrands.map((brand, index) => (
              <motion.div
                key={brand.id || brand._id}
                variants={itemVariants}
                className="transition-all duration-300"
              >
                <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-20 h-12 rounded-lg overflow-hidden bg-voxcina-cream/50 dark:bg-voxcina-blue/20 flex-shrink-0 flex items-center justify-center">
                        {brand.logo ? (
                          <img
                            src={typeof brand.logo === 'string' ? brand.logo : URL.createObjectURL(brand.logo as File)}
                            alt={brand.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <Building className="w-8 h-8 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
                        )}
                      </div>
                      <div className="mr-3 flex-grow">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                              {brand.name}
                            </h3>
                            <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                              {brand.description}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 space-x-reverse">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                brand.isActive
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                              }`}
                            >
                              {brand.isActive ? "فعال" : "غیرفعال"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center mt-2 text-sm">
                          <div className="flex items-center ml-4">
                            <PackageOpen className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60 ml-1" />
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              {brand.productsCount || 0} محصول
                            </span>
                          </div>
                          {brand.featuredProduct && (
                            <div className="flex items-center ml-4">
                              <BadgePercent className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60 ml-1" />
                              <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                                محصول شاخص: {brand.featuredProduct}
                              </span>
                            </div>
                          )}
                          {brand.website && (
                            <div className="flex items-center">
                              <a 
                                href={brand.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-voxcina-blue/80 dark:text-voxcina-cream/80 hover:text-voxcina-blue dark:hover:text-voxcina-cream"
                              >
                                {brand.website.replace(/(^\w+:|^)\/\//, '')}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1 mr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                          onClick={() => setEditingBrand(brand)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500/70 hover:text-red-500 dark:text-red-400/70 dark:hover:text-red-400 rounded-lg"
                          onClick={() => handleDeleteBrand(brand.id!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-col space-y-1 mr-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                          onClick={() => moveUpDown(index, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                          onClick={() => moveUpDown(index, "down")}
                          disabled={index === currentBrands.length - 1}
                        >
                          <ArrowDown className="w-4 h-4" />
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
                <Building className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                برندی یافت نشد
              </h3>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
                هیچ برندی با جستجوی مورد نظر یافت نشد
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

      {/* Add Brand Modal */}
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
                افزودن برند جدید
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
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نام برند
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={newBrand.name}
                  onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نامک (Slug)
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={newBrand.slug}
                  onChange={(e) => setNewBrand({ ...newBrand, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  توضیحات
                </label>
                <textarea
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  rows={3}
                  value={newBrand.description}
                  onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  وب‌سایت
                </label>
                <input
                  type="url"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  placeholder="https://example.com"
                  value={newBrand.website}
                  onChange={(e) => setNewBrand({ ...newBrand, website: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  لوگو
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  onChange={(e) => handleLogoChange(e, true)}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  className="rounded text-voxcina-blue focus:ring-voxcina-blue mr-2"
                  checked={newBrand.isActive}
                  onChange={(e) => setNewBrand({ ...newBrand, isActive: e.target.checked })}
                />
                <label
                  htmlFor="isActive"
                  className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80"
                >
                  برند فعال است
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
                onClick={handleAddBrand}
                disabled={!newBrand.name || !newBrand.slug}
              >
                افزودن برند
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {editingBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
          <motion.div
            className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
                ویرایش برند
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                onClick={() => setEditingBrand(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نام برند
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingBrand.name}
                  onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  نامک (Slug)
                </label>
                <input
                  type="text"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editingBrand.slug}
                  onChange={(e) => setEditingBrand({ ...editingBrand, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  توضیحات
                </label>
                <textarea
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  rows={3}
                  value={editingBrand.description}
                  onChange={(e) => setEditingBrand({ ...editingBrand, description: e.target.value })}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  وب‌سایت
                </label>
                <input
                  type="url"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  placeholder="https://example.com"
                  value={editingBrand.website}
                  onChange={(e) => setEditingBrand({ ...editingBrand, website: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
                  لوگو
                </label>
                {typeof editingBrand.logo === 'string' && editingBrand.logo && (
                  <div className="mb-2">
                    <img 
                      src={editingBrand.logo} 
                      alt={editingBrand.name}
                      className="w-32 h-20 object-contain border border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-lg"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  onChange={(e) => handleLogoChange(e, false)}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  className="rounded text-voxcina-blue focus:ring-voxcina-blue mr-2"
                  checked={editingBrand.isActive}
                  onChange={(e) => setEditingBrand({ ...editingBrand, isActive: e.target.checked })}
                />
                <label
                  htmlFor="isActiveEdit"
                  className="text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80"
                >
                  برند فعال است
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                onClick={() => setEditingBrand(null)}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
                onClick={handleUpdateBrand}
                disabled={!editingBrand.name || !editingBrand.slug}
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