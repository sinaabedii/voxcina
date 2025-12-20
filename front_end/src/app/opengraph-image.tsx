import { ImageResponse } from 'next/og';

// Image metadata
export const runtime = 'edge';
export const alt = 'وکسینا - فروشگاه آنلاین پوشاک و مد';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

/**
 * Default Open Graph Image for Voxcina
 * 
 * Generates a dynamic OG image with site branding for social sharing.
 * This image is used when no page-specific OG image is available.
 * 
 * SEO: OG images improve social sharing appearance
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1A3C69 0%, #2D5A9E 50%, #1A3C69 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)',
            display: 'flex',
          }}
        />

        {/* Main Content Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            textAlign: 'center',
          }}
        >
          {/* Logo/Brand Name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                fontSize: '120px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                letterSpacing: '-2px',
                textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                display: 'flex',
              }}
            >
              Voxcina
            </div>
          </div>

          {/* Persian Brand Name */}
          <div
            style={{
              fontSize: '48px',
              color: '#F5F0E6',
              marginBottom: '20px',
              display: 'flex',
            }}
          >
            وکسینا
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '32px',
              color: 'rgba(245, 240, 230, 0.9)',
              maxWidth: '800px',
              lineHeight: 1.4,
              display: 'flex',
            }}
          >
            فروشگاه آنلاین پوشاک و مد
          </div>

          {/* Features */}
          <div
            style={{
              display: 'flex',
              gap: '40px',
              marginTop: '40px',
            }}
          >
            {['ارسال سریع', 'ضمانت اصالت', 'تخفیف ویژه'].map((feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  padding: '12px 24px',
                  borderRadius: '30px',
                  color: '#FFFFFF',
                  fontSize: '20px',
                }}
              >
                <span>✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: 'linear-gradient(90deg, #F5F0E6 0%, #D4AF37 50%, #F5F0E6 100%)',
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
