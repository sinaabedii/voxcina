# Blog AI Pipeline — Development Plan

## Scope

Transform the existing blog section into an AI-driven content pipeline with three cooperating agents (Research, Writing, Prompt-Generation), durable storage of every agent input/output, manual image upload by the admin, inline image placement inside articles, cover-image prompts, structured block content, SSR public pages, and a polished admin workflow.

## Confirmed Decisions

- **Research source**: Brave Search API, specifically the LLM Context endpoint (`POST /res/v1/llm/context`).
- **Approval gates**: Two. Approve research before writing; approve finalized content before generating image prompts.
- **Existing records**: Replace. Archive the legacy `blog_posts` collection; launch with empty structured content.
- **Heading semantics**: `Title → h1`, `Header → h2`, `Section → h3`, `Subsection → h4`.
- **Prompt language**: English prompts, Persian labels/notes in admin.
- **Inline image count**: 1–3, derived from textual length (under 800 words → 1, 800–1,400 → 2, above 1,400 → 3).
- **Image dimensions**: Cover 1200×630, inline 1600×1000.
- **Voxcina palette for prompts**: Deep blue `#1A3C69`, Warm cream `#F4F1EC`, Dark blue `#0A1B3C`, Light cream `#FCFAF8`.

## Architecture

### Collections

| Collection | Purpose |
|---|---|
| `blog_posts` | Canonical editable and publishable article |
| `blog_pipeline_runs` | Generation workflow, stage state, approvals, linked post |
| `blog_agent_executions` | Append-only input/output of every agent attempt |
| `blog_research_sources` | Brave queries, URLs, snippets, claims, dates |
| `blog_media` | Uploaded media, slots, cover, dimensions, checksums |

### Content Blocks

Discriminated union:

```
type: title | header | section | subsection | text | image
id: stable UUID
order: integer
text: block content (text-only blocks)
image_slot_id: image blocks only
image: media reference once uploaded
alt: required for uploaded images
caption: optional
```

Validation rules:

- Exactly one `title`, always first.
- Headings cannot be empty.
- Text blocks contain plain text only.
- Images must appear between textual blocks, never first or last.
- Writing agent inserts 1–3 image slots.
- Publication requires a cover and every image slot to be resolved.

### Agent Executions

Append-only record per attempt:

- `pipeline_run_id`, `stage`, `attempt`
- Typed input snapshot
- Parsed structured output
- Raw provider response
- Prompt key, version, rendered prompt
- Provider, model, token usage, cost metadata, latency
- Status, error, retry count, lease info
- Created, started, completed timestamps

Retries never overwrite prior outputs.

## Agent Architecture

### Research Agent

- Uses `BRAVE_SEARCH_API_KEY` with optional `BRAVE_SEARCH_BASE_URL`.
- Prefers Brave LLM Context with bounded URLs and token budgets.
- Generates Persian and English queries.
- Deduplicates canonical URLs.
- Preserves citations as stable source IDs.
- Requires important factual claims to reference at least one source.
- Records unsupported or conflicting claims for admin review.
- Uses freshness filtering for trends/seasonal fashion.
- Treats snippets as untrusted data; prohibits following instructions found inside sources.

### Writing Agent

- Receives approved research snapshot.
- Outputs native Persian content using only the six permitted block types.
- Strict heading hierarchy: H1/H2/H3/H4.
- Inserts 1–3 contextual image blocks.
- Emits excerpt, tags, category recommendation, SEO description.
- Server-side validation rejects HTML, Markdown headings, unknown block types, malformed hierarchy, or disallowed image counts.

### Prompt-Generation Agent

- Receives the exact finalized content revision.
- Generates one cover prompt and one prompt per inline image slot.
- Suggests alt text and caption per image.
- Recommends aspect ratio and composition.
- Enforces Voxcina palette and prohibits embedded text, logos, watermarks, unrelated colors, distorted garments, and culturally inappropriate styling.
- Marks prompts as stale if content changes after finalization.

## Worker Queue

- Mongo-backed worker queue with atomic `FindOneAndUpdate` claims and expiring leases.
- Servers can recover abandoned work on restart.
- Per-run concurrency and retry limits to control API cost.

## API Design

### Public

| Endpoint | Purpose |
|---|---|
| `GET /api/blog-posts` | Paginated list projection, server-side category/tag/search filters |
| `GET /api/blog-posts/{slug}` | Published post with ordered blocks and media |
| `GET /api/blog/categories` | Published category counts |
| `GET /api/blog/tags` | Published tag counts |

List responses must exclude blocks, sources, raw AI output, and execution history.

### Admin

