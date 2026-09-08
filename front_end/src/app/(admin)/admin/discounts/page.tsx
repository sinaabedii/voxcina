"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Percent,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Tag,
  Copy,
  CheckCircle,
  X,
  Users,
  Globe,
  Target,
} from "lucide-react";
import Button from "@/components/ui/Button";
import UserTargetingPanel from "@/components/admin/UserTargetingPanel";
import TargetingStatsPreview from "@/components/admin/TargetingStatsPreview";
import UserSelectionModal from "@/components/admin/UserSelectionModal";
import JalaliDatePicker, {
  getYesterdayJalaliString,
  gregorianToJalaliString,
  jalaliToGregorianISOString,
} from "@/components/auth/JalaliDatePicker";
import { TargetingCriteria, UserTargetingStats } from "@/types/discount";
import { User } from "@/types/user";
import { useAuthStore } from "@/store/auth-store";
import { localStorageManager } from "@/lib/local-storage-manager";
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
  AdminSelect,
  AdminFormGrid,
} from "@/components/admin/ui";

interface DiscountData {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  forProducts: string[];
  forCategories: string[];
  isPublic: boolean;
  assignedUsers: string[];
  targetingCriteria?: TargetingCriteria;
}

function getDatePickerValue(value?: string): string {
  if (!value) return "";
  if (/^(13|14)\d{2}-\d{2}-\d{2}$/.test(value)) return value;
  return gregorianToJalaliString(value);
}

