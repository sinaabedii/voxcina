"use client";

import { useState } from "react";
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
  User,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Mock users data - would be fetched from API in real application
  const [users, setUsers] = useState([
    {
      id: "user-1",
      name: "علی محمدی",
      email: "ali.mohammadi@example.com",
      phone: "09123456789",
      role: "admin",
      status: "active",
      avatar: "https://placehold.co/50x50",
      joinDate: "1402/02/14",
      lastLogin: "1402/06/15",
      ordersCount: 0,
      totalSpent: 0,
    },
    {
      id: "user-2",
      name: "زهرا احمدی",
      email: "zahra.ahmadi@example.com",
      phone: "09123456780",
      role: "customer",
      status: "active",
      avatar: "https://placehold.co/50x50",
      joinDate: "1401/09/25",
      lastLogin: "1402/06/12",
      ordersCount: 12,
      totalSpent: 4750000,
    },
    {
      id: "user-3",
      name: "محمد حسینی",
      email: "m.hosseini@example.com",
      phone: "09123456781",
      role: "customer",
      status: "active",
      avatar: "https://placehold.co/50x50",
      joinDate: "1401/11/03",
      lastLogin: "1402/06/10",
      ordersCount: 8,
      totalSpent: 3200000,
    },
    {
      id: "user-4",
      name: "فاطمه کریمی",
      email: "f.karimi@example.com",
      phone: "09123456782",
      role: "customer",
      status: "inactive",
      avatar: "https://placehold.co/50x50",
      joinDate: "1401/07/12",
      lastLogin: "1402/03/05",
      ordersCount: 3,
      totalSpent: 850000,
    },
    {
      id: "user-5",
      name: "امیر رضایی",
      email: "amir.rezaei@example.com",
      phone: "09123456783",
      role: "customer",
      status: "banned",
      avatar: "https://placehold.co/50x50",
      joinDate: "1401/04/22",
      lastLogin: "1401/11/18",
      ordersCount: 2,
      totalSpent: 450000,
    },
    {
      id: "user-6",
      name: "سارا نجفی",
      email: "sara.najafi@example.com",
      phone: "09123456784",
      role: "staff",
      status: "active",
      avatar: "https://placehold.co/50x50",
      joinDate: "1402/01/05",
      lastLogin: "1402/06/14",
      ordersCount: 0,
      totalSpent: 0,
    },
    {
      id: "user-7",
      name: "مهدی قاسمی",
      email: "mehdi.ghasemi@example.com",
      phone: "09123456785",
      role: "customer",
      status: "active",
      avatar: "https://placehold.co/50x50",
      joinDate: "1401/08/19",
      lastLogin: "1402/06/09",
      ordersCount: 15,
      totalSpent: 5800000,
    },
    {
      id: "user-8",
      name: "مینا صادقی",
      email: "mina.sadeghi@example.com",
      phone: "09123456786",
      role: "customer",
      status: "active",
      avatar: "https://placehold.co/50x50",
      joinDate: "1401/12/10",
      lastLogin: "1402/06/01",
      ordersCount: 6,
      totalSpent: 2100000,
    },
    {
      id: "user-9",
      name: "رضا محمودی",
      email: "reza.mahmoudi@example.com",
      phone: "09123456787",
      role: "customer",
      status: "inactive",
      avatar: "https://placehold.co/50x50",
      joinDate: "1401/05/15",
      lastLogin: "1402/02/28",
      ordersCount: 1,
      totalSpent: 320000,
    },
    {
      id: "user-10",
      name: "نیلوفر جعفری",
      email: "niloofar.jafari@example.com",
      phone: "09123456788",
      role: "customer",
      status: "active",
      avatar: "https://placehold.co/50x50",
      joinDate: "1401/10/07",
      lastLogin: "1402/06/08",
      ordersCount: 9,
      totalSpent: 3750000,
    },
  ]);

  // Filter and search users
  const filteredUsers = users.filter((user: any) => {
    // Filter by search term
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by role
    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    // Filter by status
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "orders":
        return b.ordersCount - a.ordersCount;
      case "spent":
        return b.totalSpent - a.totalSpent;
      case "newest":
      default:
        // Assuming joinDate is in format YYYY/MM/DD
        return b.joinDate.localeCompare(a.joinDate);
    }
  });

  // Pagination
  const usersPerPage = 5;
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "inactive":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "banned":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  // Get role badge class
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "staff":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "customer":
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  // Handle status change
  const handleStatusChange = (userId: string, newStatus: string) => {
    const updatedUsers = users.map((user: any) =>
      user.id === userId ? { ...user, status: newStatus } : user
    );
    setUsers(updatedUsers);
    
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser({ ...selectedUser, status: newStatus });
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
      transition: { type: "spring", stiffness: 300, damping: 30 },
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
          <span className="relative z-10">مدیریت کاربران</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>
        
        <div className="flex space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            className={`rounded-xl ${
              isFilterOpen
                ? "bg-voxcina-blue/10 dark:bg-voxcina-cream/10 border-voxcina-blue/30 dark:border-voxcina-cream/30"
                : "border-voxcina-blue/20 dark:border-voxcina-cream/20"
            } text-voxcina-blue dark:text-voxcina-cream`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter className="w-4 h-4 ml-1" />
            فیلترها
            <ChevronDown className={`w-4 h-4 mr-1 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
          </Button>
        </div>
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
            placeholder="جستجوی نام، ایمیل یا شماره موبایل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Filters */}
      {isFilterOpen && (
        <motion.div
          className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              نقش کاربر
            </label>
            <select
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">همه نقش‌ها</option>
              <option value="admin">مدیر</option>
              <option value="staff">کارمند</option>
              <option value="customer">مشتری</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              وضعیت
            </label>
            <select
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
              <option value="banned">مسدود شده</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-1">
              مرتب‌سازی
            </label>
            <select
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">جدیدترین</option>
              <option value="name">نام</option>
              <option value="orders">تعداد سفارشات</option>
              <option value="spent">مبلغ کل خرید</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* Users List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {currentUsers.length > 0 ? (
          <div className="space-y-4">
            {currentUsers.map((user) => (
              <motion.div
                key={user.id}
                variants={itemVariants}
                className="transition-all duration-300"
              >
                <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-voxcina-cream/50 dark:bg-voxcina-blue/20 flex-shrink-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mr-3 flex-grow">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                              {user.name}
                            </h3>
                            <div className="flex items-center text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 space-x-2 space-x-reverse">
                              <Mail className="w-3.5 h-3.5 ml-1" />
                              <span>{user.email}</span>
                              <span className="mx-1">|</span>
                              <Phone className="w-3.5 h-3.5 ml-1" />
                              <span>{user.phone}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 space-x-reverse">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(user.status)}`}
                            >
                              {user.status === "active" ? "فعال" : user.status === "inactive" ? "غیرفعال" : "مسدود شده"}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeClass(user.role)}`}
                            >
                              {user.role === "admin" ? "مدیر" : user.role === "staff" ? "کارمند" : "مشتری"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center mt-2 text-sm">
                          <div className="flex items-center ml-4">
                            <Calendar className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60 ml-1" />
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              عضویت: {user.joinDate}
                            </span>
                          </div>
                          <div className="flex items-center ml-4">
                            <ShoppingBag className="w-4 h-4 text-voxcina-blue/60 dark:text-voxcina-cream/60 ml-1" />
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              {user.ordersCount} سفارش
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                              {user.totalSpent.toLocaleString()} تومان
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 mr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                          onClick={() => setSelectedUser(user)}
                        >
                          <UserCog className="w-4 h-4" />
                        </Button>
                        {user.status === "active" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500/70 hover:text-red-500 dark:text-red-400/70 dark:hover:text-red-400 rounded-lg"
                            onClick={() => handleStatusChange(user.id, "banned")}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : user.status === "banned" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-500/70 hover:text-green-500 dark:text-green-400/70 dark:hover:text-green-400 rounded-lg"
                            onClick={() => handleStatusChange(user.id, "active")}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-500/70 hover:text-green-500 dark:text-green-400/70 dark:hover:text-green-400 rounded-lg"
                            onClick={() => handleStatusChange(user.id, "active")}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
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
                <Users className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                کاربری یافت نشد
              </h3>
              <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-6">
                هیچ کاربری با جستجو یا فیلترهای انتخاب شده یافت نشد
              </p>
              <div className="flex justify-center space-x-2 space-x-reverse">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                  }}
                  className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                >
                  پاک کردن فیلترها
                </Button>
              </div>
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

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-voxcina-blue/40 backdrop-blur-sm dark:bg-black/60">
          <motion.div
            className="bg-white dark:bg-voxcina-blue/90 rounded-2xl shadow-lg w-full max-w-lg mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center p-4 border-b border-voxcina-cream/30 dark:border-voxcina-blue/30">
              <h3 className="font-bold text-lg text-voxcina-blue dark:text-voxcina-cream">
                جزئیات کاربر
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:text-voxcina-blue dark:hover:text-voxcina-cream rounded-lg"
                onClick={() => setSelectedUser(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              <div className="flex items-center mb-6">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-voxcina-cream/50 dark:bg-voxcina-blue/20 flex-shrink-0">
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mr-4">
                  <h2 className="text-xl font-semibold text-voxcina-blue dark:text-voxcina-cream">
                    {selectedUser.name}
                  </h2>
                  <div className="flex items-center space-x-2 space-x-reverse mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(selectedUser.status)}`}
                    >
                      {selectedUser.status === "active" ? "فعال" : selectedUser.status === "inactive" ? "غیرفعال" : "مسدود شده"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeClass(selectedUser.role)}`}
                    >
                      {selectedUser.role === "admin" ? "مدیر" : selectedUser.role === "staff" ? "کارمند" : "مشتری"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      ایمیل
                    </label>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 ml-2" />
                      <p className="text-voxcina-blue dark:text-voxcina-cream">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      شماره موبایل
                    </label>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 ml-2" />
                      <p className="text-voxcina-blue dark:text-voxcina-cream">
                        {selectedUser.phone}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      تاریخ عضویت
                    </label>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 ml-2" />
                      <p className="text-voxcina-blue dark:text-voxcina-cream">
                        {selectedUser.joinDate}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      آخرین ورود
                    </label>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 ml-2" />
                      <p className="text-voxcina-blue dark:text-voxcina-cream">
                        {selectedUser.lastLogin}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      تعداد سفارشات
                    </label>
                    <div className="flex items-center">
                      <ShoppingBag className="w-4 h-4 text-voxcina-blue/70 dark:text-voxcina-cream/70 ml-2" />
                      <p className="text-voxcina-blue dark:text-voxcina-cream">
                        {selectedUser.ordersCount} سفارش
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      مجموع خرید
                    </label>
                    <div className="flex items-center">
                      <p className="text-voxcina-blue dark:text-voxcina-cream">
                        {selectedUser.totalSpent.toLocaleString()} تومان
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                    تغییر وضعیت کاربر
                  </label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Button
                      variant={selectedUser.status === "active" ? "primary" : "outline"}
                      size="sm"
                      className={`rounded-xl ${
                        selectedUser.status === "active"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "border-green-600/30 text-green-600 dark:border-green-500/30 dark:text-green-500 hover:bg-green-600/10"
                      }`}
                      onClick={() => handleStatusChange(selectedUser.id, "active")}
                    >
                      <CheckCircle className="w-4 h-4 ml-1" />
                      فعال
                    </Button>
                    <Button
                      variant={selectedUser.status === "inactive" ? "primary" : "outline"}
                      size="sm"
                      className={`rounded-xl ${
                        selectedUser.status === "inactive"
                          ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                          : "border-yellow-600/30 text-yellow-600 dark:border-yellow-500/30 dark:text-yellow-500 hover:bg-yellow-600/10"
                      }`}
                      onClick={() => handleStatusChange(selectedUser.id, "inactive")}
                    >
                      <User className="w-4 h-4 ml-1" />
                      غیرفعال
                    </Button>
                    <Button
                      variant={selectedUser.status === "banned" ? "primary" : "outline"}
                      size="sm"
                      className={`rounded-xl ${
                        selectedUser.status === "banned"
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "border-red-600/30 text-red-600 dark:border-red-500/30 dark:text-red-500 hover:bg-red-600/10"
                      }`}
                      onClick={() => handleStatusChange(selectedUser.id, "banned")}
                    >
                      <Ban className="w-4 h-4 ml-1" />
                      مسدود
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-voxcina-cream/30 dark:border-voxcina-blue/30 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                onClick={() => setSelectedUser(null)}
              >
                بستن
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 