"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { Clock, ChevronLeft } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Order {
  id: string;
  order_number?: string;
  status: string;
  status_text?: string;
  statusText?: string;
  total_amount?: number;
  totalAmount?: number;
  total?: number;
  jalali_created_at?: string;
  jalaliCreatedAt?: string;
  date?: string;
  created_at?: string;
  createdAt?: string;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-voxcina-blue dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30";
    case "shipping":
      return "bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-voxcina-cream border border-voxcina-blue/20 dark:border-voxcina-blue/30";
    case "processing":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30";
    default:
      return "bg-voxcina-cream text-voxcina-blue dark:bg-voxcina-blue/10 dark:text-voxcina-lightCream border border-voxcina-cream/70 dark:border-voxcina-blue/20";
  }
};

const formatDate = (order: Order) =>
  order.jalali_created_at || order.jalaliCreatedAt || order.date || order.created_at || order.createdAt;

const formatAmount = (order: Order) =>
  formatPrice(order.total_amount ?? order.totalAmount ?? order.total ?? 0);

const formatStatus = (order: Order) => order.status_text || order.statusText;

const formatId = (order: Order) => order.order_number || order.id;

export default function RecentOrders({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const openOrder = (id: string) => router.push(`/dashboard/orders/${id}`);

  const recentOrders = [...orders]
    .sort((a, b) => {
      const da = new Date(a.created_at || a.createdAt || a.date || 0).getTime();
      const db = new Date(b.created_at || b.createdAt || b.date || 0).getTime();
      return db - da;
    })
    .slice(0, 5);

  if (recentOrders.length === 0) {
    return (
      <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/20 mb-4">
            <Clock className="h-8 w-8 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-voxcina-blue dark:text-voxcina-cream">
            سفارشی یافت نشد
          </h3>
          <p className="text-voxcina-blue/70 dark:text-voxcina-cream/70">
            هنوز هیچ سفارشی ثبت نکرده‌اید
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <Card className="hidden md:block border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-voxcina-cream/50 dark:scrollbar-thumb-voxcina-cream/30 dark:scrollbar-track-voxcina-blue/20">
          <table className="w-full">
            <thead className="bg-voxcina-cream/50 dark:bg-voxcina-blue/20">
              <tr>
                <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">
                  شماره سفارش
                </th>
                <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">
                  تاریخ
                </th>
                <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">
                  وضعیت
                </th>
                <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium">
                  مبلغ
                </th>
                <th className="text-right p-4 text-voxcina-blue/80 dark:text-voxcina-cream/80 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  className="border-b border-voxcina-cream/30 dark:border-voxcina-blue/10 hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/5 transition-colors cursor-pointer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => openOrder(order.id)}
                >
                  <td className="p-4 font-medium text-voxcina-blue dark:text-voxcina-cream">
                    {formatId(order)}
                  </td>
                  <td className="p-4 text-voxcina-blue/70 dark:text-voxcina-cream/70">
                    {formatDate(order)}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(order.status)}`}>
                      {formatStatus(order)}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-voxcina-blue dark:text-voxcina-cream">
                    {formatAmount(order)}
                  </td>
                  <td className="p-4 text-left">
                    <ChevronLeft className="h-5 w-5 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {recentOrders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={`/dashboard/orders/${order.id}`} className="block">
              <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm overflow-hidden rounded-xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream">
                      {formatId(order)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${getStatusStyle(order.status)}`}>
                      {formatStatus(order)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60">
                      {formatDate(order)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-voxcina-blue dark:text-voxcina-cream">
                        {formatAmount(order)}
                      </span>
                      <ChevronLeft className="h-4 w-4 text-voxcina-blue/40 dark:text-voxcina-cream/40" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </>
  );
}
