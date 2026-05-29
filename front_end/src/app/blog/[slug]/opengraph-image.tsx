import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { serverFetch, CACHE_TIMES } from '@/lib/server-api';
import { BlogPost } from '@/types/blog';

// Image metadata
export const alt = 'مقاله وکسینا';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface Props {
  params: { slug: string };
}

const FONTS_DIR = join(process.cwd(), 'public', 'fonts');

function loadFont(name: string, weight: number) {
  try {
    return { name: 'IranSansX', data: readFileSync(join(FONTS_DIR, name)), weight, style: 'normal' as const };
  } catch {
    return null;
  }
}

/**
 * Blog Post Open Graph Image
 * 
 * Generates a dynamic OG image with blog post title and featured image.
 * Fetches blog post data server-side to include real content.
 * 
 * SEO: Blog OG images improve social engagement
 */
export default async function Image({ params }: Props) {
  const { slug } = params;

  const fontRegular = loadFont('iransansx-regular.woff', 400);
  const fontBold = loadFont('iransansx-bold.woff', 700);
  const fonts = [fontRegular, fontBold].filter((f): f is NonNullable<typeof f> => f !== null);

  // Fetch blog post data
  const post = await serverFetch<BlogPost>(`/api/blog-posts/${slug}`, {
    revalidate: CACHE_TIMES.BLOG_POST,
    tags: ['blog', `blog-${slug}`],
  });

  // Build absolute image URL for the cover image
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://voxcina.com';
  const coverImage = post?.coverImage;
  const imageUrl = coverImage 
    ? (coverImage.startsWith('http') ? coverImage : `${baseUrl}${coverImage.startsWith('/') ? '' : '/'}${coverImage}`)
    : null;

  // Format date in Persian
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch {
      return '';
    }
  };

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          position: 'relative',
          fontFamily: fonts.length ? 'IranSansX' : 'system-ui, sans-serif',
        }}
      >
        {/* Background Image with Overlay */}
        {imageUrl ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={post?.title || 'Blog Post'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, #1A3C69 0%, #2D5A9E 100%)',
              display: 'flex',
            }}
          />
        )}

        {/* Dark Overlay for Text Readability */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '60px',
          }}
        >
          {/* Category Badge */}
          {post?.category && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#D4AF37',
                  color: '#1A3C69',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  display: 'flex',
                }}
              >
                {post.category}
              </div>
            </div>
          )}

          {/* Title */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              lineHeight: 1.3,
              marginBottom: '24px',
              maxWidth: '900px',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
              display: 'flex',
            }}
          >
            {post?.title || 'مقاله وکسینا'}
          </div>

          {/* Meta Info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '30px',
            }}
          >
            {/* Author */}
            {post?.author?.name && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '22px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#D4AF37',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1A3C69',
                    fontWeight: 'bold',
                    fontSize: '18px',
                  }}
                >
                  {post.author.name.charAt(0)}
                </div>
                <span>{post.author.name}</span>
              </div>
            )}

            {/* Date */}
            {post?.publishedAt && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '20px',
                }}
              >
                <span>📅</span>
                <span>{formatDate(post.publishedAt)}</span>
              </div>
            )}

            {/* Read Time */}
            {post?.readTime && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '20px',
                }}
              >
                <span>⏱️</span>
                <span>{post.readTime} دقیقه مطالعه</span>
              </div>
            )}
          </div>

          {/* Brand Watermark */}
          <div
            style={{
              position: 'absolute',
              top: '30px',
              right: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                fontSize: '28px',
                color: '#FFFFFF',
                fontWeight: 'bold',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                display: 'flex',
              }}
            >
              Voxcina Blog
            </div>
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
