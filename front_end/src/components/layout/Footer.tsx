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
  ArrowLeft,
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
    <footer className="bg-card border-t border-border/10 shadow-soft">
      <div className="voxcina-container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <div className="animate-slideUp" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-lg font-bold mb-6 text-primary border-r-4 border-primary pr-3">
              دسته‌بندی‌ها
            </h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.categories.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground hover:text-primary transition-all duration-200 flex items-center group"
                  >
                    <span className="h-1.5 w-1.5 bg-secondary rounded-full ml-2 group-hover:bg-primary transition-colors duration-200"></span>
                    <span className="relative">
                      {link.label}
                      <span className="absolute -bottom-0.5 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-slideUp" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-lg font-bold mb-6 text-primary border-r-4 border-primary pr-3">
              درباره ما
            </h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.aboutUs.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground hover:text-primary transition-all duration-200 flex items-center group"
                  >
                    <span className="h-1.5 w-1.5 bg-secondary rounded-full ml-2 group-hover:bg-primary transition-colors duration-200"></span>
                    <span className="relative">
                      {link.label}
                      <span className="absolute -bottom-0.5 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-slideUp" style={{ animationDelay: "0.3s" }}>
            <h3 className="text-lg font-bold mb-6 text-primary border-r-4 border-primary pr-3">
              خدمات مشتریان
            </h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.customerService.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground hover:text-primary transition-all duration-200 flex items-center group"
                  >
                    <span className="h-1.5 w-1.5 bg-secondary rounded-full ml-2 group-hover:bg-primary transition-colors duration-200"></span>
                    <span className="relative">
                      {link.label}
                      <span className="absolute -bottom-0.5 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-slideUp" style={{ animationDelay: "0.4s" }}>
            <h3 className="text-lg font-bold mb-6 text-primary border-r-4 border-primary pr-3">
              تماس با ما
            </h3>
            <ul className="space-y-4">
              <li className="text-foreground flex items-start group hover:text-primary transition-all duration-200">
                <MapPin className="h-5 w-5 ml-2 text-primary mt-0.5 flex-shrink-0 group-hover:animate-pulse-once" />
                <span>تهران، خیابان ولیعصر، خیابان شقایق، پلاک ۵۲</span>
              </li>
              <li className="text-foreground flex items-center group hover:text-primary transition-all duration-200">
                <PhoneCall className="h-5 w-5 ml-2 text-primary flex-shrink-0 group-hover:animate-pulse-once" />
                <span>۰۲۱-۸۸۷۷۶۶۵۵</span>
              </li>
              <li className="text-foreground flex items-center group hover:text-primary transition-all duration-200">
                <Mail className="h-5 w-5 ml-2 text-primary flex-shrink-0 group-hover:animate-pulse-once" />
                <span>info@voxcina.com</span>
              </li>
            </ul>

            <h3 className="text-lg font-bold mb-4 mt-8 text-primary border-r-4 border-primary pr-3">
              ما را دنبال کنید
            </h3>
            <div className="flex space-x-3 space-x-reverse">
              {FOOTER_LINKS.socialMedia.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-soft hover:shadow-medium"
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

        <div className="mt-12 py-8 px-6 bg-secondary/50 rounded-xl border border-border/10 shadow-soft animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold text-primary mb-2">
                عضویت در خبرنامه
              </h3>
              <p className="text-foreground">
                با عضویت در خبرنامه ما، از آخرین محصولات و تخفیف‌های ویژه مطلع
                شوید.
              </p>
            </div>
            <div>
              <form className="flex">
                <input
                  type="email"
                  placeholder="ایمیل خود را وارد کنید"
                  className="flex-grow px-4 py-3 rounded-r-lg border border-border/20 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                />
                <button className="voxcina-button-primary rounded-l-lg rounded-r-none flex items-center">
                  عضویت
                  <ArrowLeft className="mr-1 h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/10 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl font-bold text-primary hover:opacity-90 transition-opacity">
              {APP_NAME}
            </h2>
          </div>

          <p className="text-muted-foreground text-sm">
            © {currentYear} {APP_NAME}. تمامی حقوق محفوظ است.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;