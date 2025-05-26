"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  TruckIcon,
  Clock,
  ArrowRight,
  Calendar,
  Download,
  CreditCard,
  MapPin,
  Phone,
  ChevronLeft,
  User,
  AlertCircle,
  CheckCircle,
  ShoppingBag,
  Copy,
  Truck,
  Tag,
  Box,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from 'next/navigation';
import { useOrderStore } from '@/store/order-store';
import { Order, OrderItem, ShippingAddress } from '@/types/order';
import { formatPrice, formatDate } from '@/lib/utils';

interface OrderDetailsParams {
  id: string;
}

const OrderDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const {
    currentOrder,
    isLoading,
    error,
    fetchOrderById,
  } = useOrderStore();

  useEffect(() => {
    if (orderId) {
      if (!currentOrder || currentOrder.id !== orderId) {
        fetchOrderById(orderId);
      }
    }
  }, [orderId, fetchOrderById, currentOrder]);

  const getStatusStyle = (status: Order['status'] | Order['payment_status'] | string) => {
    switch (status) {
      case 'delivered':
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'shipped':
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      case 'cancelled':
      case 'refunded':
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: Order['status'] | Order['payment_status'] | string) => {
    switch (status) {
      case 'delivered':
        return <Package className="w-4 h-4 mr-1.5" />;
      case 'paid':
        return <CreditCard className="w-4 h-4 mr-1.5" />;
      case 'shipped':
      case 'processing':
        return <Truck className="w-4 h-4 mr-1.5" />;
      case 'pending':
        return <Clock className="w-4 h-4 mr-1.5" />;
      case 'cancelled':
      case 'refunded':
      case 'failed':
        return <AlertCircle className="w-4 h-4 mr-1.5" />;
      default:
        return <Box className="w-4 h-4 mr-1.5" />;
    }
  };

  if (isLoading) {
  return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="ml-3 text-lg text-gray-600 dark:text-gray-400">درحال بارگذاری جزئیات سفارش...</p>
        </div>
    );
  }

  if (error && !currentOrder) {
    return (
      <div className="container py-10 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold text-red-700 dark:text-red-400 mb-2">خطا در دریافت اطلاعات سفارش</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
        <Button onClick={() => router.push('/dashboard/orders')} variant="outline">
          <ArrowRight className="ml-2 h-4 w-4" />
          بازگشت به لیست سفارش‌ها
            </Button>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="container py-10 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">سفارش یافت نشد</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          ممکن است این سفارش وجود نداشته باشد یا شما دسترسی لازم را ندارید.
        </p>
        <Button onClick={() => router.push('/dashboard/orders')} variant="outline">
          <ArrowRight className="ml-2 h-4 w-4" />
          بازگشت به لیست سفارش‌ها
              </Button>
      </div>
    );
  }
  
  if (currentOrder.id !== orderId && !isLoading) {
      fetchOrderById(orderId);
      return (
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <p className="ml-3 text-lg text-gray-600 dark:text-gray-400">بارگذاری سفارش صحیح...</p>
        </div>
      );
  }

  const order = currentOrder;
  const { items, shipping_address, total_amount } = order;

  const itemsSubtotal = items.reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0);

  return (
    <div className="container mx-auto max-w-4xl py-8 md:py-12 px-4">
      <div className="mb-6">
        <Button onClick={() => router.push('/dashboard/orders')} variant="outline" size="sm" className="flex items-center">
          <ChevronLeft className="w-4 h-4 ml-1" />
          بازگشت به لیست سفارش‌ها
        </Button>
                    </div>

      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <CardTitle className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                جزئیات سفارش #{order.order_number}
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ثبت شده در: {order.jalali_created_at || formatDate(order.created_at)}
                    </p>
                  </div>
            <div
              className={`px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center ${getStatusStyle(order.status)}`}
            >
              {getStatusIcon(order.status)}
              {order.status_text}
            </div>
                          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2">اطلاعات کلی سفارش</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 ml-2 text-indigo-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">تاریخ بروزرسانی:</span>
                <span className="mr-2 text-gray-600 dark:text-gray-400">
                  {order.jalali_updated_at || formatDate(order.updated_at)}
                            </span>
                          </div>
                            <div className="flex items-center">
                <CreditCard className="w-5 h-5 ml-2 text-green-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">وضعیت پرداخت:</span>
                            <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center mr-2 ${getStatusStyle(order.payment_status)}`}
                            >
                  {getStatusIcon(order.payment_status)}
                  {order.payment_status === 'paid' ? 'پرداخت شده' : order.payment_status === 'pending' ? 'در انتظار پرداخت' : 'خطا در پرداخت'}
                            </span>
                          </div>
              {order.tracking_code && (
                <div className="flex items-center md:col-span-2">
                  <Truck className="w-5 h-5 ml-2 text-blue-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">کد رهگیری پستی:</span>
                  <span className="mr-2 text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {order.tracking_code}
                                </span>
                </div>
              )}
                              </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2 flex items-center">
              <MapPin className="w-5 h-5 ml-2 text-indigo-500" />
              آدرس تحویل سفارش
            </h3>
            {shipping_address ? (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg text-sm text-indigo-800 dark:text-indigo-300 space-y-1">
                <p><strong className="font-medium">استان:</strong> {shipping_address.state}</p>
                <p><strong className="font-medium">شهر:</strong> {shipping_address.city}</p>
                <p><strong className="font-medium">آدرس دقیق:</strong> {shipping_address.street}</p>
                <p><strong className="font-medium">کد پستی:</strong> {shipping_address.postal_code}</p>
                              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">اطلاعات آدرس موجود نیست.</p>
            )}
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2 flex items-center">
                <Package className="w-5 h-5 ml-2 text-indigo-500" />
                محصولات سفارش داده شده ({items.length})
                            </h3>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.product_id + index} className="flex flex-col sm:flex-row gap-4 p-4 border dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                  <div className="w-full sm:w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <Package size={32} /> 
                                </div>
                                <div className="flex-grow">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                      محصول شناسه: {item.product_id}
                            </h4>
                    {(item.variant.size !== 'N/A' || item.variant.color !== 'N/A') && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.variant.size !== 'N/A' && `سایز: ${item.variant.size}`}
                        {item.variant.size !== 'N/A' && item.variant.color !== 'N/A' && ', '}
                        {item.variant.color !== 'N/A' && `رنگ: ${item.variant.color}`}
                        </p>
                                      )}
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      تعداد: {item.quantity} عدد
                                      </p>
                                    </div>
                  <div className="text-left sm:text-right whitespace-nowrap">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatPrice(item.price_at_purchase * item.quantity)} تومان
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      (هر عدد: {formatPrice(item.price_at_purchase)} تومان)
                    </p>
                                </div>
                              </div>
                            ))}
                          </div>
          </section>

          <section>
             <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b pb-2 flex items-center">
                <Tag className="w-5 h-5 ml-2 text-indigo-500" />
                خلاصه مالی سفارش
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">جمع قیمت محصولات (با تخفیف خرید):</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatPrice(itemsSubtotal)} تومان</span>
                        </div>
                <div className="flex justify-between text-lg font-bold text-indigo-700 dark:text-indigo-400 pt-2 border-t dark:border-gray-700 mt-2">
                    <span>مبلغ نهایی پرداخت شده:</span>
                    <span>{formatPrice(total_amount)} تومان</span>
                          </div>
                        </div>
          </section>

        </CardContent>
        <CardFooter className="bg-gray-50 dark:bg-gray-800/50 p-6 border-t dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                از خرید شما سپاسگزاریم! برای هرگونه سوال یا پیگیری، شماره سفارش خود ({order.order_number}) را به همراه داشته باشید.
            </p>
                      </CardFooter>
                    </Card>
    </div>
  );
};

export default OrderDetailPage;
