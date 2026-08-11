"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
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
  Users,
  Globe,
  Target,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
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

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

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

  // Delete discount via API
  const handleDeleteDiscount = async (id: string) => {
    if (window.confirm("آیا از حذف این کد تخفیف اطمینان دارید؟")) {
      try {
        const token = adminToken || localStorageManager.getAccessToken();
        const response = await fetch(`/api/admin/discounts/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          fetchDiscounts();
        } else {
          alert("خطا در حذف کد تخفیف");
        }
      } catch (error) {
        console.error("Error deleting discount:", error);
        alert("خطا در حذف کد تخفیف");
      }
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
                              <Badge
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-1"
                              >
                                <Globe className="w-3 h-3" />
                                عمومی
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 flex items-center gap-1"
                              >
                                <Target className="w-3 h-3" />
                                هدفمند
                                {discount.assignedUsers.length > 0 && (
                                  <span className="mr-1">({discount.assignedUsers.length} کاربر)</span>
                                )}
                              </Badge>
                            )}
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
            className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
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
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
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
                   <JalaliDatePicker
                     value={newDiscount.startDate}
                     onChange={(value) => setNewDiscount({ ...newDiscount, startDate: value })}
                     label="تاریخ شروع"
                     id="new-discount-start-date"
                     helperText="در صورت خالی بودن، تاریخ دیروز ثبت می‌شود"
                     allowFutureDates
                   />
                </div>
                <div>
                   <JalaliDatePicker
                     value={newDiscount.endDate}
                     onChange={(value) => setNewDiscount({ ...newDiscount, endDate: value })}
                     label="تاریخ پایان"
                     id="new-discount-end-date"
                     allowFutureDates
                     required
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
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
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
                </motion.div>
              )}
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
                 disabled={!newDiscount.code || !newDiscount.value || !newDiscount.endDate}
              >
                افزودن کد تخفیف
              </Button>
            </div>
          </motion.div>
        </div>
      )}


      {/* Edit Discount Modal - Task 10.4 */}
      {editingDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
          <motion.div
            className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
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
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
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
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, value: parseFloat(e.target.value) || 0 })}
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
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, minOrder: parseFloat(e.target.value) || 0 })}
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
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, maxUses: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <JalaliDatePicker
                     value={editingDiscount.startDate}
                     onChange={(value) => setEditingDiscount({ ...editingDiscount, startDate: value })}
                     label="تاریخ شروع"
                     id="edit-discount-start-date"
                     helperText="در صورت خالی بودن، تاریخ قبلی حفظ می‌شود"
                     allowFutureDates
                   />
                </div>
                <div>
                   <JalaliDatePicker
                     value={editingDiscount.endDate}
                     onChange={(value) => setEditingDiscount({ ...editingDiscount, endDate: value })}
                     label="تاریخ پایان"
                     id="edit-discount-end-date"
                     allowFutureDates
                     required
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
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
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
                </motion.div>
              )}
              
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
