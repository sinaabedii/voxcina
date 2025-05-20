'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Filter, Search, FileText, TruckIcon, Clock, AlertCircle, Calendar, Download, ShoppingBag } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const allOrders = [
    { 
      id: 'DGS-10001', 
      date: '۱۴۰۲/۰۸/۱۵', 
      status: 'delivered', 
      statusText: 'تحویل شده', 
      amount: '۲,۵۰۰,۰۰۰',
      products: 3,
      trackingCode: 'TRKP-87654321'
    },
    { 
      id: 'DGS-10002', 
      date: '۱۴۰۲/۰۹/۰۲', 
      status: 'shipping', 
      statusText: 'در حال ارسال', 
      amount: '۱,۸۰۰,۰۰۰',
      products: 2,
      trackingCode: 'TRKP-76543210'
    },
    { 
      id: 'DGS-10003', 
      date: '۱۴۰۲/۰۹/۲۰', 
      status: 'pending', 
      statusText: 'در انتظار پرداخت', 
      amount: '۳,۲۰۰,۰۰۰',
      products: 4,
      trackingCode: null
    },
    { 
      id: 'DGS-10004', 
      date: '۱۴۰۲/۱۰/۰۵', 
      status: 'delivered', 
      statusText: 'تحویل شده', 
      amount: '۴,۱۰۰,۰۰۰',
      products: 5,
      trackingCode: 'TRKP-65432109'
    },
    { 
      id: 'DGS-10005', 
      date: '۱۴۰۲/۱۰/۱۸', 
      status: 'cancelled', 
      statusText: 'لغو شده', 
      amount: '۱,۳۰۰,۰۰۰',
      products: 1,
      trackingCode: null
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    
    return () => clearTimeout(timer);
  }, []);

  const filteredOrders = allOrders
    .filter(order => {
      if (activeTab === 'all') return true;
      if (activeTab === 'delivered') return order.status === 'delivered';
      if (activeTab === 'shipping') return order.status === 'shipping';
      if (activeTab === 'pending') return order.status === 'pending';
      if (activeTab === 'cancelled') return order.status === 'cancelled';
      return true;
    })
    .filter(order => {
      if (!searchQuery) return true;
      return (
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.statusText.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'delivered':
        return 'bg-green-100 text-voxcina-blue dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30';
      case 'shipping':
        return 'bg-voxcina-blue/10 text-voxcina-blue dark:bg-voxcina-blue/20 dark:text-secondary-300 border border-voxcina-blue/20 dark:border-voxcina-blue/30';
      case 'pending':
        return 'bg-amber-100 text-voxcina-blue dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30';
      case 'cancelled':
        return 'bg-red-100 text-voxcina-blue dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/30';
      default:
        return 'bg-secondary-100 text-voxcina-blue dark:bg-secondary-800/20 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-800/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'delivered':
        return <Package className="w-4 h-4 ml-1" />;
      case 'shipping':
        return <TruckIcon className="w-4 h-4 ml-1" />;
      case 'pending':
        return <Clock className="w-4 h-4 ml-1" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 ml-1" />;
      default:
        return null;
    }
  };

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

  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8 transition-all duration-500 ease-in-out">
      <motion.div 
        className="flex flex-col md:flex-row md:items-center md:justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-0 text-voxcina-blue dark:text-secondary-200 relative">
          <span className="relative z-10">سفارش‌های من</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی سفارش..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 h-10 pl-10 pr-4 rounded-xl border border-secondary-200 dark:border-voxcina-darkBlue/30 bg-white dark:bg-voxcina-blue/10 focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 text-voxcina-blue dark:text-secondary-200 placeholder-voxcina-blue/50 dark:placeholder-secondary-400 shadow-inner-soft"
            />
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-voxcina-blue/60 dark:text-secondary-300" />
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-secondary-200 hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
          >
            <Filter className="w-4 h-4 ml-2" />
            فیلتر پیشرفته
          </Button>
        </div>
      </motion.div>
      
      <motion.div 
        className="mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-secondary-100 dark:scrollbar-thumb-voxcina-blue/30 dark:scrollbar-track-voxcina-darkBlue/20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="inline-flex bg-secondary-100 dark:bg-voxcina-darkBlue/20 rounded-xl p-1 min-w-full sm:min-w-0 shadow-inner-soft backdrop-blur-sm">
          <motion.button 
            className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
              activeTab === 'all' ? 'bg-white dark:bg-voxcina-blue/20 shadow-soft text-voxcina-blue dark:text-secondary-200' : 'text-voxcina-blue/70 dark:text-secondary-300 hover:bg-white/50 dark:hover:bg-voxcina-blue/10'
            }`}
            onClick={() => setActiveTab('all')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            همه
          </motion.button>
          <motion.button 
            className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
              activeTab === 'pending' ? 'bg-white dark:bg-voxcina-blue/20 shadow-soft text-voxcina-blue dark:text-secondary-200' : 'text-voxcina-blue/70 dark:text-secondary-300 hover:bg-white/50 dark:hover:bg-voxcina-blue/10'
            }`}
            onClick={() => setActiveTab('pending')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            در انتظار
          </motion.button>
          <motion.button 
            className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
              activeTab === 'shipping' ? 'bg-white dark:bg-voxcina-blue/20 shadow-soft text-voxcina-blue dark:text-secondary-200' : 'text-voxcina-blue/70 dark:text-secondary-300 hover:bg-white/50 dark:hover:bg-voxcina-blue/10'
            }`}
            onClick={() => setActiveTab('shipping')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            در حال ارسال
          </motion.button>
          <motion.button 
            className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
              activeTab === 'delivered' ? 'bg-white dark:bg-voxcina-blue/20 shadow-soft text-voxcina-blue dark:text-secondary-200' : 'text-voxcina-blue/70 dark:text-secondary-300 hover:bg-white/50 dark:hover:bg-voxcina-blue/10'
            }`}
            onClick={() => setActiveTab('delivered')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            تحویل شده
          </motion.button>
          <motion.button 
            className={`px-4 py-2 text-sm rounded-lg transition-all min-w-20 ${
              activeTab === 'cancelled' ? 'bg-white dark:bg-voxcina-blue/20 shadow-soft text-voxcina-blue dark:text-secondary-200' : 'text-voxcina-blue/70 dark:text-secondary-300 hover:bg-white/50 dark:hover:bg-voxcina-blue/10'
            }`}
            onClick={() => setActiveTab('cancelled')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            لغو شده
          </motion.button>
        </div>
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.div 
          key={`orders-${isLoading}-${filteredOrders.length}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {isLoading ? (
            <motion.div variants={itemVariants}>
              <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                <CardContent className="p-8 flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 mb-4">
                      <div className="absolute top-0 right-0 w-full h-full border-4 border-secondary-200 dark:border-voxcina-darkBlue/30 rounded-full animate-pulse-soft"></div>
                      <div className="absolute top-0 right-0 w-full h-full border-4 border-t-voxcina-blue dark:border-t-secondary-200 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                      <ShoppingBag className="absolute inset-0 m-auto w-6 h-6 text-voxcina-blue/40 dark:text-secondary-200/40" />
                    </div>
                    <p className="text-voxcina-blue/70 dark:text-secondary-200/70 font-medium">
                      در حال بارگذاری سفارش‌ها...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : filteredOrders.length > 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-voxcina-blue/20 scrollbar-track-secondary-100 dark:scrollbar-thumb-voxcina-blue/30 dark:scrollbar-track-voxcina-darkBlue/20">
                  <table className="w-full">
                    <thead className="bg-secondary-100 dark:bg-voxcina-darkBlue/30">
                      <tr>
                        <th className="text-right p-4 text-voxcina-blue/80 dark:text-secondary-300 font-medium">شماره سفارش</th>
                        <th className="text-right p-4 text-voxcina-blue/80 dark:text-secondary-300 font-medium">تاریخ</th>
                        <th className="text-right p-4 text-voxcina-blue/80 dark:text-secondary-300 font-medium">وضعیت</th>
                        <th className="text-right p-4 text-voxcina-blue/80 dark:text-secondary-300 font-medium">تعداد</th>
                        <th className="text-right p-4 text-voxcina-blue/80 dark:text-secondary-300 font-medium">مبلغ</th>
                        <th className="text-right p-4 text-voxcina-blue/80 dark:text-secondary-300 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order, index) => (
                        <motion.tr 
                          key={order.id} 
                          className="border-b border-secondary-100 dark:border-voxcina-darkBlue/20 hover:bg-secondary-50 dark:hover:bg-voxcina-blue/5 transition-colors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ backgroundColor: 'rgba(244, 241, 236, 0.5)' }}
                        >
                          <td className="p-4 font-medium text-voxcina-blue dark:text-secondary-200">{order.id}</td>
                          <td className="p-4 text-voxcina-blue/70 dark:text-secondary-300 flex items-center">
                            <div className="w-6 h-6 bg-secondary-100 dark:bg-voxcina-blue/20 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-voxcina-blue/70 dark:text-secondary-300" />
                            </div>
                            {order.date}
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1.5 rounded-full text-xs flex items-center inline-flex ${getStatusStyle(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {order.statusText}
                            </span>
                          </td>
                          <td className="p-4 text-voxcina-blue/70 dark:text-secondary-300">
                            <span className="bg-secondary-100 dark:bg-voxcina-blue/20 px-2 py-1 rounded-lg">
                              {order.products} محصول
                            </span>
                          </td>
                          <td className="p-4 font-bold text-voxcina-blue dark:text-secondary-200">{order.amount} تومان</td>
                          <td className="p-4 text-left">
                            <div className="flex gap-2 justify-end">
                              {order.trackingCode && (
                                <motion.button 
                                  className="p-2 hover:bg-secondary-100 dark:hover:bg-voxcina-blue/20 rounded-full transition-colors text-voxcina-blue dark:text-secondary-300 group relative"
                                  title="کد رهگیری"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <TruckIcon className="h-5 w-5" />
                                  <span className="absolute bottom-full mb-2 right-1/2 transform translate-x-1/2 bg-voxcina-blue dark:bg-secondary-200 text-white dark:text-voxcina-blue text-xs rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-soft z-20">
                                    {order.trackingCode}
                                  </span>
                                </motion.button>
                              )}
                              
                              <motion.button 
                                className="p-2 hover:bg-secondary-100 dark:hover:bg-voxcina-blue/20 rounded-full transition-colors text-voxcina-blue dark:text-secondary-300"
                                title="فاکتور"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Download className="h-5 w-5" />
                              </motion.button>
                              
                              <motion.button 
                                className="p-2 hover:bg-secondary-100 dark:hover:bg-voxcina-blue/20 rounded-full transition-colors text-voxcina-blue dark:text-secondary-300"
                                title="جزئیات"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <FileText className="h-5 w-5" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-secondary-100 dark:bg-voxcina-darkBlue/30 p-4 text-center text-sm text-voxcina-blue/70 dark:text-secondary-300">
                  نمایش <span className="font-bold text-voxcina-blue dark:text-secondary-200">{filteredOrders.length}</span> سفارش از <span className="font-bold text-voxcina-blue dark:text-secondary-200">{allOrders.length}</span> سفارش
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants}>
              <Card className="border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft rounded-2xl overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-secondary-100 to-secondary-200 dark:from-voxcina-darkBlue/20 dark:to-voxcina-blue/20 mb-6 shadow-soft">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        repeat: Infinity, 
                        repeatType: "reverse", 
                        duration: 2
                      }}
                    >
                      <AlertCircle className="h-10 w-10 text-voxcina-blue/60 dark:text-secondary-300" />
                    </motion.div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-voxcina-blue dark:text-secondary-200">
                    سفارشی یافت نشد
                  </h3>
                  <p className="text-voxcina-blue/70 dark:text-secondary-300 mb-8 max-w-md mx-auto">
                    {searchQuery ? 'هیچ سفارشی با این مشخصات پیدا نشد' : 'هیچ سفارشی با این وضعیت وجود ندارد'}
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {searchQuery && (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSearchQuery('')}
                          className="rounded-xl border-secondary-200 text-voxcina-blue dark:border-voxcina-darkBlue/30 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-voxcina-darkBlue/20"
                        >
                          پاک کردن جستجو
                        </Button>
                      </motion.div>
                    )}
                    {activeTab !== 'all' && (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          variant="primary" 
                          size="sm"
                          className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue text-white shadow-soft hover:shadow-medium transition-all duration-300"
                          onClick={() => setActiveTab('all')}
                        >
                          نمایش همه سفارش‌ها
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
      <motion.div 
        className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="h-full border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft hover:shadow-medium transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardHeader className="bg-gradient-to-r from-secondary-100 to-secondary-200/70 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 pb-3">
              <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 flex items-center">
                <span className="relative">
                  <span className="absolute -right-2 -top-2 w-8 h-8 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-10"></span>
                  <Package className="w-5 h-5 ml-2" />
                </span>
                راهنمای پیگیری سفارش
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mt-0.5 ml-2 flex-shrink-0 border border-amber-200 dark:border-amber-800/30">
                    <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                  </div>
                  <span className="text-voxcina-blue/80 dark:text-secondary-300"><strong className="text-voxcina-blue dark:text-amber-400">در انتظار پرداخت:</strong> سفارش شما ثبت شده و منتظر پرداخت است.</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 rounded-full bg-voxcina-blue/10 dark:bg-voxcina-blue/20 flex items-center justify-center mt-0.5 ml-2 flex-shrink-0 border border-voxcina-blue/20 dark:border-voxcina-blue/30">
                    <span className="w-2 h-2 rounded-full bg-voxcina-blue dark:bg-voxcina-blue/60"></span>
                  </div>
                  <span className="text-voxcina-blue/80 dark:text-secondary-300"><strong className="text-voxcina-blue dark:text-secondary-200">در حال ارسال:</strong> سفارش شما آماده و در مسیر ارسال است.</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mt-0.5 ml-2 flex-shrink-0 border border-green-200 dark:border-green-800/30">
                    <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400"></span>
                  </div>
                  <span className="text-voxcina-blue/80 dark:text-secondary-300"><strong className="text-voxcina-blue dark:text-green-400">تحویل شده:</strong> سفارش شما با موفقیت تحویل داده شده است.</span>
                </li>
                <li className="flex items-start">
                  <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mt-0.5 ml-2 flex-shrink-0 border border-red-200 dark:border-red-800/30">
                    <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400"></span>
                  </div>
                  <span className="text-voxcina-blue/80 dark:text-secondary-300"><strong className="text-voxcina-blue dark:text-red-400">لغو شده:</strong> سفارش شما به دلایلی لغو شده است.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="h-full border border-secondary-200 dark:border-voxcina-darkBlue/30 shadow-soft hover:shadow-medium transition-all overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardHeader className="bg-gradient-to-r from-secondary-100 to-secondary-200/70 dark:from-voxcina-blue/15 dark:to-voxcina-blue/5 pb-3">
              <CardTitle className="text-lg font-bold text-voxcina-blue dark:text-secondary-200 flex items-center">
                <span className="relative">
                  <span className="absolute -right-2 -top-2 w-8 h-8 bg-secondary-200 dark:bg-voxcina-blue/20 rounded-full -z-10"></span>
                  <TruckIcon className="w-5 h-5 ml-2" />
                </span>
                اطلاعات ارسال
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-sm mb-5 text-voxcina-blue/70 dark:text-secondary-300">برای پیگیری وضعیت ارسال سفارش خود، می‌توانید از کد رهگیری پستی استفاده نمایید.</p>
              <div className="flex items-center bg-gradient-to-r from-secondary-100 to-secondary-200/70 dark:from-voxcina-blue/10 dark:to-voxcina-blue/5 p-4 rounded-xl shadow-inner-soft">
                <div className="bg-white dark:bg-voxcina-blue/20 p-3 rounded-xl ml-4 shadow-soft">
                  <TruckIcon className="w-6 h-6 text-voxcina-blue dark:text-secondary-300" />
                </div>
                <div>
                  <h4 className="font-medium text-voxcina-blue dark:text-secondary-200">پیگیری مرسولات پستی</h4>
                  <p className="text-xs text-voxcina-blue/70 dark:text-secondary-300 mt-1">کد رهگیری را در قسمت جزئیات سفارش می‌توانید مشاهده کنید</p>
                </div>
              </div>
              
              <motion.div 
                className="mt-5 flex justify-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-secondary-200 hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
                >
                  <TruckIcon className="w-4 h-4 ml-2" />
                  پیگیری سفارش
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}