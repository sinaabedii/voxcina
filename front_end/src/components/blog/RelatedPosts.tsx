import { BlogPost, getRelatedPosts } from '@/data/blog';
import BlogCard from './BlogCard';

interface RelatedPostsProps {
  currentPost: BlogPost;
}

export default function RelatedPosts({ currentPost }: RelatedPostsProps) {
  const relatedPosts = getRelatedPosts(currentPost, 3);

  if (relatedPosts.length === 0) return null;

  return (
    <div className="mt-8 md:mt-12 py-6 md:py-8 border-t border-gray-100">
      <h2 className="mb-4 md:mb-6 text-xl md:text-2xl font-bold text-voxcina-blue">مقالات مرتبط</h2>
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {relatedPosts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
} 