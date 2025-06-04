import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Brand } from "@/types/brand";
import { Category } from "@/types/category";
import { Product } from "@/types/product";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  const formatter = new Intl.NumberFormat("fa-IR", {
    style: "decimal",
  });

  const priceInTomans = price;

  return formatter.format(priceInTomans) + " تومان";
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toEnglishNumber(num: string) {
  const charCodeZero = "۰".charCodeAt(0);
  return num.replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - charCodeZero));
}

export function toPersianNumber(num: number | string) {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/[0-9]/g, (c) => persianDigits[parseInt(c)]);
}

export function getDiscountPercentage(
  originalPrice: number,
  currentPrice: number
) {
  if (!originalPrice || originalPrice <= currentPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

export function isValidIranianMobile(mobile: string) {
  const mobileRegex = /^((\+|00)98|0)?9[0-9]{9}$/;
  return mobileRegex.test(mobile);
}

export function isValidIranianPostalCode(postalCode: string) {
  const postalCodeRegex = /^\d{10}$/;
  return postalCodeRegex.test(postalCode);
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
) {
  let timeout: NodeJS.Timeout;

  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}


export function getBrandName(brand_id: string, brands: Brand[]): string {
  const brand = brands.find(b => b.id === brand_id);
  return brand ? brand.name : '';
}

export function getCategoryName(category_ids: string[], categories: Category[]): string {
  if (!Array.isArray(category_ids) || category_ids.length === 0) return '';
  const cat = categories.find(c => c.id === category_ids[0]);
  return cat ? cat.name : '';
}


// Helper function to check if a product has a specific attribute
export const hasAttribute = (product: Product, attributeName: string): boolean => {
  return product.attributes?.some(
    attr => attr.name.toLowerCase() === attributeName.toLowerCase() && 
    (attr.value.toLowerCase() === 'true' || attr.value === '1')
  ) || false;
};

export function formatDate(dateString: string): string {
  if (!dateString) return 'تاریخ نامشخص';
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'تاریخ نامعتبر';
  }
}