"use client";

import CollectionsPanel from "./_components/CollectionsPanel";
import { AdminPageHeader } from "@/components/admin/ui";
import { Layers } from "lucide-react";

export default function AdminCollectionsPage() {
  return (
    <div>
      <AdminPageHeader
        title="کالکشن‌ها"
        subtitle="بسته‌های منتخب از رنگ‌های مشخص محصولات — قیمت خودکار یا دستی، حذف‌شدن از فروش با ناموجود شدن هر آیتم"
        icon={<Layers className="w-6 h-6" />}
      />
      <CollectionsPanel />
    </div>
  );
}
