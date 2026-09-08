"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Review } from "@/types/product";
import { useReviewStore } from "@/store/review-store";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import Link from "next/link";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
  AdminBadge,
  AdminBadgeTone,
  AdminEmpty,
  AdminSelect,
  AdminInput,
} from "@/components/admin/ui";

const REVIEW_STATUS_TONE: Record<string, AdminBadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const REVIEW_STATUS_LABEL: Record<string, string> = {
  pending: "در انتظار",
  approved: "تایید شده",
  rejected: "رد شده",
};

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
    <div>
      <AdminPageHeader
        title="مدیریت نظرات"
        subtitle={`لیست نظرات (${reviews.length.toLocaleString("fa-IR")})`}
        icon={<MessageSquare className="w-6 h-6" />}
      />

      <div className="mb-6 flex flex-col md:flex-row gap-3">
        <AdminSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="md:w-48"
          aria-label="فیلتر وضعیت"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="approved">تایید شده</option>
          <option value="rejected">رد شده</option>
        </AdminSelect>
        <AdminInput
          placeholder="شناسه محصول"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="md:w-48"
        />
        <AdminInput
          placeholder="شناسه کاربر"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="md:w-48"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReviews}
          className="rounded-xl md:w-auto w-full"
        >
          فیلتر
        </Button>
      </div>

      {reviews.length > 0 ? (
        <AdminTable
          head={
            <>
              <AdminTh>کاربر</AdminTh>
              <AdminTh>محصول</AdminTh>
              <AdminTh>امتیاز</AdminTh>
              <AdminTh>متن نظر</AdminTh>
              <AdminTh>پیشنهاد</AdminTh>
              <AdminTh>وضعیت</AdminTh>
              <AdminTh className="text-center">اقدام</AdminTh>
            </>
          }
        >
          {reviews.map((r) => (
            <tr key={r.id} className="hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/10 transition-colors">
              <AdminTd className="font-medium">{r.userName}</AdminTd>
              <AdminTd>
                <Link
                  href={`/products/${r.productId}`}
                  className="text-voxcina-blue hover:text-voxcina-darkBlue dark:text-voxcina-cream dark:hover:text-voxcina-lightCream hover:underline"
                >
                  {r.productId}
                </Link>
              </AdminTd>
              <AdminTd>
                <StarRating initialRating={r.rating} readonly size="sm" />
              </AdminTd>
              <AdminTd className="max-w-xs truncate" title={r.comment}>
                {r.comment?.slice(0, 80)}{r.comment && r.comment.length > 80 ? "…" : ""}
              </AdminTd>
              <AdminTd>
                {(r.isRecommended ?? (r as any).is_recommended) ? "بله" : "خیر"}
              </AdminTd>
              <AdminTd>
                <AdminBadge tone={REVIEW_STATUS_TONE[r.status ?? ""] ?? "neutral"}>
                  {REVIEW_STATUS_LABEL[r.status ?? ""] ?? r.status}
                </AdminBadge>
              </AdminTd>
              <AdminTd className="text-center">
                <div className="flex justify-center gap-2">
                  {r.status !== "approved" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStatusChange(r.id, "approved")}
                      className="rounded-xl"
                    >
                      تایید
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleStatusChange(r.id, "rejected")}
                      className="rounded-xl"
                    >
                      رد
                    </Button>
                  )}
                </div>
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <AdminEmpty
          icon={MessageSquare}
          title="هیچ نظری یافت نشد"
          description="هیچ نظری با فیلترهای انتخاب شده وجود ندارد"
        />
      )}
    </div>
  );
}