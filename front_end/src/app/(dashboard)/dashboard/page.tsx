'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { motion } from 'framer-motion';
import { BadgeCheck, Package, MapPin, ShoppingCart, Calendar, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { cart } = useCartStore();
  const [activeTab, setActiveTab] = useState('all');
  const [showWelcome, setShowWelcome] = useState(true);

  // آمار کاربر
  const stats = {
    totalOrders: 5,
    pendingOrders: 1,
    completedOrders: 4,
    savedAddresses: user?.addresses?.length || 0,
    cartItems: cart.items.length,
  };

  // داده‌های سفارش‌ها
  const orders = [
    {
      id: 'DGS-10001',
      date: '۱۴۰۲/۰۸/۱۵',
      status: 'delivered',
      statusText: 'تحویل شده',
      amount: 2500000,
    },
    {
      id: 'DGS-10002',
      date: '۱۴۰۲/۰۹/۰۲',
      status: 'shipping',
      statusText: 'در حال ارسال',
      amount: 1800000,
    },
    {
      id: 'DGS-10003',
      date: '۱۴۰۲/۰۹/۱۰',
      status: 'processing',
      statusText: 'در حال پردازش',
      amount: 3200000,
    },
    {
      id: 'DGS-10004',
      date: '۱۴۰۲/۰۹/۲۵',
      status: 'delivered',
      statusText: 'تحویل شده',
      amount: 1450000,
    },
    {
      id: 'DGS-10005',
      date: '۱۴۰۲/۱۰/۰۵',
      status: 'delivered',
      statusText: 'تحویل شده',
      amount: 850000,
    },
  ];

  // فیلتر سفارش‌ها بر اساس تب فعال
  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => {
        if (activeTab === 'pending') return order.status === 'processing' || order.status === 'shipping';
        if (activeTab === 'delivered') return order.status === 'delivered';
        return true;
      });

  // بستن خوشامدگویی بعد از چند ثانیه
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  // انیمیشن‌های فریمر موشن
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  // گرفتن وضعیت استایل برای هر سفارش
  const getStatusStyle = (status:string) => {
    switch(status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'shipping':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'processing':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="container py-8 md:py-12">
      <motion.h1 
        className="text-2xl md:text-3xl font-bold mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        داشبورد شخصی
      </motion.h1>
      
      {showWelcome && (
        <motion.section 
          className="mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 shadow-sm"
            animate={{ 
              boxShadow: ['0 4px 12px rgba(79, 70, 229, 0.1)', '0 4px 20px rgba(79, 70, 229, 0.2)', '0 4px 12px rgba(79, 70, 229, 0.1)'],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2 text-indigo-900 dark:text-indigo-300">
                  سلام {user?.name || 'کاربر عزیز'}!
                </h2>
                <p className="text-indigo-700 dark:text-indigo-400">
                  به داشبورد شخصی خود خوش آمدید. از اینجا می‌توانید سفارش‌ها، آدرس‌ها و تنظیمات حساب خود را مدیریت کنید.
                </p>
                <motion.div 
                  className="flex gap-2 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button variant="outline" size="sm" className="rounded-xl">
                    مشاهده سفارش‌ها
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    خرید جدید
                  </Button>
                </motion.div>
              </div>
              <button 
                onClick={() => setShowWelcome(false)}
                className="text-indigo-400 hover:text-indigo-600 dark:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          </motion.div>
        </motion.section>
      )}
      
      <motion.section 
        className="mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h2 
          className="text-xl font-semibold mb-4 flex items-center" 
          variants={itemVariants}
        >
          <BadgeCheck className="w-5 h-5 text-indigo-500 ml-2" />
          آمار کلی
        </motion.h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden bg-gradient-to-br from-white to-indigo-50/50 dark:from-gray-900 dark:to-indigo-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Package className="w-5 h-5 text-indigo-500 ml-2" />
                  سفارش‌ها
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalOrders}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.pendingOrders} سفارش در انتظار ارسال
                  </p>
                  <div className="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <ChevronRight className="h-5 w-5 text-indigo-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-900 dark:to-purple-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <MapPin className="w-5 h-5 text-purple-500 ml-2" />
                  آدرس‌ها
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.savedAddresses}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground mt-1">
                    آدرس ذخیره شده
                  </p>
                  <div className="h-8 w-8 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <ChevronRight className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <ShoppingCart className="w-5 h-5 text-blue-500 ml-2" />
                  سبد خرید
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.cartItems}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground mt-1">
                    محصول در سبد خرید
                  </p>
                  <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <ChevronRight className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden bg-gradient-to-br from-white to-green-50/50 dark:from-gray-900 dark:to-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="w-5 h-5 text-green-500 ml-2" />
                  تحویل شده‌ها
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.completedOrders}</div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground mt-1">
                    سفارش تکمیل شده
                  </p>
                  <div className="h-8 w-8 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <ChevronRight className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.section>
      
      <motion.section className="mb-8" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants} className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Clock className="w-5 h-5 text-indigo-500 ml-2" />
            سفارش‌های اخیر
          </h2>
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 flex">
            <button 
              className={`px-3 py-1 text-sm rounded-lg transition-all ${
                activeTab === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => setActiveTab('all')}
            >
              همه
            </button>
            <button 
              className={`px-3 py-1 text-sm rounded-lg transition-all ${
                activeTab === 'pending' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => setActiveTab('pending')}
            >
              در انتظار
            </button>
            <button 
              className={`px-3 py-1 text-sm rounded-lg transition-all ${
                activeTab === 'delivered' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => setActiveTab('delivered')}
            >
              تحویل شده
            </button>
          </div>
        </motion.div>
        
        {filteredOrders.length > 0 ? (
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium">شماره سفارش</th>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium">تاریخ</th>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium">وضعیت</th>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium">مبلغ</th>
                      <th className="text-right p-4 text-gray-600 dark:text-gray-400 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, index) => (
                      <motion.tr 
                        key={order.id} 
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="p-4 font-medium">{order.id}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">{order.date}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(order.status)}`}>
                            {order.statusText}
                          </span>
                        </td>
                        <td className="p-4 font-bold">{formatPrice(order.amount)}</td>
                        <td className="p-4 text-left">
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <AlertCircle className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">سفارشی یافت نشد</h3>
                <p className="text-muted-foreground mb-6">هیچ سفارشی با این وضعیت وجود ندارد</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab('all')}
                >
                  نمایش همه سفارش‌ها
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.section>
      
      <motion.section 
        className="mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-lg overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-2">از تخفیف‌های ویژه بهره‌مند شوید!</h3>
                  <p className="text-indigo-100 mb-4">با تکمیل اطلاعات پروفایل خود، از تخفیف‌های اختصاصی استفاده کنید.</p>
                  <Button 
                    className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl"
                    size="sm"
                  >
                    تکمیل پروفایل
                  </Button>
                </div>
                <div className="hidden md:block">
                  <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-20">
                    <path d="M21.41 11.58L12.41 2.58C12.05 2.22 11.55 2 11 2H4C2.9 2 2 2.9 2 4V11C2 11.55 2.22 12.05 2.59 12.42L11.59 21.42C11.95 21.78 12.45 22 13 22C13.55 22 14.05 21.78 14.41 21.41L21.41 14.41C21.78 14.05 22 13.55 22 13C22 12.45 21.77 11.94 21.41 11.58ZM13 20.01L4 11V4H11V3.99L20 12.99L13 20.01Z" fill="currentColor"/>
                    <path d="M6.5 8C7.33 8 8 7.33 8 6.5C8 5.67 7.33 5 6.5 5C5.67 5 5 5.67 5 6.5C5 7.33 5.67 8 6.5 8Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>
    </div>
  );
}