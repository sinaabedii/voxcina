'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { APP_NAME } from '@/lib/constants';
import Sidebar from '@/components/layout/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ShoppingCart, User, Search, Menu, X, Sun, Moon, LogOut } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
                  (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.push('/sign-in');
      }
      setIsChecking(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#profile-menu') && !target.closest('#profile-button')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsMobileSidebarOpen(false);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block relative w-16 h-16 mb-4">
            <div className="absolute top-0 right-0 w-full h-full border-4 border-indigo-200 dark:border-indigo-900 rounded-full animate-ping"></div>
            <div className="absolute top-0 right-0 w-full h-full border-4 border-t-indigo-500 dark:border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">در حال بررسی وضعیت ورود...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; 
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-3 px-4 md:px-6 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button 
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              aria-label={isMobileSidebarOpen ? "بستن منو" : "باز کردن منو"}
            >
              {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm ml-2">
                {APP_NAME.charAt(0)}
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:inline-block">
                {APP_NAME}
              </span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg w-80 px-3 py-2">
            <Search size={18} className="text-gray-500 dark:text-gray-400 ml-2" />
            <input 
              type="text" 
              placeholder="جستجو در فروشگاه..." 
              className="bg-transparent border-none focus:outline-none text-sm w-full text-gray-800 dark:text-gray-200" 
            />
          </div>
          
          <div className="flex items-center gap-1 sm:gap-3">
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative">
              <Bell size={18} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <Link href="/cart" className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative">
              <ShoppingCart size={18} />
              <span className="absolute top-0 right-0 w-4 h-4 bg-indigo-500 rounded-full text-white text-[10px] flex items-center justify-center">
                3
              </span>
            </Link>
            
            <button 
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={toggleDarkMode}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div className="relative">
              <button 
                id="profile-button"
                className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 py-1 px-2 rounded-lg transition-colors"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="relative w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-indigo-500">{user?.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline-block">
                  {user?.name || 'کاربر'}
                </span>
              </button>
              
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div 
                    id="profile-menu"
                    className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                    <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      داشبورد
                    </Link>
                    <Link href="/dashboard/settings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      تنظیمات حساب
                    </Link>
                    <button 
                      className="w-full text-right px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => logout && logout()}
                    >
                      خروج از حساب
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 relative">
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              <motion.div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              
              <motion.div
                className="fixed inset-y-0 right-0 w-64 bg-white dark:bg-gray-800 z-50 md:hidden"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white">{APP_NAME}</h2>
                  <button 
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setIsMobileSidebarOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <Sidebar />
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        <div className="hidden md:block w-64 h-full sticky top-16 border-l border-gray-200 dark:border-gray-700 py-6 bg-white dark:bg-gray-800">
          <Sidebar />
        </div>
        
        <motion.main 
          className="flex-grow p-4 md:p-6 lg:p-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="container mx-auto">
            {children}
          </div>
        </motion.main>
      </div>
      
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-2 px-4 flex justify-around items-center z-30">
        <Link href="/dashboard" className="flex flex-col items-center">
          <User size={18} className="text-gray-500 dark:text-gray-400" />
          <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">داشبورد</span>
        </Link>
        <Link href="/products" className="flex flex-col items-center">
          <Search size={18} className="text-gray-500 dark:text-gray-400" />
          <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">جستجو</span>
        </Link>
        <Link href="/cart" className="flex flex-col items-center">
          <ShoppingCart size={18} className="text-gray-500 dark:text-gray-400" />
          <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">سبد خرید</span>
        </Link>
        <button className="flex flex-col items-center" onClick={() => logout && logout()}>
          <LogOut size={18} className="text-gray-500 dark:text-gray-400" />
          <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">خروج</span>
        </button>
      </div>
    </div>
  );
}