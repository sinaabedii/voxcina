"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Store, Ticket, Users, Wallet } from "lucide-react";

import {
  AdminBadge,
  AdminEmpty,
  AdminError,
  AdminField,
  AdminLoading,
  AdminPageHeader,
  AdminSelect,
  AdminStatCard,
  AdminTable,
  AdminTd,
  AdminTh,
  AdminToolbar,
} from "@/components/admin/ui";
import { formatPrice } from "@/lib/utils";
import { useAdminSellerStore } from "@/store/admin-seller-store";

/**
 * Every seller, with what each of them has sold and is owed.
 *
 * Sorted by commission by default: the reason to open this page is usually to
 * settle up, and the biggest number is the one being settled.
 */
export default function AdminSellersPage() {
  const { list, isLoading, error, fetchSellers } = useAdminSellerStore();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("commission");

  // Debounced so typing a partner's name does not fire a request per keystroke;
  // each of these runs a full aggregation over the orders collection.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSellers({ search, sortBy });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sortBy, fetchSellers]);

  const faNumber = (value: number) => value.toLocaleString("fa-IR");

  return (
    <>
      <AdminPageHeader
        title="فروشندگان"
        subtitle="کدهای تخفیف همکاران فروش، عملکرد و سهم هر کدام"
        icon={<Store className="h-6 w-6" />}
      />

      {list && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard icon={Users} label="تعداد فروشندگان" value={faNumber(list.totals.seller_count)} />
          <AdminStatCard icon={Ticket} label="کدهای ساخته‌شده" value={faNumber(list.totals.voucher_count)} tone="violet" />
          <AdminStatCard
            icon={Wallet}
            label="مجموع سهم فروشندگان"
            value={formatPrice(list.totals.commission)}
            tone="green"
            hint={`از ${faNumber(list.totals.orders_paid)} سفارش پرداخت‌شده`}
          />
          <AdminStatCard
            icon={Wallet}
            label="تخفیف داده‌شده به مشتریان"
            value={formatPrice(list.totals.customer_discount)}
            tone="amber"
          />
        </div>
      )}

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="جستجو بر اساس نام، شماره تماس یا ایمیل..."
        filtersAlwaysOpen
      >
        <AdminField label="مرتب‌سازی">
          <AdminSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="commission">بیشترین سهم</option>
            <option value="orders">بیشترین سفارش</option>
            <option value="newest">جدیدترین</option>
            <option value="name">نام</option>
          </AdminSelect>
        </AdminField>
      </AdminToolbar>

      {isLoading && !list && <AdminLoading message="در حال محاسبه آمار فروشندگان..." />}
      {error && !list && <AdminError message={error} onRetry={() => fetchSellers({ search, sortBy })} />}

      {list && list.sellers.length === 0 && (
        <AdminEmpty
          icon={Store}
          title="هنوز فروشنده‌ای ثبت نشده"
          description="برای افزودن فروشنده، نقش کاربر را از بخش «کاربران» به «فروشنده» تغییر دهید."
        />
      )}

      {list && list.sellers.length > 0 && (
        <AdminTable
          head={
            <>
              <AdminTh>فروشنده</AdminTh>
              <AdminTh>کدها</AdminTh>
              <AdminTh>سفارش پرداخت‌شده</AdminTh>
              <AdminTh>مشتری یکتا</AdminTh>
              <AdminTh>تخفیف مشتری</AdminTh>
              <AdminTh>مبنای سهم</AdminTh>
              <AdminTh>سهم فروشنده</AdminTh>
              <AdminTh>وضعیت</AdminTh>
              <AdminTh />
            </>
          }
        >
          {list.sellers.map((seller) => (
            <tr key={seller.seller_id}>
              <AdminTd>
                <div className="font-medium text-voxcina-blue dark:text-voxcina-cream">
                  {seller.name}
                </div>
                {seller.phone && <div className="text-xs opacity-60">{seller.phone}</div>}
              </AdminTd>
              <AdminTd className="whitespace-nowrap">
                {faNumber(seller.active_voucher_count)}
                <span className="opacity-50"> / {faNumber(seller.voucher_count)}</span>
              </AdminTd>
              <AdminTd>
                {faNumber(seller.orders_paid)}
                {seller.orders_total !== seller.orders_paid && (
                  <span className="text-xs opacity-50"> / {faNumber(seller.orders_total)}</span>
                )}
              </AdminTd>
              <AdminTd>{faNumber(seller.unique_customers)}</AdminTd>
              <AdminTd className="whitespace-nowrap">{formatPrice(seller.customer_discount)}</AdminTd>
              <AdminTd className="whitespace-nowrap">{formatPrice(seller.commission_base)}</AdminTd>
              <AdminTd className="whitespace-nowrap font-bold text-green-700 dark:text-green-400">
                {formatPrice(seller.commission)}
              </AdminTd>
              <AdminTd>
                <AdminBadge tone={seller.is_active ? "success" : "danger"}>
                  {seller.is_active ? "فعال" : "غیرفعال"}
                </AdminBadge>
              </AdminTd>
              <AdminTd>
                <Link
                  href={`/admin/sellers/${seller.seller_id}`}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-voxcina-blue transition-colors hover:bg-voxcina-cream/40 dark:text-voxcina-cream dark:hover:bg-voxcina-blue/30"
                >
                  جزئیات
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
      )}
    </>
  );
}
