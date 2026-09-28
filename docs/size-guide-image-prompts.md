# Size-Guide Diagram Prompts (Nano Banana Pro)

Prompts for generating the per-clothing-type measurement diagrams. Generate one image per clothing type, then upload it in the admin dashboard (`/admin/sizing-types`) when creating that type.

## Global rules (apply to every generation)

- **Aspect ratio 4:5** (portrait) for every type — keeps the product-page layout uniform.
- Same style block (below) verbatim in every prompt so all diagrams share one visual language.
- The Persian labels must be rendered **exactly** as written — check spelling after generation; regenerate if any label is garbled, missing, or misspelled.
- One garment per image, front view, flat lay / technical-flat style — no model, no hands, no hanger, no props.
- Dimension lines: thin solid lines with small arrowheads at both ends, clearly touching the exact garment edges being measured, drawn slightly outside the garment silhouette.
- If a generation comes back with English or garbled labels, reply to the same session with: `Fix the labels: render ONLY these exact Persian strings, no other text: <list the labels>`.

## Shared style block (paste at the start of every prompt)

```
Minimalist premium fashion size-guide diagram. Technical flat sketch of the garment, front view, centered, on a warm off-white background (#FAF7F2). Thin, clean charcoal-black line art (#2B2B2B), no shading, no texture, no shadows, no model. Elegant measurement dimension lines in a single muted terracotta accent color (#C4754B) with small arrowheads at both ends, placed outside the garment silhouette. Each dimension line is labeled with its Persian measurement name in clean, legible, modern Persian typography (same terracotta color), positioned next to its line without overlapping the garment. Lots of breathing room, balanced composition, high-end boutique aesthetic. Absolutely no other text, letters, numbers, watermarks, or logos anywhere in the image.
```

## Per-type prompts

### 1. تاپ و تیشرت (`top`)

```
[STYLE BLOCK]

The garment is a classic short-sleeve t-shirt. Draw exactly 4 dimension lines with these exact Persian labels:
1. A vertical line along the left side from the highest shoulder point straight down to the bottom hem, labeled "قد"
2. A horizontal line across the chest from armpit to armpit, labeled "عرض سینه"
3. A horizontal line across the back shoulders from shoulder seam to shoulder seam, labeled "عرض شانه"
4. A line along the right sleeve from the shoulder seam to the sleeve cuff, labeled "قد آستین"
```

### 2. پیراهن (`shirt`)

```
[STYLE BLOCK]

The garment is a classic long-sleeve button-up shirt with a collar, buttons visible. Draw exactly 4 dimension lines with these exact Persian labels:
1. A vertical line along the left side from the highest shoulder point straight down to the bottom hem, labeled "قد"
2. A horizontal line across the chest from armpit to armpit, labeled "عرض سینه"
3. A horizontal line across the shoulders from shoulder seam to shoulder seam, labeled "عرض شانه"
4. A line along the right sleeve from the shoulder seam to the end of the cuff, labeled "قد آستین"
```

### 3. هودی و سویشرت (`hoodie`)

```
[STYLE BLOCK]

The garment is a relaxed long-sleeve hoodie with a kangaroo pocket and drawstring hood resting flat. Draw exactly 4 dimension lines with these exact Persian labels:
1. A vertical line along the left side from the highest shoulder point straight down to the bottom hem, labeled "قد"
2. A horizontal line across the chest from armpit to armpit, labeled "عرض سینه"
3. A horizontal line across the shoulders from shoulder seam to shoulder seam, labeled "عرض شانه"
4. A line along the right sleeve from the shoulder seam to the sleeve cuff, labeled "قد آستین"
```

### 4. کت و کاپشن (`outerwear`)

```
[STYLE BLOCK]

The garment is a tailored long-sleeve coat, hip-length, with lapels, worn closed. Draw exactly 4 dimension lines with these exact Persian labels:
1. A vertical line along the left side from the highest shoulder point straight down to the bottom hem, labeled "قد"
2. A horizontal line across the chest from armpit to armpit, labeled "عرض سینه"
3. A horizontal line across the shoulders from shoulder seam to shoulder seam, labeled "عرض شانه"
4. A line along the right sleeve from the shoulder seam to the sleeve cuff, labeled "قد آستین"
```

### 5. شلوار (`pants`)

```
[STYLE BLOCK]

The garment is a pair of straight-leg trousers, front view, waistband at top. Draw exactly 4 dimension lines with these exact Persian labels:
1. A vertical line along the outer side of the right leg from the top of the waistband straight down to the hem, labeled "قد"
2. A horizontal line across the top edge of the waistband, labeled "دور کمر"
3. A horizontal line across the widest part of the hips, labeled "دور باسن"
4. A vertical line along the inner seam of the left leg from the crotch point down to the hem, labeled "قد داخل پا"
```

### 6. دامن (`skirt`)

```
[STYLE BLOCK]

The garment is a knee-length A-line skirt, front view, waistband at top. Draw exactly 3 dimension lines with these exact Persian labels:
1. A vertical line along the left side from the top of the waistband straight down to the hem, labeled "قد"
2. A horizontal line across the top edge of the waistband, labeled "دور کمر"
3. A horizontal line across the widest part of the skirt, labeled "دور باسن"
```

### 7. پیراهن و مانتو (`dress`)

```
[STYLE BLOCK]

The garment is a modest knee-length long-sleeve dress (manteau style), front view. Draw exactly 4 dimension lines with these exact Persian labels:
1. A vertical line along the left side from the highest shoulder point straight down to the bottom hem, labeled "قد"
2. A horizontal line across the chest from armpit to armpit, labeled "عرض سینه"
3. A horizontal line across the narrowest part of the waist, labeled "دور کمر"
4. A line along the right sleeve from the shoulder seam to the sleeve cuff, labeled "قد آستین"
```

## Generation checklist per type

1. Paste style block + type prompt into Nano Banana Pro, set aspect ratio 4:5.
2. Verify: exactly the listed number of dimension lines; each touches the correct garment edges; each Persian label matches the specified string character-for-character; no extra text.
3. Regenerate or use the fix instruction above until the labels are exact.
4. Export PNG (or WebP), then upload in `/admin/sizing-types` for the matching type.

## Adding a new type later

Copy the style block, describe the garment, list its measurements with exact placement descriptions (which edges each line touches) and exact Persian labels — same structure as above. The admin dashboard stores the prompt on the type so it can be regenerated later.
