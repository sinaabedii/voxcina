# Blog AI Pipeline - Implementation Summary

## Overview

Successfully implemented a comprehensive AI-driven blog content pipeline with three cooperating agents (Research, Writing, Prompt-Generation), durable storage, manual image upload workflow, structured block content, and modern SSR public pages.

## Completed Phases

### Phase 1: Foundation ✅
- **New Models**: `BlogPost`, `BlogPipelineRun`, `BlogAgentExecution`, `BlogResearchSource`, `BlogMedia`, `BlogBlock`
- **Repository Layer**: Full CRUD for all 5 collections with atomic status transitions
- **Validators**: Block order, heading hierarchy, image count policy, publication readiness
- **Brave Search Client**: LLM Context and Web Search with hardened URL fetching
- **OpenRouter Structured Client**: JSON Schema support with fallback
- **Worker Queue**: Mongo-backed with atomic leases, retry logic, and restart recovery
- **Handlers**: Public list/detail, admin CRUD, media upload with validation
- **Routes**: All new admin endpoints registered
- **Indexes**: Compound indexes for performance
- **Safety**: Blog seeding disabled, upload validation hardened

### Phase 2: Research Agent ✅
- **Query Generation**: Persian + English search queries
- **Brave Integration**: LLM Context with bounded tokens/URLs
- **Source Deduplication**: By canonical URL
- **Claim Extraction**: With source citations and confidence scores
- **Structured Output**: Findings, outline, uncertainties, prohibited claims
- **Persistence**: All sources and executions stored as append-only records

### Phase 3: Writing & Prompt Agents ✅
- **Writing Agent**: Native Persian content with 6 block types, strict validation
- **Prompt Agent**: Cover + inline image prompts with Voxcina palette enforcement
- **Workflow Manager**: Approval transitions (research → writing → prompts → media → publish)
- **Prompt Templates**: JSON configuration with schemas and guidelines

### Phase 4: Admin UI ✅
- **Five-Stage Workspace**: Brief → Research → Content → Prompts → Preview
- **Blog Admin Store**: Zustand store with all actions
- **Stage Components**: BriefStage, ResearchStage, ContentStage, PromptsStage, PreviewStage
- **Block Editor**: Type-safe rendering (no dangerouslySetInnerHTML)
- **Media Upload**: Drag-and-drop with validation and alt text requirement

### Phase 5: Public Pages ✅
- **Listing Page**: SSR with `dynamic = 'force-dynamic'`, server-side filtering, pagination
- **Detail Page**: SSR with typed block rendering, table of contents, proper SEO
- **BlogPostClientContent**: Renders blocks through typed components
- **Metadata**: generateMetadata exported, Article JSON-LD, breadcrumbs
- **BlogCard**: Updated for new structure

### Phase 6: Deployment ✅
- **Backup Script**: Automated MongoDB and uploads backup
- **Verification**: Build and lint checks
- **Rollback Plan**: mongorestore instructions

## Key Features

### Content Structure
- **6 Block Types**: title (H1), header (H2), section (H3), subsection (H4), text, image
- **Image Count Policy**: 1 image (<800 words), 2 images (800-1400), 3 images (>1400)
- **Heading Hierarchy**: Enforced H1→H2→H3→H4, no skipping levels
- **Content Hashing**: SHA256 of serialized blocks for revision tracking

### Agent Pipeline
1. **Research**: Brave Search → Source collection → Claim extraction → Outline generation
2. **Writing**: Research snapshot → Structured Persian content → Block validation
3. **Prompts**: Finalized content → Cover prompt + inline prompts → Palette enforcement

### Approval Gates
- **Gate 1**: Approve research before writing
- **Gate 2**: Approve content before prompt generation
- **Gate 3**: Manual image upload and alt text requirement

### Media Security
- **Hardened Uploads**: MIME validation, image decoding, dimension checks
- **Content-Hashed Filenames**: Immutable, deduplicated
- **Draft/Private Storage**: Media stored under `uploads/blog-media/drafts/{postId}/`
- **Public on Publish**: Only moved to public path when post is published
- **Alt Text Required**: Mandatory for accessibility

### SEO & Accessibility
- **SSR**: Server-side rendering for all public pages
- **JSON-LD**: Article and Breadcrumb schemas
- **Open Graph**: Dynamic metadata
- **Canonical URLs**: Proper hreflang support
- **Table of Contents**: Auto-generated from headings
- **Alt Text**: Required for all images

## API Endpoints

