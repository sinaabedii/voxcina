"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  Eye,
  EyeOff,
  PackageOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useShopCollectionStore } from "@/store/shop-collection-store";
import { useProductStore } from "@/store/product-store";
import { useAuthStore } from "@/store/auth-store";
import { ShopCollectionView } from "@/types/shopCollection";
import { toPersianNumber } from "@/lib/utils";
import CollectionFormModal from "./CollectionFormModal";

const STATUS_FILTERS: { value: "" | "active" | "inactive"; label: string }[] = [
  { value: "", label: "همه" },
  { value: "active", label: "منتشرشده" },
  { value: "inactive", label: "غیرفعال" },
];

export default function CollectionsPanel() {
  const {
    collections,
    stats,
    isLoading,
    isSaving,
    error,
    fetchCollections,
    createCollection,
    updateCollection,
    patchCollection,
    deleteCollection,
  } = useShopCollectionStore();

  const adminProducts = useProductStore((s) => s.adminProducts);
  const fetchAdminProducts = useProductStore((s) => s.fetchAdminProducts);
  const adminToken = useAuthStore((s) => s.adminToken);

  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ShopCollectionView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShopCollectionView | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce typing so a search does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchCollections({ status: statusFilter, search });
  }, [statusFilter, search, fetchCollections]);

  // The picker resolves prices/variants from the admin product list.
  useEffect(() => {
    if (adminProducts.length === 0) fetchAdminProducts(adminToken ?? undefined);
  }, [adminProducts.length, fetchAdminProducts, adminToken]);

  const handleSubmit = async (save: Parameters<typeof createCollection>[0]) =>
    editTarget?.id
      ? updateCollection(editTarget.id, save)
      : createCollection(save);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    const ok = await deleteCollection(deleteTarget.id);
    setDeleting(false);
    if (ok) setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "کل کالکشن‌ها", value: stats?.total ?? 0, icon: Layers },
          { label: "منتشرشده", value: stats?.active ?? 0, icon: Eye },
          { label: "غیرفعال", value: stats?.inactive ?? 0, icon: EyeOff },
          { label: "موجود", value: stats?.in_stock ?? 0, icon: PackageOpen },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <item.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-lg font-bold">
                  {toPersianNumber(item.value)}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {item.label}
                </span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + create */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                statusFilter === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="جستجوی کالکشن..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-9 pl-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <Button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 ml-1" />
          کالکشن جدید
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-400">در حال بارگذاری...</p>
      ) : collections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-400">
            هنوز کالکشنی ساخته نشده است.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {collections.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.images?.[0] || ""}
                  alt={c.title}
                  className="h-20 w-20 shrink-0 rounded-lg object-cover bg-gray-100"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold text-gray-900">{c.title}</h3>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        title={c.is_active ? "غيرفعال‌سازی" : "انتشار"}
                        onClick={() => c.id && patchCollection(c.id, { is_active: !c.is_active })}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                      >
                        {c.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        title="ویرایش"
                        onClick={() => {
                          setEditTarget(c);
                          setFormOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="حذف"
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {c.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{c.description}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                      {toPersianNumber(c.items?.length ?? 0)} محصول
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        c.in_stock
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.in_stock ? "موجود" : "ناموجود"}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                      {c.price_mode === "custom" ? "قیمت دستی" : "قیمت خودکار"}
                    </span>
                    {c.price_warning && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                        <AlertTriangle className="h-3 w-3" />
                        قیمت بالای مجموع
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm font-bold text-gray-900">
                    {Math.round(c.effective_price).toLocaleString("fa-IR")} تومان
                    {c.price_mode === "custom" && (
                      <span className="mr-2 text-xs font-normal text-gray-400">
                        (مجموع: {Math.round(c.items_total).toLocaleString("fa-IR")})
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CollectionFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editTarget}
        products={adminProducts}
        isSaving={isSaving}
        onSubmit={handleSubmit}
      />

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف کالکشن"
        contentClassName="max-w-sm"
      >
        <p className="text-sm text-gray-700 p-1">
          آیا از حذف «{deleteTarget?.title}» مطمئن هستید؟ تصاویر آپلودشده هم پاک
          می‌شوند؛ محصولات داخل کالکشن دست‌نخورده می‌مانند.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "در حال حذف..." : "حذف"}
          </Button>
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            انصراف
          </Button>
        </div>
      </Modal>
    </div>
  );
}
