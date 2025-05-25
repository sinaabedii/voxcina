export interface Category {
  id?: string;                  // MongoDB ObjectID, can be absent if not yet created
  name: string;
  slug: string;
  parent_id?: string | null;    // Parent category ObjectID as string, nullable
  description: string;
  image: string;                // URL to category image
  created_at?: string;          // ISO 8601 timestamp, optional
  updated_at?: string;          // ISO 8601 timestamp, optional
  is_active?: boolean;          // Whether the category is active
}
