"use client";

import { Layers } from "lucide-react";
import CollectionsPanel from "./_components/CollectionsPanel";

export default function AdminCollectionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Layers className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-gray-900">کالکشن‌ها</h1>
          <p className="text-sm text-gray-500">
            بسته‌های منتخب از رنگ‌های مشخص محصولات — قیمت خودکار یا دستی، حذف‌شدن
            از فروش با ناموجود شدن هر آیتم
          </p>
        </div>
      </div>
      <CollectionsPanel />
    </div>
  );
}
