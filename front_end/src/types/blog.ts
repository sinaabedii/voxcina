export interface BlogPost {
  _id?: string;
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  /** Actual field name returned by the Go API (schema v2) for the cover image path. */
  coverImageId?: string;
  author: {
    name: string;
    avatar: string;
  };
  category: string;
  tags: string[];
  readTime: number;
  isPublished?: boolean;
  isActive?: boolean;
  publishedAt: string;
  createdAt?: string;
  blocks?: BlogBlock[];
  status?: Status;
  pipelineRunID?: string;
  contentRevision?: number;
  contentHash?: string;
  authorSnapshot?: AuthorSnapshot;
}

export type Status =
  | "draft"
  | "research_review"
  | "content_review"
  | "image_pending"
  | "ready"
  | "published"
  | "archived";

export interface AuthorSnapshot {
  name: string;
  avatar: string;
  bio?: string;
}

export interface BlogPipelineRun {
  _id?: string;
  id: string;
  topic: string;
  locale: string;
  targetAudience: string;
  desiredLength: number;
  tone: string;
  keywords: string[];
  category: string;
  sourcePreferences: string[];
  additionalNotes?: string;
  status: string;
  postId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  executions?: BlogAgentExecution[];
  sources?: BlogResearchSource[];
}

export interface BlogAgentExecution {
  _id?: string;
  id: string;
  pipelineRunId?: string;
  stage: string;
  attempt: number;
  inputSnapshot?: Record<string, unknown>;
  parsedOutput?: Record<string, unknown>;
  rawResponse?: string;
  promptKey?: string;
  promptVersion?: string;
  renderedPrompt?: string;
  provider?: string;
  model?: string;
  tokenUsage?: number;
  costMetadata?: string;
  durationMs?: number;
  status: string;
  error?: string;
  retryCount?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BlogResearchSource {
  _id?: string;
  id?: string;
  pipelineRunId?: string;
  query: string;
  provider: string;
  url: string;
  title: string;
  snippet: string;
  extractedContent?: string;
  claims?: ResearchClaim[];
  publishedAt?: string;
  fetchedAt?: string;
  sourceIndex?: number;
  createdAt?: string;
}

export interface ResearchClaim {
  claim: string;
  confidence: number;
  sourceURL?: string;
  verified?: boolean;
}

export interface BlogMedia {
  _id?: string;
  id: string;
  postID: string;
  slot: string;
  filePath: string;
  publicPath: string;
  width?: number;
  height?: number;
  mimeType: string;
  fileSize: number;
  checksumSHA256?: string;
  uploadedAt: string;
  publishedAt?: string;
}

export interface GenerationBrief {
  topic: string;
  locale?: string;
  targetAudience?: string;
  desiredLength?: number;
  tone?: string;
  keywords?: string[];
  category?: string;
  sourcePreferences?: string[];
  additionalNotes?: string;
}

export type BlockType = "title" | "header" | "txt" | "image" | "list" | "quote" | "product";

export interface BlogBlock {
  type: BlockType;
  id?: string;
  order: number;
  text?: string;
  imageSlotId?: string;
  imageId?: string;
  alt?: string;
  caption?: string;

  // List blocks.
  items?: string[];
  ordered?: boolean;

  // Quote blocks (body text reuses `text` above).
  attribution?: string;

  // Product blocks. `productDescription` is writer-authored intent; the rest
  // is filled in later by an admin (manual search or AI auto-match) — a
  // product block is "resolved" iff `productId` is set.
  productDescription?: string;
  productId?: string;
  productColorHex?: string;
  productColorName?: string;
  productName?: string;
  productImage?: string;
  productPrice?: number;
  productOriginalPrice?: number;
}

export interface BlogOutline {
  sections: OutlineSection[];
  generatedAt: string;
  sourceCount: number;
}

export interface OutlineSection {
  heading: string;
  level: number;
  keyPoints: string[];
}

export interface BlogGenerationState {
  outline?: BlogOutline;
  uncertainties: string[];
  prohibitedClaims: string[];
  researchSummary: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  order: number;
  isActive: boolean;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}
