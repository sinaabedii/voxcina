import { User, Package, MapPin, Heart, Ticket, Settings } from "lucide-react";
import type { ReactNode } from "react";

export interface DashboardNavItem {
  name: string;
  href: string;
  icon: ReactNode;
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { name: "داشبورد", href: "/dashboard", icon: <User className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { name: "سفارش‌های من", href: "/dashboard/orders", icon: <Package className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { name: "آدرس‌های من", href: "/dashboard/addresses", icon: <MapPin className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { name: "علاقه‌مندی‌ها", href: "/dashboard/favorites", icon: <Heart className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { name: "تخفیف‌های من", href: "/dashboard/discounts", icon: <Ticket className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { name: "تنظیمات حساب", href: "/dashboard/settings", icon: <Settings className="w-4 h-4 sm:w-5 sm:h-5" /> },
];
