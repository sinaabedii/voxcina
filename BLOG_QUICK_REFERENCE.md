# Blog AI Pipeline - Quick Reference

## Create New Blog Post

1. Navigate to `/admin/blogs/new`
2. Fill in the generation brief:
   - Topic (required)
   - Category
   - Target audience
   - Tone (professional/casual/academic/persuasive)
   - Desired length (words)
   - Keywords (comma-separated)
   - Additional notes
3. Click "Create Run"
4. You'll be redirected to the workflow page

## Workflow Stages

### Stage 1: Brief
- Review the generation brief
- Click "Start Research"

### Stage 2: Research
- Agent fetches sources from Brave Search
- Review sources, claims, outline
- Click "Approve and Continue" when ready

### Stage 3: Content
- Agent generates Persian content with blocks
- Review blocks, headings, image placeholders
- Edit blocks if needed (title, header, section, subsection, text, image)
- Click "Approve and Continue"

### Stage 4: Prompts
- Agent generates image prompts (cover + inline)
- Review prompts for each image slot
- Click "Approve and Continue"

### Stage 5: Preview & Publication
- Manually generate images using the prompts
- Upload each image to its slot (cover or inline)
- Add alt text for each image (required)
- Review the full article preview
- Click "Publish Article" when ready

## API Quick Reference

### Create Run
```bash
curl -X POST http://localhost:3000/api/admin/blog-runs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Fashion trends 2026",
    "category": "Style Guide",
    "target_audience": "Fashion enthusiasts",
    "tone": "professional",
    "desired_length": 1200,
    "keywords": ["fashion", "trends", "2026"]
  }'
```

### Trigger Research
```bash
curl -X POST http://localhost:3000/api/admin/blog-runs/{runID}/research \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Approve Research
```bash
curl -X POST http://localhost:3000/api/admin/blog-runs/{runID}/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Upload Media
```bash
curl -X POST http://localhost:3000/api/admin/blog-posts/{postID}/media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "slot=cover" \
  -F "file=@image.jpg" \
  -F "alt=Description in Persian"
```

### Publish Post
```bash
curl -X POST http://localhost:3000/api/admin/blog-posts/{postID}/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Block Types

| Type | HTML | Description |
|------|------|-------------|
| `title` | `<h1>` | Article title (only one, must be first) |
| `header` | `<h2>` | Main section heading |
| `section` | `<h3>` | Subsection heading |
| `subsection` | `<h4>` | Sub-subsection heading |
| `text` | `<p>` | Paragraph content |
| `image` | `<figure>` | Inline image with alt and caption |

## Image Count Policy

| Word Count | Images |
|------------|--------|
| < 800 | 1 |
| 800-1400 | 2 |
| > 1400 | 3 |

## Voxcina Palette (for image prompts)

- Deep Blue: `#1A3C69`
- Warm Cream: `#F4F1EC`
- Dark Blue: `#0A1B3C`
- Light Cream: `#FCFAF8`

## Image Specifications

| Type | Aspect Ratio | Dimensions |
|------|--------------|------------|
| Cover | 16:9 | 1200×630 |
| Inline | 16:10 | 1600×1000 |

## Status Flow

```
brief → researching → research_approved → writing → content_approved → prompts → prompts_approved → media_pending → ready → published
```

## Troubleshooting

### Research not starting
- Check run status is "brief"
- Verify Brave Search API key is set
- Check worker logs: `docker compose logs -f server`

### Writing fails
- Ensure research is approved first
- Check OpenRouter API key and quota
- Review execution records in admin

### Image prompts stale
- If content is edited after finalization, prompts become stale
- Regenerate prompts after content changes

### Media upload fails
- Verify image is JPEG/PNG/WebP
- Check dimensions and file size
- Ensure alt text is provided

## Monitoring

### Check worker status
```bash
docker compose logs -f server | grep blog-worker
```

### View execution records
```bash
# In MongoDB
db.blog_agent_executions.find().sort({created_at: -1}).limit(10)
```

### Check run status
```bash
curl http://localhost:3000/api/admin/blog-runs/{runID} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Rollback

If something goes wrong:

1. Stop the application
2. Restore from backup:
   ```bash
   mongorestore --uri="mongodb://localhost:27017" --db=voxcina ./backups/blog-YYYYMMDD_HHMMSS/blog_posts
   ```
3. Restart the application
