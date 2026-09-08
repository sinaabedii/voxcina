"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Mail,
  Phone,
  Calendar,
  Ban,
  CheckCircle,
  Edit3,
  Trash2,
  AlertTriangle,
  Smartphone,
  Clock,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useAdminUsersStore } from "@/store/auth-store";
import { User } from "@/types/user";
import { toast } from "react-toastify";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
  AdminToolbar,
  AdminBadge,
  AdminLoading,
  AdminError,
  AdminEmpty,
  AdminPagination,
  AdminModal,
  AdminModalActions,
  AdminField,
  AdminSelect,
} from "@/components/admin/ui";

// Helper to format date strings (assuming backend sends ISO strings)
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    return dateString; // Fallback if parsing fails
  }
};

// Helper to format relative time for last app open
const formatRelativeTime = (dateString: string | undefined) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} دقیقه پیش`;
    } else if (diffHours < 24) {
      return `${diffHours} ساعت پیش`;
    } else if (diffDays < 7) {
      return `${diffDays} روز پیش`;
    } else {
      return formatDate(dateString);
    }
  } catch (e) {
    return null;
  }
};

export default function AdminUsersPage() {
  const {
    allUsers,
    isLoading,
    error,
    fetchAllUsers,
    updateUserAsAdmin,
    deleteUserAsAdmin,
  } = useAdminUsersStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mobileAppFilter, setMobileAppFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editedRole, setEditedRole] = useState<User['role'] | ''>('');
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = useState(false);
  const [userToChangeStatus, setUserToChangeStatus] = useState<User | null>(null);

  useEffect(() => {
    fetchAllUsers().catch(err => {
      toast.error(`Failed to load users: ${err.message}`);
    });
  }, [fetchAllUsers]);

  // Filter and search users
  const filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.phone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    const userIsActive = user.isActive === true;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && userIsActive) ||
      (statusFilter === "inactive" && !userIsActive);
    
    const matchesMobileApp =
      mobileAppFilter === "all" ||
      (mobileAppFilter === "has_app" && user.hasMobileApp === true) ||
      (mobileAppFilter === "no_app" && user.hasMobileApp !== true);
    
    return matchesSearch && matchesRole && matchesStatus && matchesMobileApp;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Pagination
  const usersPerPage = 8;
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);

  const clearFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setMobileAppFilter("all");
    setSortBy("newest");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    mobileAppFilter !== "all" ||
    sortBy !== "newest" ||
    searchTerm !== "";
  
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditedRole(user.role);
    setIsEditModalOpen(true);
  };

  const handleSaveUserChanges = async () => {
    if (editingUser && editedRole && editingUser.role !== editedRole) {
      try {
        await updateUserAsAdmin(editingUser.id, { role: editedRole as User['role'] });
        toast.success(`نقش کاربر ${editingUser.name} با موفقیت به‌روزرسانی شد.`);
        setIsEditModalOpen(false);
        setEditingUser(null);
        fetchAllUsers();
      } catch (err) {
        toast.error(`خطا در به‌روزرسانی نقش کاربر: ${(err as Error).message}`);
      }
    } else if (editingUser && editedRole === '') {
        toast.warn("لطفا یک نقش انتخاب کنید.");
    } else {
        setIsEditModalOpen(false);
    }
  };

  // Handle status change (isActive toggle)
  const handleStatusChange = async (userId: string, currentIsActive: boolean | undefined) => {
    const newIsActive = !(currentIsActive === true);
    try {
      await updateUserAsAdmin(userId, { isActive: newIsActive });
      toast.success(`وضعیت کاربر با موفقیت به‌روزرسانی شد.`);
      fetchAllUsers();
    } catch (err) {
      toast.error(`خطا در به‌روزرسانی وضعیت کاربر: ${(err as Error).message}`);
    }
  };

  const confirmDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (userToDelete) {
      try {
        await deleteUserAsAdmin(userToDelete.id);
        toast.success(`کاربر ${userToDelete.name} با موفقیت حذف شد.`);
        setIsConfirmDeleteDialogOpen(false);
        setUserToDelete(null);
        fetchAllUsers();
      } catch (err) {
        toast.error(`خطا در حذف کاربر: ${(err as Error).message}`);
        setIsConfirmDeleteDialogOpen(false);
      }
    }
  };

  const confirmStatusChange = (user: User) => {
    setUserToChangeStatus(user);
    setIsStatusChangeDialogOpen(true);
  };

  const handleStatusChangeConfirm = async () => {
    if (userToChangeStatus) {
      try {
        await handleStatusChange(userToChangeStatus.id, userToChangeStatus.isActive);
        toast.success(`وضعیت کاربر ${userToChangeStatus.name} با موفقیت به‌روزرسانی شد.`);
        setIsStatusChangeDialogOpen(false);
        setUserToChangeStatus(null);
        fetchAllUsers();
      } catch (err) {
        toast.error(`خطا در به‌روزرسانی وضعیت کاربر: ${(err as Error).message}`);
      }
    }
  };

  if (isLoading && allUsers.length === 0) {
    return <AdminLoading message="در حال بارگذاری کاربران..." />;
  }

  if (error) {
    return (
      <div>
        <AdminPageHeader title={`مدیریت کاربران`} />
        <AdminError
          message={`خطا در بارگذاری کاربران: ${error}`}
          onRetry={() => fetchAllUsers()}
        />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="مدیریت کاربران"
        subtitle={`${allUsers.length.toLocaleString("fa-IR")} کاربر ثبت شده`}
        icon={<Users className="w-6 h-6" />}
      />

      <AdminToolbar
        searchValue={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="جستجو بر اساس نام، ایمیل، شماره تماس..."
        filterOpen={isFilterOpen}
        onToggleFilters={() => setIsFilterOpen(!isFilterOpen)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminField label="نقش کاربری">
            <AdminSelect value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">همه نقش‌ها</option>
              <option value="admin">مدیر</option>
              <option value="customer">مشتری</option>
            </AdminSelect>
          </AdminField>

          <AdminField label="وضعیت">
            <AdminSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </AdminSelect>
          </AdminField>

          <AdminField label="اپلیکیشن موبایل">
            <AdminSelect value={mobileAppFilter} onChange={(e) => setMobileAppFilter(e.target.value)}>
              <option value="all">همه کاربران</option>
              <option value="has_app">دارای اپلیکیشن</option>
              <option value="no_app">بدون اپلیکیشن</option>
            </AdminSelect>
          </AdminField>

          <AdminField label="مرتب‌سازی">
            <AdminSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">جدیدترین عضویت</option>
              <option value="name">نام (الفبایی)</option>
            </AdminSelect>
          </AdminField>
        </div>
      </AdminToolbar>

      {currentUsers.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <AdminTable
              head={
                <>
                  <AdminTh>کاربر</AdminTh>
                  <AdminTh>نقش</AdminTh>
                  <AdminTh className="text-center">وضعیت</AdminTh>
                  <AdminTh className="text-center">اپلیکیشن</AdminTh>
                  <AdminTh>آخرین ورود</AdminTh>
                  <AdminTh>تاریخ عضویت</AdminTh>
                  <AdminTh>تاریخ تولد</AdminTh>
                  <AdminTh className="text-center">عملیات</AdminTh>
                </>
              }
            >
              {currentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/10 transition-colors">
                  <AdminTd className="whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="h-10 w-10 rounded-full object-cover" src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random&color=fff`} alt={user.name} />
                      </div>
                      <div className="mr-4">
                        <div className="text-sm font-medium">{user.name}</div>
                        <div className="text-xs opacity-60">{user.email}</div>
                        {user.phone && <div className="text-xs opacity-50">{user.phone}</div>}
                      </div>
                    </div>
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap">
                    <AdminBadge tone={user.role === "admin" ? "danger" : "info"}>
                      {user.role === "admin" ? "مدیر" : user.role === "customer" ? "مشتری" : user.role}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap text-center">
                    <AdminBadge tone={user.isActive === true ? "success" : "danger"}>
                      {user.isActive === true ? "فعال" : "غیرفعال"}
                    </AdminBadge>
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap text-center">
                    {user.hasMobileApp ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <Smartphone className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {user.appPlatform === "android" ? "اندروید" : user.appPlatform === "ios" ? "iOS" : "موبایل"}
                          </span>
                        </div>
                        {user.appVersion && (
                          <span className="text-xs opacity-40 mt-0.5">v{user.appVersion}</span>
                        )}
                        {user.lastAppOpen && (
                          <span className="text-xs opacity-50 mt-1">
                            {formatRelativeTime(user.lastAppOpen)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs opacity-40">—</span>
                    )}
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap">
                    {user.lastLogin ? (
                      <div className="flex flex-col">
                        <span>{formatDate(user.lastLogin)}</span>
                        <span className="text-xs opacity-50 mt-0.5">
                          {formatRelativeTime(user.lastLogin)}
                        </span>
                      </div>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap">
                    {formatDate(user.createdAt)}
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap">
                    {user.birthday ? (
                      <span>{formatDate(user.birthday)}</span>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </AdminTd>
                  <AdminTd className="whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2 space-x-reverse">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        className="rounded-lg"
                        title="ویرایش نقش"
                        aria-label="ویرایش نقش"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmStatusChange(user)}
                        className={`rounded-lg ${
                          user.isActive === true
                            ? "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                            : "text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300"
                        }`}
                        title={user.isActive === true ? "غیرفعال کردن" : "فعال کردن"}
                        aria-label={user.isActive === true ? "غیرفعال کردن" : "فعال کردن"}
                      >
                        {user.isActive === true ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteUser(user)}
                        className="rounded-lg text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        title="حذف کاربر"
                        aria-label="حذف کاربر"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </AdminTable>
          </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {currentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="bg-white dark:bg-voxcina-blue/5 border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-2xl p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="h-12 w-12 rounded-full object-cover" src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random&color=fff`} alt={user.name} />
                          <div className="mr-3">
                            <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream">{user.name}</h3>
                            <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">{user.email}</p>
                            {user.phone && <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">{user.phone}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 flex-wrap">
                            <AdminBadge tone={user.role === "admin" ? "danger" : "info"}>
                              {user.role === "admin" ? "مدیر" : "مشتری"}
                            </AdminBadge>
                            <AdminBadge tone={user.isActive === true ? "success" : "danger"}>
                              {user.isActive === true ? "فعال" : "غیرفعال"}
                            </AdminBadge>
                            {user.hasMobileApp && (
                              <AdminBadge tone="success">
                                <Smartphone className="h-3 w-3" />
                                {user.appPlatform === "android" ? "اندروید" : user.appPlatform === "ios" ? "iOS" : "موبایل"}
                              </AdminBadge>
                            )}
                          </div>
                          <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                            {formatDate(user.createdAt)}
                          </span>
                        </div>

                        {user.hasMobileApp && user.lastAppOpen && (
                          <div className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
                            آخرین فعالیت اپ: {formatRelativeTime(user.lastAppOpen)}
                            {user.appVersion && <span className="mr-2 opacity-60">v{user.appVersion}</span>}
                          </div>
                        )}

                        {user.lastLogin && (
                          <div className="flex items-center gap-1 text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>آخرین ورود: {formatRelativeTime(user.lastLogin)}</span>
                          </div>
                        )}

                        {user.birthday && (
                          <div className="flex items-center gap-1 text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>تولد: {formatDate(user.birthday)}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="rounded-lg"
                          >
                            <Edit3 className="h-4 w-4 ml-1" />
                            <span className="text-xs">ویرایش</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmStatusChange(user)}
                            className={`rounded-lg ${
                              user.isActive === true
                                ? "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                                : "text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300"
                            }`}
                          >
                            {user.isActive === true ? <Ban className="h-4 w-4 ml-1" /> : <CheckCircle className="h-4 w-4 ml-1" />}
                            <span className="text-xs">{user.isActive === true ? "غیرفعال" : "فعال"}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDeleteUser(user)}
                            className="rounded-lg text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4 ml-1" />
                            <span className="text-xs">حذف</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <AdminEmpty
                icon={Users}
                title={allUsers.length === 0 && !isLoading ? "هیچ کاربری یافت نشد." : hasActiveFilters ? "هیچ کاربری با این فیلترها یافت نشد." : "در حال بارگذاری..."}
                description={
                  hasActiveFilters
                    ? "هیچ کاربری با فیلترهای انتخاب شده یافت نشد"
                    : "کاربران در حال بارگذاری هستند"
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl">
                      پاک کردن فیلترها
                    </Button>
                  ) : undefined
                }
              />
            )}

            {/* Pagination */}
            <AdminPagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
            />
      {/* Edit User Modal */}
      <AdminModal
        isOpen={isEditModalOpen && !!editingUser}
        onClose={() => setIsEditModalOpen(false)}
        title={editingUser ? `ویرایش نقش کاربر: ${editingUser.name}` : "ویرایش نقش کاربر"}
        size="sm"
      >
        <AdminField label="نقش کاربر را انتخاب کنید">
          <AdminSelect
            value={editedRole}
            onChange={(e) => setEditedRole(e.target.value as User["role"])}
          >
            <option value="">انتخاب نقش جدید</option>
            <option value="customer">مشتری</option>
            <option value="admin">مدیر</option>
          </AdminSelect>
        </AdminField>
        <AdminModalActions onCancel={() => setIsEditModalOpen(false)}>
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl min-w-[80px]"
            onClick={handleSaveUserChanges}
            disabled={isLoading || !editedRole || editedRole === editingUser?.role}
            isLoading={isLoading}
          >
            ذخیره تغییرات
          </Button>
        </AdminModalActions>
      </AdminModal>

      {/* Delete Confirmation Modal */}
      <AdminModal
        isOpen={isConfirmDeleteDialogOpen && !!userToDelete}
        onClose={() => setIsConfirmDeleteDialogOpen(false)}
        title="تایید حذف کاربر"
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="text-red-500 h-5 w-5 shrink-0 mt-0.5" />
          آیا از حذف کاربر «{userToDelete?.name}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
        </p>
        <AdminModalActions onCancel={() => setIsConfirmDeleteDialogOpen(false)}>
          <Button
            variant="danger"
            size="sm"
            className="rounded-xl min-w-[80px]"
            onClick={handleDeleteUser}
            disabled={isLoading}
            isLoading={isLoading}
          >
            بله، حذف کن
          </Button>
        </AdminModalActions>
      </AdminModal>

      {/* Status Change Confirmation Modal */}
      <AdminModal
        isOpen={isStatusChangeDialogOpen && !!userToChangeStatus}
        onClose={() => setIsStatusChangeDialogOpen(false)}
        title={`تایید ${userToChangeStatus?.isActive === true ? "غیرفعال‌سازی" : "فعال‌سازی"} کاربر`}
        size="sm"
      >
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 leading-relaxed flex items-start gap-2">
          <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${userToChangeStatus?.isActive === true ? "text-red-500" : "text-green-500"}`} />
          آیا از {userToChangeStatus?.isActive === true ? "غیرفعال‌سازی" : "فعال‌سازی"} کاربر «{userToChangeStatus?.name}» مطمئن هستید؟
        </p>
        <AdminModalActions onCancel={() => setIsStatusChangeDialogOpen(false)}>
          <Button
            variant={userToChangeStatus?.isActive === true ? "danger" : "primary"}
            size="sm"
            className="rounded-xl min-w-[80px]"
            onClick={handleStatusChangeConfirm}
            disabled={isLoading}
            isLoading={isLoading}
          >
            {userToChangeStatus?.isActive === true ? "غیرفعال کن" : "فعال کن"}
          </Button>
        </AdminModalActions>
      </AdminModal>

      {/* User Details Sidebar */}
      {selectedUser && (
        <div className="fixed top-0 left-0 h-full w-full md:w-96 bg-white dark:bg-voxcina-blue/95 shadow-lg z-50 p-6 overflow-y-auto border-r border-voxcina-cream dark:border-voxcina-blue/30">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-voxcina-blue dark:text-voxcina-cream">مشخصات کاربر</h3>
            <Button variant="ghost" size="sm" className="p-2" onClick={() => setSelectedUser(null)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <img className="h-16 w-16 rounded-full" src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.name}&background=random&color=fff`} alt={selectedUser.name} />
              <div>
                <p className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream">{selectedUser.name}</p>
                <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">{selectedUser.role}</p>
              </div>
            </div>
            <div>
              <Mail className="inline-block mr-2 h-5 w-5 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              <span className="text-sm text-voxcina-blue dark:text-voxcina-cream">{selectedUser.email}</span>
            </div>
            {selectedUser.phone && (
              <div>
                <Phone className="inline-block mr-2 h-5 w-5 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
                <span className="text-sm text-voxcina-blue dark:text-voxcina-cream">{selectedUser.phone}</span>
              </div>
            )}
            <div>
              <Calendar className="inline-block mr-2 h-5 w-5 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
              <span className="text-sm text-voxcina-blue dark:text-voxcina-cream">عضویت: {formatDate(selectedUser.createdAt)}</span>
            </div>
             <div>
              {selectedUser.isActive === true ? 
                <CheckCircle className="inline-block mr-2 h-5 w-5 text-green-500" /> :
                <Ban className="inline-block mr-2 h-5 w-5 text-red-500" />
              }
              <span className={`text-sm ${selectedUser.isActive === true ? 'text-green-600' : 'text-red-600'}`}>
                {selectedUser.isActive === true ? "فعال" : "غیرفعال"}
              </span>
            </div>
            
            {/* Mobile App Info */}
            <div>
              <Smartphone className={`inline-block mr-2 h-5 w-5 ${selectedUser.hasMobileApp ? 'text-green-500' : 'text-voxcina-blue/40 dark:text-voxcina-cream/40'}`} />
              <span className={`text-sm ${selectedUser.hasMobileApp ? 'text-green-600 dark:text-green-400' : 'text-voxcina-blue/50 dark:text-voxcina-cream/50'}`}>
                {selectedUser.hasMobileApp 
                  ? `اپلیکیشن ${selectedUser.appPlatform === 'android' ? 'اندروید' : selectedUser.appPlatform === 'ios' ? 'iOS' : 'موبایل'}` 
                  : 'بدون اپلیکیشن'}
              </span>
              {selectedUser.hasMobileApp && selectedUser.lastAppOpen && (
                <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50 mr-7 mt-1">
                  آخرین فعالیت: {formatRelativeTime(selectedUser.lastAppOpen)}
                </p>
              )}
            </div>
            
            <div className="mt-6 space-y-2">
                 <Button 
                    className="w-full"
                    onClick={() => {
                        setSelectedUser(null);
                        handleEditUser(selectedUser);
                    }}
                  >
                    <Edit3 className="mr-2 h-4 w-4" /> ویرایش نقش
                 </Button>
                <Button 
                    variant="outline"
                    className={`w-full ${selectedUser.isActive === true ? 'text-red-600 border-red-500 hover:bg-red-100 dark:hover:bg-red-900/30' : 'text-green-600 border-green-500 hover:bg-green-100 dark:hover:bg-green-900/30'}`}
                    onClick={() => handleStatusChange(selectedUser.id, selectedUser.isActive)}
                 >
                    {selectedUser.isActive === true ? <Ban className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    {selectedUser.isActive === true ? 'غیرفعال کردن' : 'فعال کردن'}
                 </Button>
                 <Button 
                    variant="danger"
                    className="w-full"
                    onClick={() => {
                        setSelectedUser(null);
                        confirmDeleteUser(selectedUser);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> حذف کاربر
                 </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