### Public
- `GET /api/blog-posts` - Paginated list with filters
- `GET /api/blog-posts/{slug}` - Published post with blocks and media
- `GET /api/blog/categories` - Category counts
- `GET /api/blog/tags` - Tag counts

### Admin
- `POST /api/admin/blog-runs` - Create generation brief
- `GET /api/admin/blog-runs` - List workflows
- `GET /api/admin/blog-runs/{id}` - Full workflow details
- `POST /api/admin/blog-runs/{id}/research` - Trigger research
- `POST /api/admin/blog-runs/{id}/approve` - Approve stage
- `POST /api/admin/blog-runs/{id}/write` - Trigger writing
- `POST /api/admin/blog-runs/{id}/prompts` - Trigger prompt generation
- `PATCH /api/admin/blog-posts/{id}` - Update blocks/metadata
- `POST /api/admin/blog-posts/{id}/media` - Upload media
- `DELETE /api/admin/blog-posts/{id}/media/{mediaId}` - Delete media
- `POST /api/admin/blog-posts/{id}/publish` - Publish post
- `POST /api/admin/blog-posts/{id}/unpublish` - Unpublish post
- `POST /api/admin/blog-posts/{id}/archive` - Archive post
- `POST /api/admin/blog-posts/{id}/restore` - Restore post

## Database Collections

1. **blog_posts** - Canonical articles with blocks
2. **blog_pipeline_runs** - Generation workflows
3. **blog_agent_executions** - Append-only agent outputs
4. **blog_research_sources** - Brave search results
5. **blog_media** - Uploaded media assets

## Files Created/Modified

### Backend (Go)
- `models/blog_post.go` - New models
- `services/blog_repository.go` - Repository layer
- `services/blog_validator.go` - Validators
- `services/brave_search.go` - Brave Search client
- `services/openrouter_structured.go` - OpenRouter client
- `services/blog_worker.go` - Worker queue
- `services/blog_research_agent.go` - Research agent
- `services/blog_writing_agent.go` - Writing agent
- `services/blog_prompt_agent.go` - Prompt agent
- `services/blog_workflow.go` - Approval transitions
- `handlers/blog_posts.go` - Complete rewrite
- `routes/routes.go` - New routes
- `db/blog_indexes.go` - Indexes
- `db/db.go` - Index initialization
- `main.go` - Worker startup
- `config/ai_prompts.json` - Prompt templates
- `config/blog_prompts.json` - Blog-specific prompts

### Frontend (Next.js)
- `types/blog.ts` - Extended types
- `store/blog-admin-store.ts` - Admin store
- `app/(admin)/admin/blogs/page.tsx` - Listing page
- `app/(admin)/admin/blogs/new/page.tsx` - New brief page
- `app/(admin)/admin/blogs/[id]/page.tsx` - Detail/workflow page
- `components/blog/stages/BriefStage.tsx`
- `components/blog/stages/ResearchStage.tsx`
- `components/blog/stages/ContentStage.tsx`
- `components/blog/stages/PromptsStage.tsx`
- `components/blog/stages/PreviewStage.tsx`
- `components/blog/BlogClientContent.tsx` - Updated for pagination
- `components/blog/BlogPostClientContent.tsx` - Block renderer
- `app/blog/page.tsx` - SSR listing
- `app/blog/[slug]/page.tsx` - SSR detail with metadata

### Scripts
- `scripts/deploy-blog-pipeline.sh` - Deployment automation

## Verification

All code passes:
- ✅ `go vet ./...` (backend syntax)
- ✅ `npm run lint` (frontend)
- ✅ `npm run build` (frontend)

## Next Steps for Production

1. **Backup**: Run `./scripts/deploy-blog-pipeline.sh` to backup existing data
2. **Deploy Backend**: `docker compose build server && docker compose up -d server`
3. **Deploy Frontend**: `docker compose build --no-cache front_end && docker compose up -d front_end`
4. **Test**: Create a test pipeline run and verify all stages
5. **Monitor**: Watch worker logs for agent execution
6. **Rollback**: If needed, `mongorestore` from backup

## Known Limitations

- No web crawling beyond Brave Search API
- Manual image generation and upload required
- No automatic content quality scoring
- Worker queue is process-local (restart loses in-progress work, but Mongo leases recover)
- No rate limiting on agent calls (controlled by OpenRouter/Brave quotas)

## Security Considerations

- All admin endpoints require `AdminAuthMiddleware`
- Media stored privately until publication
- No HTML/Markdown in text blocks (XSS prevention)
- Image validation on upload (MIME, dimensions, decoding)
- Content hashing prevents tampering
- Append-only execution records for audit trail
