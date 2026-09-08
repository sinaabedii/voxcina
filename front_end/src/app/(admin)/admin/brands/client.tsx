"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import {
  BadgePercent,
  Plus,
  Edit,
  Trash2,
  PackageOpen,
  Building,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import AddBrandModal from "@/components/admin/AddBrandModal";
import { useBrandStore } from "@/store/brand-store";
import {
  AdminPageHeader,
  AdminToolbar,
  AdminBadge,
  AdminLoading,
  AdminEmpty,
  AdminPagination,
  AdminModal,
  AdminModalActions,
  AdminField,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/ui";

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

export default function ClientBrandsPage() {
  // Use the brand store
  const {
    brands,
    isLoading,
    fetchBrands,
    updateBrand,
    deleteBrand,
  } = useBrandStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);

  // On mount, fetch brands
  useEffect(() => {
    fetchBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Update brand
  const handleUpdateBrand = async () => {
    if (!editingBrand || !editingBrand.id) return;
    try {
      if (!editingBrand.name || !editingBrand.slug) {
        toast.error("نام و نامک (slug) الزامی هستند");
        return;
      }
      const formData = new FormData();
      formData.append("name", editingBrand.name);
      formData.append("slug", editingBrand.slug);
      formData.append("isActive", String(editingBrand.isActive));
      if (editingBrand.description) {
        formData.append("description", editingBrand.description);
      }
      if (editingBrand.website) {
        formData.append("website", editingBrand.website);
      }
      if (editingBrand.logo && typeof editingBrand.logo !== "string") {
        formData.append("logo", editingBrand.logo as File);
      }
      await updateBrand(editingBrand.id, formData);
      setEditingBrand(null);
      fetchBrands();
    } catch (error) {
      // Error handled by store
    }
  };

  // Delete brand (confirmed via modal)
  const handleConfirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    try {
      await deleteBrand(brandToDelete.id!);
      setBrandToDelete(null);
      fetchBrands();
    } catch (error) {
      // Error handled by store
    }
  };

  // Handle file upload for logo (Editing only)
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (editingBrand) {
      setEditingBrand({ ...editingBrand, logo: file });
    }
  };

  // Handle status change
  const handleStatusChange = async (brandId: string, newStatus: boolean) => {
    try {
      // Only update isActive field
      const formData = new FormData();
      formData.append("isActive", String(newStatus));
      await updateBrand(brandId, formData);
      fetchBrands();
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <AdminPageHeader
        title="مدیریت برندها"
        actions={
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 ml-1" />
            افزودن برند
          </Button>
        }
      />

      <AdminToolbar
        searchValue={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="جستجوی برند..."
      />

      {/* Brands List */}
      <div>
        {isLoading ? (
          // Loading state
          <AdminLoading message="در حال بارگذاری برندها..." />
        ) : currentBrands.length > 0 ? (
          <div className="space-y-4">
            {currentBrands.map((brand, index) => (
              <div
                key={brand.id || brand.id}
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
                            <AdminBadge tone={brand.isActive ? "success" : "danger"}>
                              {brand.isActive ? "فعال" : "غیرفعال"}
                            </AdminBadge>
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
                          onClick={() => setBrandToDelete(brand)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmpty
            icon={Building}
            title="برندی یافت نشد"
            description="هیچ برندی با جستجوی مورد نظر یافت نشد"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
              >
                پاک کردن جستجو
              </Button>
            }
          />
        )}

        {/* Pagination */}
        <AdminPagination
          page={currentPage}
          totalPages={totalPages}
          onChange={setCurrentPage}
        />
      </div>

      {/* Add Brand Modal */}
      <AddBrandModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => fetchBrands()}
      />

      {/* Edit Brand Modal */}
      <AdminModal
        isOpen={!!editingBrand}
        onClose={() => setEditingBrand(null)}
        title="ویرایش برند"
        size="md"
      >
        {editingBrand && (
          <>
            <div className="space-y-4">
              <AdminField label="نام برند" required>
                <AdminInput
                  type="text"
                  value={editingBrand.name}
                  onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
                />
              </AdminField>
              <AdminField label="نامک (Slug)" required>
                <AdminInput
                  type="text"
                  value={editingBrand.slug}
                  onChange={(e) => setEditingBrand({ ...editingBrand, slug: e.target.value })}
                />
              </AdminField>
              <AdminField label="توضیحات">
                <AdminTextarea
                  rows={3}
                  value={editingBrand.description}
                  onChange={(e) => setEditingBrand({ ...editingBrand, description: e.target.value })}
                />
              </AdminField>
              <AdminField label="وب‌سایت">
                <AdminInput
                  type="url"
                  placeholder="https://example.com"
                  value={editingBrand.website}
                  onChange={(e) => setEditingBrand({ ...editingBrand, website: e.target.value })}
                />
              </AdminField>
              <AdminField label="لوگو">
                {typeof editingBrand.logo === 'string' && editingBrand.logo && (
                  <div className="mb-2">
                    <img
                      src={editingBrand.logo}
                      alt={editingBrand.name}
                      className="w-32 h-20 object-contain border border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-lg"
                    />
                  </div>
                )}
                <AdminInput
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              </AdminField>
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
            <AdminModalActions onCancel={() => setEditingBrand(null)}>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
                onClick={handleUpdateBrand}
                disabled={!editingBrand.name || !editingBrand.slug}
              >
                به‌روزرسانی
              </Button>
            </AdminModalActions>
          </>
        )}
      </AdminModal>

      {/* Delete Brand Confirmation Modal */}
      <AdminModal
        isOpen={!!brandToDelete}
        onClose={() => setBrandToDelete(null)}
        title="تایید حذف برند"
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="text-red-500 h-5 w-5 shrink-0 mt-0.5" />
          آیا از حذف برند «{brandToDelete?.name}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
        </p>
        <AdminModalActions onCancel={() => setBrandToDelete(null)}>
          <Button
            variant="danger"
            size="sm"
            className="rounded-xl min-w-[80px]"
            onClick={handleConfirmDeleteBrand}
          >
            بله، حذف کن
          </Button>
        </AdminModalActions>
      </AdminModal>
    </div>
  );
}
