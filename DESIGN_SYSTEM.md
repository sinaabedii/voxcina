# Voxcina Design System - Quick Reference

## 🎨 Core Design Tokens
- **Primary**: `#1A3C69` (Deep Blue) | **Secondary**: `#F4F1EC` (Warm Cream)
- **Font**: IranSansX (300, 400, 700 weights) - RTL Persian
- **Container**: `max-w-7xl`, centered, `px-4 sm:px-6 lg:px-8`
- **Border Radius**: `rounded-xl` (16px) for cards/buttons, `rounded-lg` (8px) for images

## 📱 Layout System
- **Grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` with `gap-4 sm:gap-6`
- **Page Structure**: Header → Hero/Content Sections → Footer
- **Section Padding**: `py-8 sm:py-12 md:py-16`
- **Card**: `bg-card rounded-xl border border-border/10 shadow-soft hover:shadow-medium`

## 🎯 Component Styles
- **Button**: `h-11 px-5 py-2.5 rounded-xl shadow-soft transition-all duration-300`
- **Input**: `h-12 px-4 rounded-xl border-2 focus:border-primary`
- **Product Card**: `aspect-square` image, `line-clamp-2` title, `text-primary` price

## ✨ Animations
- **Fade**: `animate-fadeIn` (0.5s ease-out)
- **Slide**: `animate-slideUp`, `animate-slideInRight`
- **Hover**: `hover-lift` (-translate-y-1), `hover-scale` (scale-105)
- **Duration**: 0.3s-0.5s for transitions

## 🌍 RTL & Responsive
- **RTL**: `dir="rtl"`, use `mr-*`/`right-0` instead of `ml-*`/`left-0`
- **Breakpoints**: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- **Mobile-first**: Default mobile, override with `sm:`, `md:`, etc.

## 🌙 Dark Mode
- **Class-based**: `darkMode: ["class"]` in Tailwind config
- **Colors**: CSS variables switch between light/dark themes
- **Background**: Light mode white → Dark mode `#0A1B3C`
- **Text**: Light mode `#1A3C69` → Dark mode white

## ♿ Accessibility
- WCAG AA+ compliant color contrast
- `focus-visible:ring-2 focus-visible:ring-primary/50`
- Semantic HTML, ARIA labels, `sr-only` for screen readers

## 📁 File Structure
- **UI Components**: `src/components/ui/` (Button, Card, Input, etc.)
- **Layout**: `src/components/layout/` (Header, Footer, etc.)
- **Styles**: `src/app/globals.css` (custom utilities)
- **Config**: `tailwind.config.js` (design tokens)

## ✅ Best Practices
1. Use existing UI components from `src/components/ui/`
2. Use Tailwind classes + CSS variables (`--primary`, `--secondary`)
3. Use `cn()` from `@/lib/utils` for class merging
4. Use `next/image` for optimized images
5. Test RTL layout and mobile responsiveness
