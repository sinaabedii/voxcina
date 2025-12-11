"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Store,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Filter,
  Search,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { useStoreStore } from "@/store/store-store";
import { Store as StoreType } from "@/types/store";

export default function AdminStoresPage() {
  const {
    stores,
    fetchAllStoresAdmin,
    updateStoreStatus,
    isLoading,
    pagination,
  } = useStoreStore();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);

  useEffect(() => {
    fetchAllStoresAdmin(1, statusFilter);
  }, [statusFilter]);

  const handleApprove = async (storeId: string) => {
    if (window.confirm("آیا از تایید این فروشگاه اطمینان دارید؟")) {
      try {
        await updateStoreStatus(storeId, "approved", true);
      } catch (error) {
        console.error("Failed to approve store:", error);
      }
    }
  };

  const handleReject = async (storeId: string) => {
    if (window.confirm("آیا از رد این فروشگاه اطمینان دارید؟")) {
      try {
        await updateStoreStatus(storeId, "rejected", false);
      } catch (error) {
        console.error("Failed to reject store:", error);
      }
    }
  };

  const handleSuspend = async (storeId: string) => {
    if (window.confirm("آیا از تعلیق این فروشگاه اطمینان دارید؟")) {
      try {
        await updateStoreStatus(storeId, "suspended", false);
      } catch (error) {
        console.error("Failed to suspend store:", error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            تایید شده
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-sm">
            <Clock className="w-4 h-4" />
            در انتظار
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm">
            <XCircle className="w-4 h-4" />
            رد شده
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 rounded-full text-sm">
            <XCircle className="w-4 h-4" />
            تعلیق شده
          </span>
        );
      default:
        return null;
    }
  };

  const filteredStores = stores.filter((store) =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
          مدیریت فروشگاه‌ها
        </h1>
        <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
          تایید و مدیریت فروشگاه‌های ثبت شده
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "همه فروشگاه‌ها",
            value: stores.length,
            color: "bg-blue-500",
          },
          {
            label: "در انتظار تایید",
            value: stores.filter((s) => s.status === "pending").length,
            color: "bg-yellow-500",
          },
          {
            label: "تایید شده",
            value: stores.filter((s) => s.status === "approved").length,
            color: "bg-green-500",
          },
          {
            label: "رد شده",
            value: stores.filter((s) => s.status === "rejected").length,
            color: "bg-red-500",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-voxcina-blue/50 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <Store className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="جستجوی فروشگاه..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار</option>
            <option value="approved">تایید شده</option>
            <option value="rejected">رد شده</option>
            <option value="suspended">تعلیق شده</option>
          </select>
        </div>
      </div>

      {/* Stores List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-voxcina-blue/50 rounded-xl">
          <Store className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
            فروشگاهی یافت نشد
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStores.map((store, index) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-voxcina-blue/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Store Logo */}
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {store.logo ? (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store className="w-10 h-10 text-gray-400" />
                  )}
                </div>

                {/* Store Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-voxcina-blue dark:text-voxcina-cream">
                        {store.name}
                      </h3>
                      <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                        {store.slug}
                      </p>
                    </div>
                    {getStatusBadge(store.status)}
                  </div>

                  <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mb-3 line-clamp-2">
                    {store.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      <Mail className="w-4 h-4" />
                      <span>{store.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      <Phone className="w-4 h-4" />
                      <span>{store.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {store.address.city}, {store.address.province}
                      </span>
                    </div>
                  </div>

                  {/* Store Stats */}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      {store.product_count} محصول
                    </span>
                    <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      {store.total_sales} فروش
                    </span>
                    <span className="text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      کمیسیون: {store.commission_rate}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2">
                  <button
                    onClick={() => setSelectedStore(store)}
                    className="flex-1 lg:flex-none px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    جزئیات
                  </button>

                  {store.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(store.id)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        تایید
                      </button>
                      <button
                        onClick={() => handleReject(store.id)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        رد
                      </button>
                    </>
                  )}

                  {store.status === "approved" && (
                    <button
                      onClick={() => handleSuspend(store.id)}
                      className="flex-1 lg:flex-none px-4 py-2 bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      تعلیق
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => fetchAllStoresAdmin(page, statusFilter)}
              className={`w-10 h-10 rounded-lg transition-colors ${
                pagination.currentPage === page
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Store Details Modal */}
      {selectedStore && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedStore(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-voxcina-blue/95 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-4">
              جزئیات فروشگاه
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  نام فروشگاه
                </label>
                <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                  {selectedStore.name}
                </p>
              </div>

              <div>
                <label className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  توضیحات
                </label>
                <p className="text-voxcina-blue dark:text-voxcina-cream">
                  {selectedStore.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                    ایمیل
                  </label>
                  <p className="text-voxcina-blue dark:text-voxcina-cream">
                    {selectedStore.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                    تلفن
                  </label>
                  <p className="text-voxcina-blue dark:text-voxcina-cream">
                    {selectedStore.phone}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  آدرس
                </label>
                <p className="text-voxcina-blue dark:text-voxcina-cream">
                  {selectedStore.address.address}, {selectedStore.address.city},{" "}
                  {selectedStore.address.province} - {selectedStore.address.postal_code}
                </p>
              </div>

              <div>
                <label className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60">
                  اطلاعات بانکی
                </label>
                <div className="bg-gray-50 dark:bg-voxcina-blue/30 rounded-lg p-3 space-y-1 text-sm">
                  <p>بانک: {selectedStore.bank_info.bank_name}</p>
                  <p>شماره حساب: {selectedStore.bank_info.account_number}</p>
                  <p>شبا: {selectedStore.bank_info.iban}</p>
                  <p>صاحب حساب: {selectedStore.bank_info.account_holder}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedStore(null)}
              className="mt-6 w-full py-2 bg-gray-100 dark:bg-gray-800 text-voxcina-blue dark:text-voxcina-cream rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              بستن
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
