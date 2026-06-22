"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Review } from "@/types/product";
import { useReviewStore } from "@/store/review-store";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import Link from "next/link";

export default function AdminReviewsPage() {
  const { updateReviewStatusAdmin } = useReviewStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [productFilter, setProductFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  const fetchReviews = async () => {
    const token = localStorage.getItem("authToken") || "";
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (productFilter) params.append("productId", productFilter);
    if (userFilter) params.append("userId", userFilter);

    const res = await fetch(`/api/admin/reviews?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setReviews(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const handleStatusChange = async (id: string, status: string) => {
    const token = localStorage.getItem("authToken") || "";
    if (!token) return;
    const ok = await updateReviewStatusAdmin(id, status as any, token);
    if (ok) fetchReviews();
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
          <span className="relative z-10">مدیریت نظرات</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>
      </motion.div>

      <motion.div
        className="mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl p-2.5 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50 shadow-sm"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار</option>
            <option value="approved">تایید شده</option>
            <option value="rejected">رد شده</option>
          </select>
          <input
            placeholder="Product ID"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50 shadow-sm"
          />
          <input
            placeholder="User ID"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl p-2.5 placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50 shadow-sm"
          />
          <Button
            variant="outline"
            onClick={fetchReviews}
            className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
          >
            فیلتر
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-xl rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
          <CardHeader className="border-b border-voxcina-cream/30 dark:border-voxcina-blue/30 p-6">
            <CardTitle className="text-2xl font-semibold text-voxcina-blue dark:text-voxcina-cream">
              <MessageSquare className="inline-block mr-3 text-voxcina-blue dark:text-voxcina-cream h-7 w-7" />
              لیست نظرات ({reviews.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {reviews.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-voxcina-cream/50 dark:border-voxcina-blue/30">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-voxcina-cream/30 dark:bg-voxcina-blue/20">
                      <th className="p-4 text-right text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">کاربر</th>
                      <th className="p-4 text-right text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">محصول</th>
                      <th className="p-4 text-right text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">امتیاز</th>
                      <th className="p-4 text-right text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">متن نظر</th>
                      <th className="p-4 text-right text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">پیشنهاد</th>
                      <th className="p-4 text-right text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">وضعیت</th>
                      <th className="p-4 text-center text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider">اقدام</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-voxcina-blue/5 divide-y divide-voxcina-cream/30 dark:divide-voxcina-blue/20">
                    {reviews.map((r) => (
                      <tr key={r.id} className="hover:bg-voxcina-cream/10 dark:hover:bg-voxcina-blue/10 transition-colors">
                        <td className="p-4 text-voxcina-blue dark:text-voxcina-cream">{r.userName}</td>
                        <td className="p-4">
                          <Link 
                            href={`/products/${r.productId}`} 
                            className="text-voxcina-blue hover:text-voxcina-darkBlue dark:text-voxcina-cream dark:hover:text-voxcina-lightCream hover:underline"
                          >
                            {r.productId}
                          </Link>
                        </td>
                        <td className="p-4">
                          <StarRating initialRating={r.rating} readonly size="sm" />
                        </td>
                        <td className="p-4 max-w-xs truncate text-voxcina-blue dark:text-voxcina-cream" title={r.comment}>
                          {r.comment?.slice(0, 80)}{r.comment && r.comment.length > 80 ? "…" : ""}
                        </td>
                        <td className="p-4 text-voxcina-blue dark:text-voxcina-cream">
                          {(r.isRecommended ?? (r as any).is_recommended) ? "بله" : "خیر"}
                        </td>
                        <td className="p-4 text-voxcina-blue dark:text-voxcina-cream">{r.status}</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            {r.status !== "approved" && (
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusChange(r.id, "approved")}
                                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white"
                              >
                                تایید
                              </Button>
                            )}
                            {r.status !== "rejected" && (
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusChange(r.id, "rejected")}
                                className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
                              >
                                رد
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
                  <MessageSquare className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
                  هیچ نظری یافت نشد
                </h3>
                <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
                  هیچ نظری با فیلترهای انتخاب شده وجود ندارد
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}