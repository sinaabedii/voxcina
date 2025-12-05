"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  UserCog,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  Ban,
  CheckCircle,
  User as UserIcon,
  X,
  Edit3,
  Trash2,
  MoreVertical,
  AlertTriangle,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useAdminUsersStore } from "@/store/auth-store";
import { User } from "@/types/user";
import { toast } from "react-toastify";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

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
    
    return matchesSearch && matchesRole && matchesStatus;
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

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };
  
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

  if (isLoading && allUsers.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-voxcina-blue dark:text-voxcina-cream" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 md:py-12">
        <motion.div
          className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl shadow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          خطا در بارگذاری کاربران: {error}
          <Button onClick={() => fetchAllUsers()} variant="ghost" size="sm" className="mr-2">
            تلاش مجدد
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-4 md:mb-0 relative inline-block">
          <span className="relative z-10">مدیریت کاربران ({sortedUsers.length})</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>
      </motion.div>

      <motion.div
        className="mb-6 flex flex-col md:flex-row md:items-center gap-3"
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
            placeholder="جستجو بر اساس نام، ایمیل، شماره تماس..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="md:w-auto w-full rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <SlidersHorizontal className="w-4 h-4 ml-1" />
          فیلترها
        </Button>
      </motion.div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          variants={itemVariants}
        >
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                    نقش کاربری
                  </h3>
                  <select
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="all">همه نقش‌ها</option>
                    <option value="admin">مدیر</option>
                    <option value="customer">مشتری</option>
                  </select>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                    وضعیت
                  </h3>
                  <select
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    <option value="active">فعال</option>
                    <option value="inactive">غیرفعال</option>
                  </select>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                    مرتب‌سازی
                  </h3>
                  <select
                    className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">جدیدترین عضویت</option>
                    <option value="name">نام (الفبایی)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                  onClick={() => {
                    setRoleFilter("all");
                    setStatusFilter("all");
                    setSortBy("newest");
                    setSearchTerm("");
                  }}
                >
                  <X className="w-4 h-4 ml-1" />
                  پاک کردن فیلترها
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isLoading && allUsers.length > 0 && (
        <div className="flex justify-center my-4">
          <Loader2 className="w-8 h-8 animate-spin text-voxcina-blue dark:text-voxcina-cream" />
        </div>
      )}

      {/* Users Table / Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-xl rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
          <CardHeader className="border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <CardTitle className="text-2xl font-semibold text-voxcina-blue dark:text-voxcina-cream mb-2 sm:mb-0">
                <Users className="inline-block mr-3 text-voxcina-blue dark:text-voxcina-cream h-7 w-7" />
                لیست کاربران ({currentUsers.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {currentUsers.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto rounded-lg border border-voxcina-cream/50 dark:border-voxcina-blue/30">
                  <table className="min-w-full divide-y divide-voxcina-cream/50 dark:divide-voxcina-blue/30">
                    <thead className="bg-voxcina-cream/30 dark:bg-voxcina-blue/20">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">کاربر</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">نقش</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">وضعیت</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">تاریخ عضویت</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-voxcina-blue/5 divide-y divide-voxcina-cream/30 dark:divide-voxcina-blue/20">
                      {currentUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/10 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <img className="h-10 w-10 rounded-full" src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random&color=fff`} alt={user.name} />
                              </div>
                              <div className="mr-4">
                                <div className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">{user.name}</div>
                                <div className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">{user.email}</div>
                                {user.phone && <div className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">{user.phone}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className={
                              user.role === 'admin' 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-voxcina-cream'
                            }>
                              {user.role === 'admin' ? 'مدیر' : (user.role === 'customer' ? 'مشتری' : user.role)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Badge variant={user.isActive === true ? 'default' : 'outline'}
                                   className={`${user.isActive === true ? 'bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-400'}`}
                            >
                              {user.isActive === true ? "فعال" : "غیرفعال"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center space-x-2 space-x-reverse">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEditUser(user)}
                                className="p-2 text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream rounded-lg hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/20 transition-colors"
                                title="ویرایش نقش"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => confirmStatusChange(user)}
                                className={`p-2 rounded-lg hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/20 transition-colors ${
                                  user.isActive === true 
                                    ? 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300' 
                                    : 'text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300'
                                }`}
                                title={user.isActive === true ? 'غیرفعال کردن' : 'فعال کردن'}
                              >
                                {user.isActive === true ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => confirmDeleteUser(user)}
                                className="p-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="حذف کاربر"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {currentUsers.map((user) => (
                    <motion.div
                      key={user.id}
                      variants={itemVariants}
                      className="bg-white dark:bg-voxcina-blue/5 border border-voxcina-cream/50 dark:border-voxcina-blue/30 rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <img className="h-12 w-12 rounded-full" src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random&color=fff`} alt={user.name} />
                          <div className="mr-3">
                            <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream">{user.name}</h3>
                            <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">{user.email}</p>
                            {user.phone && <p className="text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">{user.phone}</p>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                              {user.role === 'admin' ? 'مدیر' : 'مشتری'}
                            </Badge>
                            <Badge variant={user.isActive === true ? 'default' : 'outline'}
                                   className={`${user.isActive === true ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {user.isActive === true ? "فعال" : "غیرفعال"}
                            </Badge>
                          </div>
                          <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                            {formatDate(user.createdAt)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditUser(user)}
                            className="text-voxcina-blue/70 hover:text-voxcina-blue dark:text-voxcina-cream/70 dark:hover:text-voxcina-cream rounded-lg hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/20 transition-colors"
                          >
                            <Edit3 className="h-4 w-4 ml-1" />
                            <span className="text-xs">ویرایش</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => confirmStatusChange(user)}
                            className={`rounded-lg hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/20 transition-colors ${
                              user.isActive === true 
                                ? 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300' 
                                : 'text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300'
                            }`}
                          >
                            {user.isActive === true ? <Ban className="h-4 w-4 ml-1" /> : <CheckCircle className="h-4 w-4 ml-1" />}
                            <span className="text-xs">{user.isActive === true ? 'غیرفعال' : 'فعال'}</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => confirmDeleteUser(user)}
                            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 ml-1" />
                            <span className="text-xs">حذف</span>
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
                  <Users className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                  {allUsers.length === 0 && !isLoading ? "هیچ کاربری یافت نشد." : (searchTerm || roleFilter !== 'all' || statusFilter !== 'all' ? "هیچ کاربری با این فیلترها یافت نشد." : "در حال بارگذاری...")}
                </h3>
                <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                    ? "هیچ کاربری با فیلترهای انتخاب شده یافت نشد"
                    : "کاربران در حال بارگذاری هستند"}
                </p>
                {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRoleFilter("all");
                      setStatusFilter("all");
                      setSortBy("newest");
                      setSearchTerm("");
                    }}
                    className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                  >
                    پاک کردن فیلترها
                  </Button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <div className="flex items-center space-x-1 space-x-reverse bg-voxcina-cream/20 dark:bg-voxcina-blue/20 rounded-xl p-1 shadow-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-lg ${
                      currentPage === 1
                        ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                        : "text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/30"
                    }`}
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>

                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "primary" : "ghost"}
                        size="sm"
                        className={`rounded-lg ${
                          currentPage === pageNumber
                            ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
                            : "text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/30"
                        }`}
                        onClick={() => paginate(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}

                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-lg ${
                      currentPage === totalPages
                        ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                        : "text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-blue/10 dark:hover:bg-voxcina-blue/30"
                    }`}
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit User Modal */}
      {editingUser && isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
          <motion.div
            className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
                ویرایش نقش کاربر: {editingUser.name}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                  نقش کاربر را انتخاب کنید
                </label>
                <select
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
                  value={editedRole}
                  onChange={(e) => setEditedRole(e.target.value as User['role'])}
                >
                  <option value="">انتخاب نقش جدید</option>
                  <option value="customer">مشتری</option>
                  <option value="admin">مدیر</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isLoading}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-sm hover:shadow-md transition-all duration-300 min-w-[80px]"
                onClick={handleSaveUserChanges}
                disabled={isLoading || !editedRole || editedRole === editingUser.role}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "ذخیره تغییرات"
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {userToDelete && isConfirmDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
          <motion.div
            className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream flex items-center">
                <AlertTriangle className="text-red-500 ml-2 h-6 w-6" />
                تایید حذف کاربر
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                onClick={() => setIsConfirmDeleteDialogOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                آیا از حذف کاربر "{userToDelete.name}" مطمئن هستید؟ این عمل قابل بازگشت نیست.
              </p>
            </div>
            <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                onClick={() => setIsConfirmDeleteDialogOpen(false)}
                disabled={isLoading}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow-md transition-all duration-300 min-w-[80px]"
                onClick={handleDeleteUser}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "بله، حذف کن"
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {isStatusChangeDialogOpen && userToChangeStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
          <motion.div
            className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-md mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream flex items-center">
                <AlertTriangle className={`ml-2 h-6 w-6 ${userToChangeStatus.isActive === true ? 'text-red-500' : 'text-green-500'}`} />
                تایید {userToChangeStatus.isActive === true ? 'غیرفعال‌سازی' : 'فعال‌سازی'} کاربر
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                onClick={() => setIsStatusChangeDialogOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                آیا از {userToChangeStatus.isActive === true ? 'غیرفعال‌سازی' : 'فعال‌سازی'} کاربر "{userToChangeStatus.name}" مطمئن هستید؟
              </p>
            </div>
            <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                onClick={() => setIsStatusChangeDialogOpen(false)}
                disabled={isLoading}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                className={`rounded-xl text-white shadow-sm hover:shadow-md transition-all duration-300 min-w-[80px] ${
                  userToChangeStatus.isActive === true 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
                onClick={handleStatusChangeConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  userToChangeStatus.isActive === true ? "غیرفعال کن" : "فعال کن"
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* User Details Sidebar */}
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed top-0 left-0 h-full w-full md:w-96 bg-white dark:bg-voxcina-blue/90 shadow-lg z-50 p-6 overflow-y-auto"
        >
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
        </motion.div>
      )}
    </div>
  );
}