export default function AdminDiscountsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiscountData | null>(null);
  const [copiedCode, setCopiedCode] = useState("");
  const [isUserSelectionOpen, setIsUserSelectionOpen] = useState(false);
  const [isEditUserSelectionOpen, setIsEditUserSelectionOpen] = useState(false);

  // Targeting state
  const [targetingStats, setTargetingStats] = useState<UserTargetingStats | null>(null);
  const [filteredUserCount, setFilteredUserCount] = useState<number>(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const { adminToken } = useAuthStore();

  const [newDiscount, setNewDiscount] = useState<{
    code: string;
    type: string;
    value: string;
    minOrder: string;
    maxUses: string;
    usedCount: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    forProducts: string[];
    forCategories: string[];
    isPublic: boolean;
    assignedUsers: string[];
    targetingCriteria: TargetingCriteria;
  }>({
    code: "",
    type: "percentage",
    value: "",
    minOrder: "",
    maxUses: "",
    usedCount: 0,
    startDate: getYesterdayJalaliString(),
    endDate: "",
    isActive: true,
    forProducts: [],
    forCategories: [],
    isPublic: true,
    assignedUsers: [],
    targetingCriteria: {},
  });

  // Fetch discounts from API
  const [discounts, setDiscounts] = useState<DiscountData[]>([]);
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(true);

  const fetchDiscounts = useCallback(async () => {
    setIsLoadingDiscounts(true);
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const response = await fetch("/api/admin/discounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const mapped: DiscountData[] = (Array.isArray(data) ? data : []).map((d: any) => ({
          id: d.id || d._id,
          code: d.code,
          type: d.type,
          value: d.value,
          minOrder: d.min_order_amount || 0,
          maxUses: d.max_uses || 0,
          usedCount: d.used_count || 0,
          startDate: getDatePickerValue(d.valid_from),
          endDate: getDatePickerValue(d.valid_to),
          isActive: d.valid_from && d.valid_to ? new Date() >= new Date(d.valid_from) && new Date() <= new Date(d.valid_to) : false,
          forProducts: d.applicable_to?.product_ids || [],
          forCategories: d.applicable_to?.category_ids || [],
          isPublic: d.is_public ?? true,
          assignedUsers: (d.assigned_users || []).map((u: any) => typeof u === 'string' ? u : u.toString()),
          targetingCriteria: d.targeting_criteria,
        }));
        setDiscounts(mapped);
      }
    } catch (error) {
      console.error("Error fetching discounts:", error);
    } finally {
      setIsLoadingDiscounts(false);
    }
  }, [adminToken]);

  // Fetch targeting stats
  const fetchTargetingStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const response = await fetch("/api/admin/users/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTargetingStats({
          totalUsers: data.total_users ?? data.totalUsers ?? 0,
          mobileAppUsers: data.mobile_app_users ?? data.mobileAppUsers ?? 0,
          nonMobileAppUsers: data.non_mobile_app_users ?? data.nonMobileAppUsers ?? 0,
          usersWithOrders: data.users_with_orders ?? data.usersWithOrders ?? 0,
          firstTimeBuyers: data.first_time_buyers ?? data.firstTimeBuyers ?? 0,
          inactiveUsers: data.inactive_users ?? data.inactiveUsers ?? 0,
          newUsers: data.new_users ?? data.newUsers ?? 0,
        });
      }
    } catch (error) {
      console.error("Error fetching targeting stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [adminToken]);

  // Fetch filtered user count based on criteria
  const fetchFilteredUserCount = useCallback(async (criteria: TargetingCriteria) => {
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const body: Record<string, any> = {};
      if (criteria.hasMobileApp !== undefined) {
        body.has_mobile_app = criteria.hasMobileApp;
      }
      if (criteria.minOrders !== undefined) {
        body.min_orders = criteria.minOrders;
      }
      if (criteria.maxOrders !== undefined) {
        body.max_orders = criteria.maxOrders;
      }
      if (criteria.inactiveDays !== undefined) {
        body.inactive_days = criteria.inactiveDays;
      }
      if (criteria.registeredAfter) {
        body.registered_after = criteria.registeredAfter;
      }
      if (criteria.registeredBefore) {
        body.registered_before = criteria.registeredBefore;
      }

      const response = await fetch(`/api/admin/users/filter/count`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const data = await response.json();
        setFilteredUserCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching filtered user count:", error);
    }
  }, [adminToken]);

  // Fetch all users for selection modal
  const fetchAllUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const response = await fetch("/api/admin/users?limit=10000", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const usersData = data.data || data;
        const users: User[] = Array.isArray(usersData)
          ? usersData.map((u: any) => ({
              id: u.id || u._id,
              name: u.name,
              email: u.email,
              role: u.role,
              createdAt: u.created_at || u.createdAt,
              updatedAt: u.updated_at || u.updatedAt,
              isActive: u.is_active !== undefined ? u.is_active : u.isActive,
              addresses: u.addresses || [],
              phone: u.phone_number || u.phone,
              avatar: u.avatar,
              hasMobileApp: u.has_mobile_app || u.hasMobileApp,
              lastAppOpen: u.last_app_open || u.lastAppOpen,
            }))
          : [];
        setAllUsers(users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [adminToken]);

  // Fetch stats and discounts on mount
  useEffect(() => {
    fetchTargetingStats();
    fetchDiscounts();
  }, [fetchTargetingStats, fetchDiscounts]);

  // Update filtered count when targeting criteria changes
  useEffect(() => {
    if (!newDiscount.isPublic && Object.keys(newDiscount.targetingCriteria).length > 0) {
      fetchFilteredUserCount(newDiscount.targetingCriteria);
    }
  }, [newDiscount.targetingCriteria, newDiscount.isPublic, fetchFilteredUserCount]);

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

  // Add new discount via API
  const handleAddDiscount = async () => {
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const body = {
        code: newDiscount.code,
        type: newDiscount.type,
        value: parseFloat(newDiscount.value) || 0,
        min_order_amount: parseFloat(newDiscount.minOrder) || 0,
        max_uses: parseInt(newDiscount.maxUses) || 0,
        valid_from: jalaliToGregorianISOString(newDiscount.startDate || getYesterdayJalaliString()),
        valid_to: jalaliToGregorianISOString(newDiscount.endDate),
        is_public: newDiscount.isPublic,
        assigned_users: newDiscount.assignedUsers,
        targeting_criteria: Object.keys(newDiscount.targetingCriteria).length > 0 ? newDiscount.targetingCriteria : undefined,
      };
      const response = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setNewDiscount({ code: "", type: "percentage", value: "", minOrder: "", maxUses: "", usedCount: 0, startDate: getYesterdayJalaliString(), endDate: "", isActive: true, forProducts: [], forCategories: [], isPublic: true, assignedUsers: [], targetingCriteria: {} });
        setIsAddModalOpen(false);
        fetchDiscounts();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.message || "خطا در ایجاد کد تخفیف");
      }
    } catch (error) {
      console.error("Error creating discount:", error);
      alert("خطا در ایجاد کد تخفیف");
    }
  };

  // Update discount via API
  const handleUpdateDiscount = async () => {
    if (!editingDiscount) return;
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const body: Record<string, any> = {
        code: editingDiscount.code,
        type: editingDiscount.type,
        value: typeof editingDiscount.value === 'string' ? parseFloat(editingDiscount.value) || 0 : editingDiscount.value,
        min_order_amount: typeof editingDiscount.minOrder === 'string' ? parseFloat(editingDiscount.minOrder) || 0 : editingDiscount.minOrder,
        max_uses: typeof editingDiscount.maxUses === 'string' ? parseInt(editingDiscount.maxUses) || 0 : editingDiscount.maxUses,
        is_public: editingDiscount.isPublic,
        assigned_users: editingDiscount.assignedUsers,
      };
      if (editingDiscount.startDate) body.valid_from = jalaliToGregorianISOString(editingDiscount.startDate);
      if (editingDiscount.endDate) body.valid_to = jalaliToGregorianISOString(editingDiscount.endDate);
      if (editingDiscount.targetingCriteria) body.targeting_criteria = editingDiscount.targetingCriteria;

      const response = await fetch(`/api/admin/discounts/${editingDiscount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setEditingDiscount(null);
        fetchDiscounts();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.message || "خطا در بروزرسانی کد تخفیف");
      }
    } catch (error) {
      console.error("Error updating discount:", error);
      alert("خطا در بروزرسانی کد تخفیف");
    }
  };

  // Delete discount via API (confirmation handled by AdminModal)
  const handleDeleteDiscount = async () => {
    if (!deleteTarget) return;
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const response = await fetch(`/api/admin/discounts/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setDeleteTarget(null);
        fetchDiscounts();
      } else {
        alert("خطا در حذف کد تخفیف");
      }
    } catch (error) {
      console.error("Error deleting discount:", error);
      alert("خطا در حذف کد تخفیف");
    }
  };

  // Copy discount code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  // Toggle discount active status by adjusting valid_to date
  const toggleDiscountStatus = async (id: string) => {
    const discount = discounts.find((d) => d.id === id);
    if (!discount) return;
    try {
      const token = adminToken || localStorageManager.getAccessToken();
      const now = new Date();
      // If active, set valid_to to now (deactivate). If inactive, extend valid_to by 30 days.
      const newValidTo = discount.isActive ? now.toISOString() : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const response = await fetch(`/api/admin/discounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ valid_to: newValidTo }),
      });
      if (response.ok) {
        fetchDiscounts();
      }
    } catch (error) {
      console.error("Error toggling discount:", error);
    }
  };

  // Handle targeting criteria change for new discount
  const handleTargetingCriteriaChange = (criteria: TargetingCriteria) => {
    setNewDiscount({ ...newDiscount, targetingCriteria: criteria });
  };

  // Handle targeting criteria change for editing discount
  const handleEditTargetingCriteriaChange = (criteria: TargetingCriteria) => {
    if (editingDiscount) {
      setEditingDiscount({ ...editingDiscount, targetingCriteria: criteria });
    }
  };

  // Open user selection modal
  const handleOpenUserSelection = () => {
    fetchAllUsers();
    setIsUserSelectionOpen(true);
  };

  // Open user selection modal for editing
  const handleOpenEditUserSelection = () => {
    fetchAllUsers();
    setIsEditUserSelectionOpen(true);
  };

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <AdminPageHeader
        title="مدیریت کدهای تخفیف"
        actions={
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 ml-1" />
            افزودن کد تخفیف
          </Button>
        }
      />

      <AdminToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="جستجوی کد تخفیف..."
      />

      {/* Discounts List */}
      <div>
        {isLoadingDiscounts && discounts.length === 0 ? (
          <AdminLoading message="در حال بارگذاری کدهای تخفیف..." />
        ) : currentDiscounts.length > 0 ? (
          <div className="space-y-4">
            {currentDiscounts.map((discount) => (
              <div
                key={discount.id}
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
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                              {discount.code}
                            </h3>
                            <button
                              className="text-voxcina-blue/50 dark:text-voxcina-cream/50 hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-colors"
                              onClick={() => copyToClipboard(discount.code)}
                            >
                              {copiedCode === discount.code ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                            {/* Promotion Type Badge - Task 10.3 */}
                            {discount.isPublic ? (
                              <AdminBadge tone="info">
                                <Globe className="w-3 h-3" />
                                عمومی
                              </AdminBadge>
                            ) : (
                              <AdminBadge tone="violet">
                                <Target className="w-3 h-3" />
                                هدفمند
                                {discount.assignedUsers.length > 0 && (
                                  <span className="mr-1">({discount.assignedUsers.length} کاربر)</span>
                                )}
                              </AdminBadge>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 space-x-reverse">
                            <AdminBadge tone={discount.isActive ? "success" : "danger"}>
                              {discount.isActive ? "فعال" : "غیرفعال"}
                            </AdminBadge>
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
                          onClick={() => setDeleteTarget(discount)}
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
            icon={Percent}
            title="کد تخفیفی یافت نشد"
            description="هیچ کد تخفیفی با جستجوی مورد نظر یافت نشد"
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
          onChange={(p) => {
            if (p > 0 && p <= totalPages) {
              setCurrentPage(p);
            }
          }}
        />
      </div>


      {/* Add Discount Modal */}
      <AdminModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="افزودن کد تخفیف جدید"
        size="lg"
      >
        <div className="space-y-4">
          <AdminField label="کد تخفیف">
            <AdminInput
              type="text"
              value={newDiscount.code}
              onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })}
            />
          </AdminField>

          <AdminField label="نوع تخفیف">
            <AdminSelect
              value={newDiscount.type}
              onChange={(e) => setNewDiscount({ ...newDiscount, type: e.target.value })}
            >
              <option value="percentage">درصدی</option>
              <option value="fixed">مبلغ ثابت</option>
            </AdminSelect>
          </AdminField>

          <AdminField label={newDiscount.type === "percentage" ? "درصد تخفیف" : "مبلغ تخفیف (تومان)"}>
            <AdminInput
              type="number"
              value={newDiscount.value}
              onChange={(e) => setNewDiscount({ ...newDiscount, value: e.target.value })}
              min={0}
              max={newDiscount.type === "percentage" ? 100 : undefined}
            />
          </AdminField>

          <AdminField label="حداقل مبلغ سفارش (تومان)">
            <AdminInput
              type="number"
              value={newDiscount.minOrder}
              onChange={(e) => setNewDiscount({ ...newDiscount, minOrder: e.target.value })}
              min={0}
            />
          </AdminField>

          <AdminField label="حداکثر تعداد استفاده">
            <AdminInput
              type="number"
              value={newDiscount.maxUses}
              onChange={(e) => setNewDiscount({ ...newDiscount, maxUses: e.target.value })}
              min={0}
            />
          </AdminField>

          <AdminFormGrid>
            <JalaliDatePicker
              value={newDiscount.startDate}
              onChange={(value) => setNewDiscount({ ...newDiscount, startDate: value })}
              label="تاریخ شروع"
              id="new-discount-start-date"
              helperText="در صورت خالی بودن، تاریخ دیروز ثبت می‌شود"
              allowFutureDates
            />
            <JalaliDatePicker
              value={newDiscount.endDate}
              onChange={(value) => setNewDiscount({ ...newDiscount, endDate: value })}
              label="تاریخ پایان"
              id="new-discount-end-date"
              allowFutureDates
              required
            />
          </AdminFormGrid>

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

          {/* Promotion Type Selector - Task 10.1 */}
          <div className="border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-4 mt-4">
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-3">
              نوع تخفیف
            </label>
            <div className="flex gap-4">
              <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all ${newDiscount.isPublic ? 'border-voxcina-blue bg-voxcina-blue/5 dark:border-voxcina-cream dark:bg-voxcina-cream/5' : 'border-voxcina-cream/50 dark:border-voxcina-blue/30'}`}>
                <input
                  type="radio"
                  name="promotionType"
                  checked={newDiscount.isPublic}
                  onChange={() => setNewDiscount({ ...newDiscount, isPublic: true, assignedUsers: [], targetingCriteria: {} })}
                  className="text-voxcina-blue focus:ring-voxcina-blue"
                />
                <Globe className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="font-medium text-voxcina-blue dark:text-voxcina-cream">عمومی</div>
                  <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">همه کاربران</div>
                </div>
              </label>
              <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all ${!newDiscount.isPublic ? 'border-voxcina-blue bg-voxcina-blue/5 dark:border-voxcina-cream dark:bg-voxcina-cream/5' : 'border-voxcina-cream/50 dark:border-voxcina-blue/30'}`}>
                <input
                  type="radio"
                  name="promotionType"
                  checked={!newDiscount.isPublic}
                  onChange={() => setNewDiscount({ ...newDiscount, isPublic: false })}
                  className="text-voxcina-blue focus:ring-voxcina-blue"
                />
                <Target className="w-5 h-5 text-purple-500" />
                <div>
                  <div className="font-medium text-voxcina-blue dark:text-voxcina-cream">هدفمند</div>
                  <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">کاربران خاص</div>
                </div>
              </label>
            </div>
          </div>

          {/* User Targeting Panel - Task 10.2 */}
          {!newDiscount.isPublic && (
            <div className="space-y-4">
              <UserTargetingPanel
                criteria={newDiscount.targetingCriteria}
                onChange={handleTargetingCriteriaChange}
                stats={targetingStats}
                isLoadingStats={isLoadingStats}
                onFetchStats={fetchTargetingStats}
              />

              <TargetingStatsPreview
                stats={targetingStats}
                filteredCount={filteredUserCount}
                isLoading={isLoadingStats}
                showFilteredCount={Object.keys(newDiscount.targetingCriteria).length > 0}
              />

              {/* Manual User Selection */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-voxcina-cream/50 dark:border-voxcina-blue/30 bg-voxcina-cream/10 dark:bg-voxcina-blue/20">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream" />
                  <span className="text-sm text-voxcina-blue dark:text-voxcina-cream">
                    کاربران انتخاب شده: {newDiscount.assignedUsers.length}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenUserSelection}
                  className="rounded-lg"
                >
                  انتخاب کاربران
                </Button>
              </div>
            </div>
          )}
        </div>
        <AdminModalActions onCancel={() => setIsAddModalOpen(false)}>
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
            onClick={handleAddDiscount}
             disabled={!newDiscount.code || !newDiscount.value || !newDiscount.endDate}
          >
            افزودن کد تخفیف
          </Button>
        </AdminModalActions>
      </AdminModal>


      {/* Edit Discount Modal - Task 10.4 */}
      <AdminModal
        isOpen={!!editingDiscount}
        onClose={() => setEditingDiscount(null)}
        title="ویرایش کد تخفیف"
        size="lg"
      >
        {editingDiscount && (
          <>
            <div className="space-y-4">
              <AdminField label="کد تخفیف">
                <AdminInput
                  type="text"
                  value={editingDiscount.code}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, code: e.target.value.toUpperCase() })}
                />
              </AdminField>

              <AdminField label="نوع تخفیف">
                <AdminSelect
                  value={editingDiscount.type}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, type: e.target.value })}
                >
                  <option value="percentage">درصدی</option>
                  <option value="fixed">مبلغ ثابت</option>
                </AdminSelect>
              </AdminField>

              <AdminField label={editingDiscount.type === "percentage" ? "درصد تخفیف" : "مبلغ تخفیف (تومان)"}>
                <AdminInput
                  type="number"
                  value={editingDiscount.value}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, value: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={editingDiscount.type === "percentage" ? 100 : undefined}
                />
              </AdminField>

              <AdminField label="حداقل مبلغ سفارش (تومان)">
                <AdminInput
                  type="number"
                  value={editingDiscount.minOrder}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, minOrder: parseFloat(e.target.value) || 0 })}
                  min={0}
                />
              </AdminField>

              <AdminField label="حداکثر تعداد استفاده">
                <AdminInput
                  type="number"
                  value={editingDiscount.maxUses}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, maxUses: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </AdminField>

              <AdminFormGrid>
                <JalaliDatePicker
                  value={editingDiscount.startDate}
                  onChange={(value) => setEditingDiscount({ ...editingDiscount, startDate: value })}
                  label="تاریخ شروع"
                  id="edit-discount-start-date"
                  helperText="در صورت خالی بودن، تاریخ قبلی حفظ می‌شود"
                  allowFutureDates
                />
                <JalaliDatePicker
                  value={editingDiscount.endDate}
                  onChange={(value) => setEditingDiscount({ ...editingDiscount, endDate: value })}
                  label="تاریخ پایان"
                  id="edit-discount-end-date"
                  allowFutureDates
                  required
                />
              </AdminFormGrid>

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

              {/* Promotion Type Selector for Edit - Task 10.4 */}
              <div className="border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 pt-4 mt-4">
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-3">
                  نوع تخفیف
                </label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all ${editingDiscount.isPublic ? 'border-voxcina-blue bg-voxcina-blue/5 dark:border-voxcina-cream dark:bg-voxcina-cream/5' : 'border-voxcina-cream/50 dark:border-voxcina-blue/30'}`}>
                    <input
                      type="radio"
                      name="editPromotionType"
                      checked={editingDiscount.isPublic}
                      onChange={() => setEditingDiscount({ ...editingDiscount, isPublic: true, assignedUsers: [], targetingCriteria: undefined })}
                      className="text-voxcina-blue focus:ring-voxcina-blue"
                    />
                    <Globe className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium text-voxcina-blue dark:text-voxcina-cream">عمومی</div>
                      <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">همه کاربران</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all ${!editingDiscount.isPublic ? 'border-voxcina-blue bg-voxcina-blue/5 dark:border-voxcina-cream dark:bg-voxcina-cream/5' : 'border-voxcina-cream/50 dark:border-voxcina-blue/30'}`}>
                    <input
                      type="radio"
                      name="editPromotionType"
                      checked={!editingDiscount.isPublic}
                      onChange={() => setEditingDiscount({ ...editingDiscount, isPublic: false })}
                      className="text-voxcina-blue focus:ring-voxcina-blue"
                    />
                    <Target className="w-5 h-5 text-purple-500" />
                    <div>
                      <div className="font-medium text-voxcina-blue dark:text-voxcina-cream">هدفمند</div>
                      <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">کاربران خاص</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* User Targeting Panel for Edit - Task 10.4 */}
              {!editingDiscount.isPublic && (
                <div className="space-y-4">
                  <UserTargetingPanel
                    criteria={editingDiscount.targetingCriteria || {}}
                    onChange={handleEditTargetingCriteriaChange}
                    stats={targetingStats}
                    isLoadingStats={isLoadingStats}
                    onFetchStats={fetchTargetingStats}
                  />

                  <TargetingStatsPreview
                    stats={targetingStats}
                    filteredCount={editingDiscount.assignedUsers.length}
                    isLoading={isLoadingStats}
                    showFilteredCount={true}
                  />

                  {/* Manual User Selection for Edit */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-voxcina-cream/50 dark:border-voxcina-blue/30 bg-voxcina-cream/10 dark:bg-voxcina-blue/20">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-voxcina-blue dark:text-voxcina-cream" />
                      <span className="text-sm text-voxcina-blue dark:text-voxcina-cream">
                        کاربران انتخاب شده: {editingDiscount.assignedUsers.length}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenEditUserSelection}
                      className="rounded-lg"
                    >
                      انتخاب کاربران
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                  تعداد استفاده شده: {editingDiscount.usedCount}
                </p>
              </div>
            </div>
            <AdminModalActions onCancel={() => setEditingDiscount(null)}>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300"
                onClick={handleUpdateDiscount}
                disabled={!editingDiscount.code || !editingDiscount.value || !editingDiscount.startDate || !editingDiscount.endDate}
              >
                به‌روزرسانی
              </Button>
            </AdminModalActions>
          </>
        )}
      </AdminModal>

      {/* Delete Discount Confirmation Modal */}
      <AdminModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف کد تخفیف"
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed">
          آیا از حذف کد تخفیف «{deleteTarget?.code}» اطمینان دارید؟ این عمل قابل بازگشت نیست.
        </p>
        <AdminModalActions onCancel={() => setDeleteTarget(null)}>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteDiscount}
            className="rounded-xl"
          >
            حذف کد تخفیف
          </Button>
        </AdminModalActions>
      </AdminModal>

      {/* User Selection Modal for Add */}
      <UserSelectionModal
        isOpen={isUserSelectionOpen}
        onClose={() => setIsUserSelectionOpen(false)}
        users={allUsers}
        selectedUserIds={newDiscount.assignedUsers}
        onSelectionChange={(userIds) => setNewDiscount({ ...newDiscount, assignedUsers: userIds })}
        isLoading={isLoadingUsers}
        title="انتخاب کاربران برای تخفیف"
      />

      {/* User Selection Modal for Edit */}
      <UserSelectionModal
        isOpen={isEditUserSelectionOpen}
        onClose={() => setIsEditUserSelectionOpen(false)}
        users={allUsers}
        selectedUserIds={editingDiscount?.assignedUsers || []}
        onSelectionChange={(userIds) => {
          if (editingDiscount) {
            setEditingDiscount({ ...editingDiscount, assignedUsers: userIds });
          }
        }}
        isLoading={isLoadingUsers}
        title="انتخاب کاربران برای تخفیف"
      />
    </div>
  );
}
