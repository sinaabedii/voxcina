import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface InstagramPost {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

interface InstagramFeedProps {
  username?: string;
  postsCount?: number;
  showCaption?: boolean;
  showStats?: boolean;
  className?: string;
}

const InstagramFeed: React.FC<InstagramFeedProps> = ({
  username = "voxcina",
  postsCount = 6,
  showCaption = true,
  showStats = true,
  className = "",
}) => {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstagramPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        const accessToken = process.env.NEXT_PUBLIC_INSTAGRAM_ACCESS_TOKEN;

        if (accessToken) {
          const response = await fetch(
            `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count&limit=${postsCount}&access_token=${accessToken}`
          );

          if (response.ok) {
            const data = await response.json();
            setPosts(data.data || []);
          } else {
            throw new Error("Failed to fetch Instagram posts");
          }
        } else {
          const response = await fetch(
            `/api/instagram/${username}?count=${postsCount}`
          );

          if (response.ok) {
            const data = await response.json();
            setPosts(data.posts || []);
          } else {
            throw new Error("Failed to fetch Instagram posts");
          }
        }
      } catch (err) {
        console.error("Error fetching Instagram posts:", err);
        setError("خطا در بارگذاری پست‌های اینستاگرام");
      } finally {
        setLoading(false);
      }
    };

    fetchInstagramPosts();
  }, [username, postsCount]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "دیروز";
    if (diffDays < 7) return `${diffDays} روز پیش`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} هفته پیش`;
    return `${Math.floor(diffDays / 30)} ماه پیش`;
  };

  const truncateCaption = (caption: string, maxLength: number = 50) => {
    if (!caption) return "";
    return caption.length > maxLength
      ? caption.substring(0, maxLength) + "..."
      : caption;
  };

  const handlePostClick = (permalink: string) => {
    window.open(permalink, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <section className={`mb-16 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-voxcina-blue">
              ما را در اینستاگرام دنبال کنید
            </h2>
            <p className="text-voxcina-blue/80 max-w-md mx-auto text-sm md:text-base">
              جدیدترین محصولات و ترندها را در اینستاگرام ما ببینید
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Array.from({ length: postsCount }).map((_, index) => (
              <div
                key={index}
                className="aspect-square bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`mb-16 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-voxcina-blue">
              ما را در اینستاگرام دنبال کنید
            </h2>
            <p className="text-red-500 text-sm">{error}</p>
            <a
              href={`https://instagram.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-4 text-voxcina-blue hover:text-voxcina-darkBlue transition-colors"
            >
              <span className="text-base md:text-lg mr-2">@{username}</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`mb-16 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-voxcina-blue">
            ما را در اینستاگرام دنبال کنید
          </h2>
          <p className="text-voxcina-blue/80 max-w-md mx-auto text-sm md:text-base">
            جدیدترین محصولات و ترندها را در اینستاگرام ما ببینید
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ staggerChildren: 0.1 }}
        >
          {posts.slice(0, postsCount).map((post, index) => (
            <motion.div
              key={post.id}
              className="group relative aspect-square overflow-hidden bg-gray-100 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => handlePostClick(post.permalink)}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="absolute inset-0">
                <img
                  src={
                    post.media_type === "VIDEO" && post.thumbnail_url
                      ? post.thumbnail_url
                      : post.media_url
                  }
                  alt={
                    post.caption
                      ? truncateCaption(post.caption, 30)
                      : "Instagram Post"
                  }
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              </div>

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />
              {post.media_type !== "IMAGE" && (
                <div className="absolute top-2 right-2 z-10">
                  {post.media_type === "VIDEO" && (
                    <div className="bg-black/70 text-white p-1 rounded-full">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  {post.media_type === "CAROUSEL_ALBUM" && (
                    <div className="bg-black/70 text-white p-1 rounded-full">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              )}

              <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                {showStats && (post.like_count || post.comments_count) && (
                  <div className="flex justify-between text-white text-xs">
                    {post.like_count && (
                      <div className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span>{post.like_count}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-white">
                  {showCaption && post.caption && (
                    <p className="text-xs mb-1 line-clamp-2">
                      {truncateCaption(post.caption, 60)}
                    </p>
                  )}
                  <p className="text-xs text-white/70">
                    {formatDate(post.timestamp)}
                  </p>
                </div>
              </div>

              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <div className="bg-white/20 backdrop-blur-md text-white p-1.5 rounded-full">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <a
            href={`https://instagram.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-voxcina-blue hover:text-voxcina-darkBlue transition-colors font-medium"
          >
            <span className="text-base md:text-lg">@{username}</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default InstagramFeed;
