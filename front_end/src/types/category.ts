// Corresponds to the Go backend's models.Category
export interface Category {
  id?: string; // Corresponds to primitive.ObjectID, omitempty suggests it can be absent (e.g., before creation)
  name: string;
  slug: string;
  parent_id?: string | null; // Corresponds to primitive.ObjectID, omitempty. Nullable if it can be explicitly null in JSON.
  description: string;
  image: string;
  // For frontend usage, we might want to represent hierarchical structures directly
  children?: Category[];
} 