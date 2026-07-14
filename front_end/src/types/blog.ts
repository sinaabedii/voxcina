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
  publishedAt: string;
  blocks?: BlogBlock[];
  status?: Status;
  pipelineRunID?: string;
  contentRevision?: number;
  contentHash?: string;
  authorSnapshot?: AuthorSnapshot;
}

export type Status =
  | "draft"
  | "brief_created"
  | "research_pending"
  | "research_completed"
  | "research_approved"
  | "writing_pending"
  | "content_draft"
  | "content_approved"
  | "prompts_pending"
  | "media_ready"
  | "preview_ready"
  | "published"
  | "archived";

export interface PipelineRunID {
  runID: string;
}

export interface ContentRevision {
  revision: number;
  timestamp: string;
  author: string;
  summary: string;
}

export interface ContentHash {
  hash: string;
  computedAt: string;
}

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
  status: PipelineRunStatus;
  postID?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export type PipelineRunStatus =
  | "pending"
  | "brief_created"
  | "research_in_progress"
  | "research_completed"
  | "research_rejected"
  | "writing_in_progress"
  | "content_draft"
  | "content_approved"
  | "prompts_in_progress"
  | "media_uploading"
  | "ready_for_preview"
  | "approved"
  | "failed"
  | "cancelled";

export interface BlogAgentExecution {
  _id?: string;
  id: string;
  runID: string;
  stage: AgentStage;
  attempt: number;
  inputSnapshot: Record<string, unknown>;
  parsedOutput?: Record<string, unknown>;
  rawResponse?: string;
  promptKey: string;
  promptVersion: string;
  renderedPrompt?: string;
  provider: string;
  model: string;
  tokenUsage?: TokenUsage;
  durationMs?: number;
  status: ExecutionStatus;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export type AgentStage =
  | "research"
  | "outline"
  | "writing"
  | "image_prompts"
  | "quality_check";

export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface BlogResearchSource {
  _id?: string;
  id: string;
  runID: string;
  query: string;
  provider: string;
  url: string;
  title: string;
  snippet: string;
  extractedContent?: string;
  claims: ResearchClaim[];
  publishedAt?: string;
  fetchedAt: string;
}

export interface ResearchClaim {
  claim: string;
  confidence: number;
  sourceURL?: string;
  verified: boolean;
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
  _id?: string;
  id: string;
  runID: string;
  topic: string;
  locale: string;
  targetAudience: string;
  desiredLength: number;
  tone: string;
  keywords: string[];
  category: string;
  sourcePreferences: SourcePreferences;
  additionalNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourcePreferences {
  maxSources: number;
  preferredProviders: string[];
  excludeDomains: string[];
  minDomainAuthority: number;
  languagePreference: string;
}

export type BlockType = "title" | "header" | "section" | "subsection" | "text" | "image";

export interface BlogBlock {
  type: BlockType;
  id: string;
  order: number;
  text?: string;
  imageSlotID?: string;
  imageID?: string;
  alt?: string;
  caption?: string;
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
