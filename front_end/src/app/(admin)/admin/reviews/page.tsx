"use client";
import { useEffect, useState } from "react";
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">مدیریت نظرات</h1>
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="approved">تایید شده</option>
          <option value="rejected">رد شده</option>
        </select>
        <input placeholder="Product ID" value={productFilter} onChange={(e)=>setProductFilter(e.target.value)} className="border p-2 rounded" />
        <input placeholder="User ID" value={userFilter} onChange={(e)=>setUserFilter(e.target.value)} className="border p-2 rounded" />
        <Button variant="outline" onClick={fetchReviews}>فیلتر</Button>
      </div>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">کاربر</th>
            <th className="p-2">محصول</th>
            <th className="p-2">امتیاز</th>
            <th className="p-2">متن نظر</th>
            <th className="p-2">پیشنهاد</th>
            <th className="p-2">وضعیت</th>
            <th className="p-2">اقدام</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.userName}</td>
              <td className="p-2 text-blue-600"><Link href={`/products/${r.productId}`}>{r.productId}</Link></td>
              <td className="p-2"><StarRating initialRating={r.rating} readonly size="sm" /></td>
              <td className="p-2 max-w-xs truncate" title={r.comment}>{r.comment?.slice(0, 80)}{r.comment && r.comment.length>80 ? "…" : ""}</td>
              <td className="p-2">{(r.isRecommended ?? (r as any).is_recommended) ? "بله" : "خیر"}</td>
              <td className="p-2">{r.status}</td>
              <td className="p-2 space-x-2 space-x-reverse">
                {r.status!=="approved" && <Button size="sm" onClick={()=>handleStatusChange(r.id, "approved")}>تایید</Button>}
                {r.status!=="rejected" && <Button size="sm" onClick={()=>handleStatusChange(r.id, "rejected")}>رد</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 