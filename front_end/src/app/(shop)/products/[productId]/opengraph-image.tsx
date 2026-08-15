import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { serverFetch, CACHE_TIMES } from '@/lib/server-api';
import { Product } from '@/types/product';

// Image metadata
export const alt = 'محصول وکسینا';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface Props {
  params: { productId: string };
}

const FONTS_DIR = join(process.cwd(), 'public', 'fonts');

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

function loadFont(name: string, weight: FontWeight) {
  try {
    return { name: 'IranSansX', data: readFileSync(join(FONTS_DIR, name)), weight, style: 'normal' as const };
  } catch {
    return null;
  }
}

/**
 * Fetches a product image and returns it as a PNG data URI.
 *
 * The renderer behind ImageResponse (Satori/resvg) cannot decode WebP — it
 * fails with "Unsupported image type: image/webp" and then aborts the whole
 * response with "Image size cannot be determined". Every product image in this
 * catalogue is WebP, so passing the URL through directly made this route throw
 * for every product. Decoding to PNG here keeps the rendering inside a format
 * the generator supports.
 *
 * Downscaled to 600px because the image occupies half of a 1200px-wide card;
 * anything larger is bytes the renderer would discard anyway.
 *
 * Returns null on any failure so the card falls back to its placeholder block
 * rather than failing to render at all.
 */
async function loadProductImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { next: { revalidate: CACHE_TIMES.PRODUCT_DETAIL } });
    if (!response.ok) return null;

    const png = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Product-specific Open Graph Image
 * 
 * Generates a dynamic OG image with product image and price for social sharing.
 * Fetches product data server-side to include real product information.
 * 
 * SEO: Product OG images increase click-through from social
 */
export default async function Image({ params }: Props) {
  const { productId } = params;

  const fontRegular = loadFont('iransansx-regular.woff', 400);
  const fontBold = loadFont('iransansx-bold.woff', 700);
  const fonts = [fontRegular, fontBold].filter((f): f is NonNullable<typeof f> => f !== null);

  // Fetch product data
  const product = await serverFetch<Product>(`/api/products/${productId}`, {
    revalidate: CACHE_TIMES.PRODUCT_DETAIL,
    tags: ['product', `product-${productId}`],
  });

  // Get product image URL
  const productImage = product?.colorVariants?.[0]?.images?.[0] 
    || product?.mainImages?.[0] 
    || null;
  
  // Build absolute image URL for the product
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://voxcina.com';
  const absoluteImageUrl = productImage
    ? (productImage.startsWith('http') ? productImage : `${baseUrl}${productImage.startsWith('/') ? '' : '/'}${productImage}`)
    : null;

  // Decoded to PNG rather than handed to the renderer as a URL; see above.
  const imageUrl = absoluteImageUrl ? await loadProductImage(absoluteImageUrl) : null;

  // Format price with Persian locale
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price);
  };

  // Calculate discount percentage if applicable
  const hasDiscount = product?.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F0E6 100%)',
          fontFamily: fonts.length ? 'IranSansX' : 'system-ui, sans-serif',
        }}
      >
        {/* Left Side - Product Image */}
        <div
          style={{
            width: '50%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            position: 'relative',
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={product?.name || 'Product'}
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '300px',
                height: '300px',
                backgroundColor: '#E5E7EB',
                borderRadius: '20px',
                color: '#9CA3AF',
                fontSize: '24px',
              }}
            >
              تصویر محصول
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <div
              style={{
                position: 'absolute',
                top: '30px',
                left: '30px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                padding: '12px 24px',
                borderRadius: '30px',
                fontSize: '28px',
                fontWeight: 'bold',
                display: 'flex',
              }}
            >
              {discountPercent}% تخفیف
            </div>
          )}
        </div>

        {/* Right Side - Product Info */}
        <div
          style={{
            width: '50%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '50px',
            backgroundColor: '#1A3C69',
          }}
        >
          {/* Brand Logo */}
          <div
            style={{
              fontSize: '32px',
              color: '#F5F0E6',
              marginBottom: '20px',
              display: 'flex',
            }}
          >
            Voxcina | وکسینا
          </div>

          {/* Product Name */}
          <div
            style={{
              fontSize: '42px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              marginBottom: '30px',
              lineHeight: 1.3,
              display: 'flex',
              maxWidth: '500px',
            }}
          >
            {product?.name || 'محصول وکسینا'}
          </div>

          {/* Price Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {hasDiscount && (
              <div
                style={{
                  fontSize: '28px',
                  color: 'rgba(255,255,255,0.5)',
                  textDecoration: 'line-through',
                  display: 'flex',
                }}
              >
                {formatPrice(product.originalPrice)} تومان
              </div>
            )}
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#D4AF37',
                display: 'flex',
              }}
            >
              {product ? formatPrice(product.price) : '---'} تومان
            </div>
          </div>

          {/* Features */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginTop: '40px',
              flexWrap: 'wrap',
            }}
          >
            {['ارسال رایگان', 'ضمانت اصالت'].map((feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  padding: '10px 20px',
                  borderRadius: '20px',
                  color: '#F5F0E6',
                  fontSize: '18px',
                }}
              >
                <span>-</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    }
  );
}
