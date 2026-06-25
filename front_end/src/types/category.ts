export interface Category {
  id?: string;                  // MongoDB ObjectID, can be absent if not yet created
  name: string;
  slug: string;
  parent_id?: string | null;    // Parent category ObjectID as string, nullable
  description: string;
  image: string;                // URL to category image
  avatar?: string;              // Path to a flat icon under /uploads/avatars/categories/ (e.g. "/uploads/avatars/categories/shirt.svg")
  created_at?: string;          // ISO 8601 timestamp, optional
  updated_at?: string;          // ISO 8601 timestamp, optional
  is_active?: boolean;          // Whether the category is active
  show_in_header?: boolean;    // Should this category appear in the site header navigation?
}

export interface CategoryAvatar {
  name: string;   // base name without color suffix and extension (e.g. "shirt")
  color: string;  // "white" or "blue"
  file: string;   // file name on disk (e.g. "shirt-white.svg")
  path: string;   // public URL path (e.g. "/uploads/avatars/categories/shirt-white.svg")
  size: number;   // file size in bytes
}
