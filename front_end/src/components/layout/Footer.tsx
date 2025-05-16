import React from "react";
import Link from "next/link";
import { FOOTER_LINKS, APP_NAME } from "@/lib/constants";
import {
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  PhoneCall,
  Mail,
  MapPin,
} from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialIcons: Record<string, React.ReactNode> = {
    instagram: <Instagram className="h-5 w-5" />,
    twitter: <Twitter className="h-5 w-5" />,
    facebook: <Facebook className="h-5 w-5" />,
    linkedin: <Linkedin className="h-5 w-5" />,
  };

  const getSocialIcon = (label: string): React.ReactNode => {
    const key = label.toLowerCase();
    return socialIcons[key] || label;
  };

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <div>
            <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">
              دسته‌بندی‌ها
            </h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.categories.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center"
                  >
                    <span className="h-1.5 w-1.5 bg-gray-300 dark:bg-gray-700 rounded-full ml-2"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">
              درباره ما
            </h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.aboutUs.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center"
                  >
                    <span className="h-1.5 w-1.5 bg-gray-300 dark:bg-gray-700 rounded-full ml-2"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">
              خدمات مشتریان
            </h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.customerService.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center"
                  >
                    <span className="h-1.5 w-1.5 bg-gray-300 dark:bg-gray-700 rounded-full ml-2"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">
              تماس با ما
            </h3>
            <ul className="space-y-4">
              <li className="text-gray-600 dark:text-gray-400 flex items-start">
                <MapPin className="h-5 w-5 ml-2 text-primary mt-0.5 flex-shrink-0" />
                <span>تهران، خیابان ولیعصر، خیابان شقایق، پلاک ۵۲</span>
              </li>
              <li className="text-gray-600 dark:text-gray-400 flex items-center">
                <PhoneCall className="h-5 w-5 ml-2 text-primary flex-shrink-0" />
                <span>۰۲۱-۸۸۷۷۶۶۵۵</span>
              </li>
              <li className="text-gray-600 dark:text-gray-400 flex items-center">
                <Mail className="h-5 w-5 ml-2 text-primary flex-shrink-0" />
                <span>info@digistyle.com</span>
              </li>
            </ul>

            <h3 className="text-lg font-bold mb-4 mt-8 text-gray-900 dark:text-white">
              ما را دنبال کنید
            </h3>
            <div className="flex space-x-3 space-x-reverse">
              {FOOTER_LINKS.socialMedia.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-white transition-all duration-300"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                >
                  {getSocialIcon(link.label)}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 py-8 px-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                عضویت در خبرنامه
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                با عضویت در خبرنامه ما، از آخرین محصولات و تخفیف‌های ویژه مطلع
                شوید.
              </p>
            </div>
            <div>
              <form className="flex">
                <input
                  type="email"
                  placeholder="ایمیل خود را وارد کنید"
                  className="flex-grow px-4 py-3 rounded-r-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button className="px-5 py-3 rounded-l-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors">
                  عضویت
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {APP_NAME}
            </h2>
          </div>

          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © {currentYear} {APP_NAME}. تمامی حقوق محفوظ است.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
