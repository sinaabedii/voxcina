"use client";

import React from "react";
import Link from "next/link";
import { FOOTER_LINKS, APP_NAME } from "@/lib/constants";
import { useNavigation } from "@/context/navigation";
import Image from "next/image";
import {
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  PhoneCall,
  Mail,
  MapPin,
  Send,
  Youtube,
} from "lucide-react";

// Reusable footer section component
interface FooterLink {
  label: string;
  href: string;
}

interface FooterSectionProps {
  title: string;
  items: FooterLink[];
  animationDelay: string;
}

const FooterSection: React.FC<FooterSectionProps> = ({ title, items, animationDelay }) => (
  <div className="animate-slideUp" style={{ animationDelay }}>
    <h3 className="text-sm sm:text-base md:text-lg font-bold mb-3 sm:mb-4 text-primary border-r-4 border-primary pr-2 sm:pr-3">
      {title}
    </h3>
    <ul className="space-y-1.5 sm:space-y-2">
      {items.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="text-xs sm:text-sm md:text-base text-foreground hover:text-primary transition-all duration-200 flex items-center group"
          >
            <span className="h-1.5 w-1.5 bg-secondary rounded-full ml-2 group-hover:bg-primary transition-colors duration-200 flex-shrink-0"></span>
            <span className="relative">
              {link.label}
              <span className="absolute -bottom-0.5 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const Footer = () => {
  // Consume header nav items from context
  const navItems = useNavigation();
  // Exclude Home
  const footerCategories = navItems.filter((item) => item.href !== "/");
  const currentYear = new Date().getFullYear();

  const socialIcons: Record<string, React.ReactNode> = {
    اینستاگرام: <Instagram className="h-5 w-5" />,
    instagram: <Instagram className="h-5 w-5" />,
    تلگرام: <Send className="h-5 w-5" />,
    telegram: <Send className="h-5 w-5" />,
    توییتر: <Twitter className="h-5 w-5" />,
    twitter: <Twitter className="h-5 w-5" />,
    یوتیوب: <Youtube className="h-5 w-5" />,
    youtube: <Youtube className="h-5 w-5" />,
    فیسبوک: <Facebook className="h-5 w-5" />,
    facebook: <Facebook className="h-5 w-5" />,
    لینکدین: <Linkedin className="h-5 w-5" />,
    linkedin: <Linkedin className="h-5 w-5" />,
  };

  const getSocialIcon = (label: string): React.ReactNode => {
    const key = label.toLowerCase();
    return (
      socialIcons[key] ||
      socialIcons[label] || <Instagram className="h-5 w-5" />
    );
  };

  return (
    <div className="bg-transparent z-10 w-full px-4 md:px-6 pb-10">
      <footer className="w-full bg-white max-w-7xl mx-auto border border-border/10  rounded-2xl md:rounded-3xl">
        <div className="py-6 sm:py-8 md:py-8 px-4 md:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            <FooterSection
              title="دسته‌بندی‌ها"
              items={footerCategories.map((item) => ({ label: item.label, href: item.href }))}
              animationDelay="0.1s"
            />
            <FooterSection title="درباره ما" items={FOOTER_LINKS.aboutUs} animationDelay="0.2s" />
            <FooterSection
              title="خدمات مشتریان"
              items={FOOTER_LINKS.customerService}
              animationDelay="0.3s"
            />
            <div
              className="animate-slideUp col-span-1 sm:col-span-2 lg:col-span-1"
              style={{ animationDelay: "0.4s" }}
            >
              <h3 className="text-sm sm:text-base md:text-lg font-bold mb-3 sm:mb-4 text-primary border-r-4 border-primary pr-2 sm:pr-3">
                تماس با ما
              </h3>
              <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <li className="text-xs sm:text-sm md:text-base text-foreground flex items-start group hover:text-primary transition-all duration-200">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 ml-1.5 sm:ml-2 text-primary mt-0.5 flex-shrink-0 group-hover:animate-pulse-once" />
                  <span className="leading-relaxed">
                    پاسداران بوستان پنجم کوی گلشن پلاک ۱۴{" "}
                  </span>
                </li>
                <li className="text-xs sm:text-sm md:text-base text-foreground flex items-center group hover:text-primary transition-all duration-200">
                  <PhoneCall className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 ml-1.5 sm:ml-2 text-primary flex-shrink-0 group-hover:animate-pulse-once" />
                  <span>021-22325653</span>
                </li>
                <li className="text-xs sm:text-sm md:text-base text-foreground flex items-center group hover:text-primary transition-all duration-200">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 ml-1.5 sm:ml-2 text-primary flex-shrink-0 group-hover:animate-pulse-once" />
                  <span>info@voxcina.com</span>
                </li>
              </ul>

              <h3 className="text-sm sm:text-base md:text-lg font-bold mb-2 sm:mb-3 text-primary border-r-3 border-primary pr-2 sm:pr-3">
                ما را دنبال کنید
              </h3>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {FOOTER_LINKS.socialMedia.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-soft hover:shadow-medium hover:scale-105 transform"
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
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-4 border-t border-border/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 order-2 sm:order-1">
              <div className="flex flex-wrap gap-3 justify-center">
                <div className="bg-white shadow-soft rounded-md p-1 h-16 w-16 flex items-center justify-center">
                  <a 
                    referrerPolicy='origin' 
                    target='_blank' 
                    href='https://trustseal.enamad.ir/?id=625947&Code=6W6KblfeR0Ztn1cpWTxurXJRXOS6O2aa'
                    className="block"
                  >
                    <img 
                      referrerPolicy='origin' 
                      src='https://trustseal.enamad.ir/logo.aspx?id=625947&Code=6W6KblfeR0Ztn1cpWTxurXJRXOS6O2aa' 
                      alt='نماد اعتماد الکترونیکی' 
                      style={{cursor:'pointer'}} 
                      data-code='6W6KblfeR0Ztn1cpWTxurXJRXOS6O2aa'
                      className="object-contain w-14 h-14"
                    />
                  </a>
                </div>
                
              </div>
            </div>
            <p className="text-muted-foreground mx-auto text-xs sm:text-sm text-center sm:text-left order-1 sm:order-2">
              © {currentYear} {APP_NAME}. تمامی حقوق محفوظ است.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
