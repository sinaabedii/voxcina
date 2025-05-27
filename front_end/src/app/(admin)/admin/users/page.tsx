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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  useEffect(() => {
    fetchAllUsers().catch(err => {
      toast.error(`Failed to load users: ${err.message}`);
    });
  }, [fetchAllUsers]);

  // Filter and search users
  const filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.toLowerCase().includes(searchTerm.toLowerCase()));

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

  if (isLoading && allUsers.length === 0) {
    return <div className="flex justify-center items-center h-screen"><p className="text-lg">در حال بارگذاری کاربران...</p></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500"><p>خطا در بارگذاری کاربران: {error}</p></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 md:p-6"
    >
      <Card className="bg-white dark:bg-gray-800 shadow-xl rounded-lg">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <CardTitle className="text-2xl font-semibold text-gray-800 dark:text-white mb-2 sm:mb-0">
              <Users className="inline-block mr-3 text-primary h-7 w-7" />
              مدیریت کاربران ({sortedUsers.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
            <div className="relative flex-grow w-full md:w-auto">
              <Input
                type="text"
                placeholder="جستجو بر اساس نام، ایمیل، شماره تماس..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10 w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-[180px] bg-gray-50 dark:bg-gray-700">
                  <SelectValue placeholder="نقش کاربری" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه نقش‌ها</SelectItem>
                  <SelectItem value="admin">مدیر</SelectItem>
                  <SelectItem value="customer">مشتری</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px] bg-gray-50 dark:bg-gray-700">
                  <SelectValue placeholder="وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px] bg-gray-50 dark:bg-gray-700">
                  <SelectValue placeholder="مرتب‌سازی بر اساس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">جدیدترین عضویت</SelectItem>
                  <SelectItem value="name">نام (الفبایی)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading && <p className="text-center text-gray-500 dark:text-gray-400 py-4">در حال به‌روزرسانی لیست...</p>}

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-750">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">کاربر</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">نقش</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">وضعیت</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">تاریخ عضویت</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentUsers.length > 0 ? currentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img className="h-10 w-10 rounded-full" src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random&color=fff`} alt={user.name} />
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                          {user.phone && <div className="text-xs text-gray-500 dark:text-gray-400">{user.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            ویرایش نقش
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(user.id, user.isActive)}>
                            {user.isActive === true ? <Ban className="mr-2 h-4 w-4 text-red-500" /> : <CheckCircle className="mr-2 h-4 w-4 text-green-500" />}
                            {user.isActive === true ? 'غیرفعال کردن' : 'فعال کردن'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => confirmDeleteUser(user)} className="text-red-600 dark:text-red-400 hover:!text-red-700 dark:hover:!text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            حذف کاربر
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {allUsers.length === 0 && !isLoading ? "هیچ کاربری یافت نشد." : (searchTerm || roleFilter !== 'all' || statusFilter !== 'all' ? "هیچ کاربری با این فیلترها یافت نشد." : "در حال بارگذاری...")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronRight className="h-4 w-4 mr-1" />
                قبلی
              </Button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                صفحه {currentPage} از {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                بعدی
                <ChevronLeft className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {editingUser && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ویرایش نقش کاربر: {editingUser.name}</DialogTitle>
              <DialogDescription>
                نقش کاربر را انتخاب کنید.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Select value={editedRole} onValueChange={(value: string) => setEditedRole(value as User['role'])}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب نقش جدید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">مشتری</SelectItem>
                  <SelectItem value="admin">مدیر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>انصراف</Button>
              <Button onClick={handleSaveUserChanges} disabled={isLoading || !editedRole || editedRole === editingUser.role}>
                {isLoading ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {userToDelete && (
         <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangle className="text-red-500 mr-2 h-6 w-6" />
                تایید حذف کاربر
              </DialogTitle>
              <DialogDescription>
                آیا از حذف کاربر "{userToDelete.name}" مطمئن هستید؟ این عمل قابل بازگشت نیست.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsConfirmDeleteDialogOpen(false)}>
                انصراف
              </Button>
              <Button variant="danger" onClick={handleDeleteUser} disabled={isLoading}>
                {isLoading ? "در حال حذف..." : "بله، حذف کن"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedUser && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed top-0 left-0 h-full w-full md:w-96 bg-white dark:bg-gray-800 shadow-lg z-50 p-6 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">مشخصات کاربر</h3>
            <Button variant="ghost" size="sm" className="p-2" onClick={() => setSelectedUser(null)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <img className="h-16 w-16 rounded-full" src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.name}&background=random&color=fff`} alt={selectedUser.name} />
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedUser.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.role}</p>
              </div>
            </div>
            <div>
              <Mail className="inline-block mr-2 h-5 w-5 text-gray-400 dark:text-gray-300" />
              <span className="text-sm text-gray-700 dark:text-gray-200">{selectedUser.email}</span>
            </div>
            {selectedUser.phone && (
              <div>
                <Phone className="inline-block mr-2 h-5 w-5 text-gray-400 dark:text-gray-300" />
                <span className="text-sm text-gray-700 dark:text-gray-200">{selectedUser.phone}</span>
              </div>
            )}
            <div>
              <Calendar className="inline-block mr-2 h-5 w-5 text-gray-400 dark:text-gray-300" />
              <span className="text-sm text-gray-700 dark:text-gray-200">عضویت: {formatDate(selectedUser.createdAt)}</span>
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
    </motion.div>
  );
} 