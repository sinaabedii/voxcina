export interface BlogPost {
  _id?: string;
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: {
    name: string;
    avatar: string;
  };
  category: string;
  tags: string[];
  readTime: number;
  isPublished?: boolean;
  isActive?: boolean;
  publishedAt: string; // ISO date string
} 