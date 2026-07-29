import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/types/blog';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import AuthorAvatar from './AuthorAvatar';

interface BlogCardProps {
  post: BlogPost;
  variant?: 'default' | 'compact' | 'featured' | 'grid';
}

export default function BlogCard({ post, variant = 'default' }: BlogCardProps) {
  const dateValue = post.publishedAt || post.createdAt;
  const formattedDate = dateValue
    ? new Date(dateValue).toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  // Real posts carry `authorSnapshot` (schema v2); `author` only exists on legacy mock data.
  const author = post.authorSnapshot || post.author || { name: 'تیم وکسینا', avatar: '' };

  if (variant === 'grid') {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group relative block overflow-hidden rounded-2xl bg-voxcina-darkBlue shadow-soft transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-strong"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[3/4]">
          <Image
            src={post.coverImage || post.coverImageId || '/images/blog/placeholder.jpg'}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-voxcina-darkBlue via-voxcina-blue/45 to-voxcina-blue/5 transition-opacity duration-500 group-hover:opacity-95" />
        </div>

        <div className="absolute inset-x-0 bottom-0 flex flex-col p-4 text-white sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium backdrop-blur-md ring-1 ring-white/25">
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-white/80">
              <CalendarIcon className="h-3.5 w-3.5" />
              {formattedDate}
            </span>
          </div>
          <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug sm:text-lg">
            {post.title}
          </h3>
          <p className="mb-3 line-clamp-2 text-xs text-white/80 sm:text-sm">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between border-t border-white/15 pt-2 text-[9px] text-white/85 sm:text-[10px]">
            <div className="flex items-center gap-1.5">
              <AuthorAvatar avatar={author.avatar} name={author.name} className="h-4 w-4 sm:h-5 sm:w-5" tone="white" />
              <span className="font-medium">{author.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span>{post.readTime} دقیقه</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'featured') {
    return (
      <div className="group relative overflow-hidden rounded-2xl bg-white shadow-soft hover:shadow-medium transition-all duration-300">
        <div className="relative h-[300px] sm:h-[350px] md:h-[400px] w-full overflow-hidden">
          <Image
            src={post.coverImage || post.coverImageId || '/images/blog/placeholder.jpg'}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 80vw, 50vw"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-voxcina-blue/90 to-transparent"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
          <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="rounded-full bg-primary-300/80 px-3 py-1 text-xs font-medium text-voxcina-blue backdrop-blur-sm">
              {post.category}
            </span>
            <div className="flex items-center gap-1 text-xs">
              <CalendarIcon className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>
          </div>
          <h3 className="mb-2 sm:mb-3 text-xl sm:text-2xl font-bold leading-tight">
            <Link href={`/blog/${post.slug}`} className="hover:underline">
              {post.title}
            </Link>
          </h3>
          <p className="mb-3 sm:mb-4 line-clamp-2 text-xs sm:text-sm text-white/90">{post.excerpt}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AuthorAvatar avatar={author.avatar} name={author.name} className="h-7 w-7 sm:h-8 sm:w-8" tone="white" />
              <span className="text-xs sm:text-sm font-medium">{author.name}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{post.readTime} دقیقه مطالعه</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="group flex gap-3 sm:gap-4 rounded-xl bg-white p-3 shadow-soft hover:shadow-medium transition-all duration-300">
        <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-lg">
          <Image
            src={post.coverImage || post.coverImageId || '/images/blog/placeholder.jpg'}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 64px, 80px"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col justify-center">
          <h3 className="mb-1 line-clamp-2 text-xs sm:text-sm font-bold leading-tight text-voxcina-blue">
            <Link href={`/blog/${post.slug}`} className="hover:underline">
              {post.title}
            </Link>
          </h3>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span className="text-[10px] sm:text-xs">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              <span className="text-[10px] sm:text-xs">{post.readTime} دقیقه</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-soft hover:shadow-medium transition-all duration-300">
      <div className="relative h-48 sm:h-56 w-full overflow-hidden">
        <Image
          src={post.coverImage || post.coverImageId || '/images/blog/placeholder.jpg'}
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
          loading="lazy"
        />
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="rounded-full bg-secondary-200 px-2 py-1 text-xs font-medium text-voxcina-blue">
            {post.category}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-[10px] sm:text-xs">{formattedDate}</span>
          </div>
        </div>
        <h3 className="mb-2 sm:mb-3 text-base sm:text-xl font-bold leading-tight text-voxcina-blue">
          <Link href={`/blog/${post.slug}`} className="hover:underline">
            {post.title}
          </Link>
        </h3>
        <p className="mb-3 sm:mb-4 flex-1 line-clamp-3 text-xs sm:text-sm text-gray-600">{post.excerpt}</p>
        <div className="flex items-center justify-between border-t border-gray-100 pt-3 sm:pt-4">
          <div className="flex items-center gap-2">
            <AuthorAvatar avatar={author.avatar} name={author.name} className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="text-[10px] sm:text-xs font-medium text-gray-700">{author.name}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
            <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{post.readTime} دقیقه مطالعه</span>
          </div>
        </div>
      </div>
    </div>
  );
} 