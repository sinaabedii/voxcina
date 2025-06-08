import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  productName?: string;
  brand?: string;
  category?: string;
  color?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  loading?: "eager" | "lazy";
}

/**
 * کامپوننت تصویر محصول با alt تگ های بهینه شده برای سئو
 */
export default function ProductImage({
  src,
  alt,
  width = 500,
  height = 500,
  fill = false,
  className,
  productName,
  brand,
  category,
  color,
  style,
  priority = false,
  loading = "lazy",
}: ProductImageProps) {
  // ساخت alt متن بهینه برای سئو اگر alt ارائه نشده باشد
  const optimizedAlt = alt || generateOptimizedAlt(productName, brand, category, color);

  return fill ? (
    <div className={cn("relative", className)}>
      <Image
        src={src}
        alt={optimizedAlt}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        priority={priority}
        loading={loading}
        style={style}
      />
    </div>
  ) : (
    <Image
      src={src}
      alt={optimizedAlt}
      width={width}
      height={height}
      className={className}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      priority={priority}
      loading={loading}
      style={style}
    />
  );
}

/**
 * تولید متن alt بهینه شده برای سئو
 */
function generateOptimizedAlt(
  productName?: string,
  brand?: string,
  category?: string,
  color?: string
): string {
  const parts = [];

  if (productName) parts.push(productName);
  if (brand) parts.push(`برند ${brand}`);
  if (category) parts.push(`دسته ${category}`);
  if (color) parts.push(`رنگ ${color}`);

  // اگر هیچ اطلاعاتی در دسترس نباشد
  if (parts.length === 0) return "تصویر محصول وکسینا";

  return parts.join(" | ");
} 