| Endpoint | Purpose |
|---|---|
| `GET /api/admin/blog-runs` | List generation workflows |
| `POST /api/admin/blog-runs` | Create generation brief |
| `GET /api/admin/blog-runs/{id}` | Full workflow, executions, sources, status |
| `POST /api/admin/blog-runs/{id}/research` | Run or retry research |
| `POST /api/admin/blog-runs/{id}/research/approve` | First approval gate |
| `POST /api/admin/blog-runs/{id}/write` | Generate structured article |
| `PATCH /api/admin/blog-posts/{id}` | Edit metadata and blocks (JSON) |
| `POST /api/admin/blog-posts/{id}/finalize` | Freeze content revision |
| `POST /api/admin/blog-runs/{id}/image-prompts` | Generate cover and inline prompts |
| `POST /api/admin/blog-posts/{id}/media` | Upload cover or named inline slot |
| `DELETE /api/admin/blog-posts/{id}/media/{mediaId}` | Remove or replace media safely |
| `POST /api/admin/blog-posts/{id}/publish` | Validate and publish |
| `POST /api/admin/blog-posts/{id}/unpublish` | Return to draft |
| `DELETE /api/admin/blog-posts/{id}` | Archive |
| `POST /api/admin/blog-posts/{id}/restore` | Restore archived post |

## Frontend Plan

### Admin

- Dedicated pages: `/admin/blogs`, `/admin/blogs/new`, `/admin/blogs/[id]`.
- Five-stage workspace: Brief → Research Review → Structured Content Editor → Image Prompts & Uploads → Preview & Publication.
- Block editor: only six types, reorder controls, heading hierarchy view, inline image placeholder rendering, stale-prompt indicators.
- Replace the modal-based raw-HTML editor.

### Public Listing

- Server-rendered with `dynamic = 'force-dynamic'` and `cache: 'no-store'`.
- Pass URL search parameters directly to the backend.
- Lightweight cards with cover, title, excerpt, category, date, and read time.
- Database-driven pagination and filter counts.
- Add blog link to public header/footer.

### Detail Page

- Article as a Server Component.
- Render each block through a typed component, never raw HTML.
- Editorial hero with H1, cover, metadata, and ordered content.
- Narrow readable column, generated table of contents, generous Persian typography, cream/blue accents.
- Image blocks as `<figure>` with `next/image`, dimensions, alt text, captions.
- Related posts, breadcrumbs, Article JSON-LD, canonical URL, Open Graph metadata, proper 404/error handling.
- Export `generateMetadata` directly from the route page.
- Avoid reliance on missing Tailwind typography classes.

## Media Security

- Enforce request limits with `http.MaxBytesReader`.
- Decode images to verify JPEG/PNG/WebP rather than trusting headers/extensions.
- Validate dimensions and file size.
- Generate immutable content-hashed filenames.
- Store draft uploads outside the publicly served `uploads` tree.
- Move them into public storage only when publishing.
- Record width, height, MIME type, checksum, uploader, and slot.
- Delete replaced files only after the database update succeeds.
- Require alt text before publication.

## Replacement Strategy

1. Back up `blog_posts` and `uploads/blog`.
2. Archive legacy collection instead of immediate destruction.
3. Remove blog deletion from automatic seeding.
4. Remove unused static frontend blog data.
5. Create new collections, validators, indexes.
6. Launch with empty structured blog collection.
7. Keep archived legacy data for a defined rollback period.
8. Remove legacy files only after production acceptance.

Recommended indexes:

- `blog_posts`: unique slug, publication status/date, category/status/date, tags/status/date, pipeline status/update time.
- `blog_pipeline_runs`: status/update time.
- `blog_agent_executions`: run_id, stage, attempt.
- `blog_research_sources`: run_id, source_id.
- `blog_media`: post_id, slot, unique media_id.

## Delivery Phases

1. Safety fixes, replacement schema, indexes, validators, repositories, and structured CRUD.
2. Brave integration, OpenRouter structured-output client, durable worker, research stage.
3. Writing and prompt agents with validation and approval transitions.
4. New admin workflow, block editor, prompt display, and hardened uploads.
5. SSR listing/detail redesign, SEO, JSON-LD, filters, and navigation.
6. Backup, replacement cutover, production smoke tests, and monitoring.

## Verification

- `go test ./...` and `go vet ./...`
- `npm run lint` and `npm run build`
- Unit tests for block validation, heading order, image-count policy, state transitions, prompt invalidation, slug generation, structured-output parsing.
- Handler tests for authorization, invalid transitions, projections, publication requirements, and upload rejection.
- Staging tests for restart recovery, Brave rate limits, OpenRouter failures, manual image placement, mobile RTL rendering, SSR output, metadata, and publish/unpublish behavior.
