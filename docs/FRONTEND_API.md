# Frontend API Reference

Base URL: `/api`

---

## Color Variant Display Model

The product listing uses a **color-variant-first** approach where each color of a product appears as a separate card in the grid.

### How It Works

**Backend:** A single product (e.g., "تیشرت مردانه") with 3 colors (Red, Blue, Black) is stored as ONE document with `colorVariants[]` array.

**API Response:** `GET /products` expands this into 3 separate `ColorVariantListItem` objects - one per color.

**Frontend:** Each color variant renders as its own `ProductCard`, showing:
- Color-specific images
- Color indicator badge (circle with hex color)
- Color name in subtitle (e.g., "قرمز - Nike")
- Sizes available for that specific color

### Visual Behavior

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  [Image]    │  │  [Image]    │  │  [Image]    │
│   🔴        │  │   🔵        │  │   ⚫        │
│ تیشرت مردانه │  │ تیشرت مردانه │  │ تیشرت مردانه │
│ قرمز - Nike │  │ آبی - Nike  │  │ مشکی - Nike │
│ ۴۵۰,۰۰۰ ت   │  │ ۴۵۰,۰۰۰ ت   │  │ ۴۵۰,۰۰۰ ت   │
└─────────────┘  └─────────────┘  └─────────────┘
     Same product, 3 cards (one per color)
```

### Link Behavior

Clicking a card navigates to: `/products/{productId}?color={colorHex}`

The product detail page pre-selects the clicked color variant.

### Key Benefits
- Users see all available colors at a glance
- Each color shows its own stock status
- Better visual browsing for fashion products
- SEO: More indexable product variations

---

## Products

### List Products
`GET /products`

Returns paginated color variants as separate items.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `limit` | int | Items per page (default: 20) |
| `category` | string | Category ID or name |
| `brandId` | string | Brand ObjectID |
| `brand` | string | Brand name |
| `search` | string | Text search on name/description |
| `sort` | string | `newest`, `price-asc`, `price-desc`, `popular`, `discount` |
| `is_flash_sale` | bool | Filter flash sale items |
| `in_stock` | bool | Filter in-stock items only |

**Response:**
```json
{
  "data": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "colorVariant": {
        "color": "#FF5733",
        "colorName": "قرمز",
        "images": ["/uploads/products/..."],
        "tryOnImage": "/uploads/products/.../tryon.jpg",
        "sizes": [{ "size": "M", "sku": "SKU123", "quantity": 5 }]
      },
      "name": "تیشرت مردانه",
      "price": 450000,
      "originalPrice": 550000,
      "brand": "Nike",
      "inStock": true,
      "totalInventory": 15
    }
  ],
  "pagination": {
    "totalPages": 5,
    "currentPage": 1,
    "nextPage": 2,
    "totalItems": 100
  }
}
```

> **Note:** `totalItems` in pagination counts color variants, not unique products. A product with 3 colors counts as 3 items.

---

### Get Product Detail
`GET /products/{id}`

Returns full product with all color variants.

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "تیشرت مردانه",
  "description": "...",
  "price": 450000,
  "originalPrice": 550000,
  "mainImages": ["/uploads/products/..."],
  "colorVariants": [...],
  "category_ids": ["..."],
  "brand_id": "...",
  "brand": "Nike",
  "attributes": [{ "name": "جنس", "value": "نخ" }],
  "inStock": true,
  "average_rating": 4.5,
  "review_count": 12
}
```

---

## Homepage

### Get Hero Images
`GET /hero-images`

Returns active hero images sorted by display order.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `device` | string | `desktop` or `mobile` |

**Response:**
```json
{
  "heroImages": [
    {
      "id": "...",
      "image": "/uploads/hero/image.jpg",
      "deviceType": "desktop",
      "isActive": true,
      "gradient": "linear-gradient(...)",
      "noGradient": false,
      "displayOrder": 1
    }
  ]
}
```

---

### Get Sliders
`GET /sliders`

Returns all slider items for homepage carousel.

**Response:**
```json
[
  {
    "id": "...",
    "title": "فروش ویژه",
    "subtitle": "تا ۵۰٪ تخفیف",
    "description": "...",
    "image": "/uploads/sliders/...",
    "buttonText": "مشاهده",
    "buttonLink": "/products?is_flash_sale=true",
    "badge": "جدید",
    "bgColor": "#1a1a2e",
    "accentColor": "#e94560",
    "discount": "50%",
    "features": ["ارسال رایگان", "گارانتی"],
    "stats": { "items": "۱۰۰+", "brands": "۲۰+", "reviews": "۵۰۰+" },
    "isActive": true
  }
]
```

---

## Categories

### List Categories
`GET /categories`

**Response:**
```json
[
  {
    "id": "...",
    "name": "پوشاک مردانه",
    "slug": "mens-clothing",
    "description": "...",
    "image": "/uploads/categories/...",
    "parent_id": "...",
    "is_active": true,
    "show_in_header": true
  }
]
```

---

### Get Category by ID
`GET /categories/{id}`

---

## Brands

### List Brands
`GET /brands`

**Response:**
```json
[
  {
    "id": "...",
    "name": "Nike",
    "slug": "nike",
    "logo": "/uploads/brands/...",
    "description": "...",
    "productsCount": 25,
    "featuredProduct": "کفش ورزشی"
  }
]
```

---

### Get Brand by ID
`GET /brands/{id}`

---

## Static Images

Images are served directly by Nginx from `/uploads/` path.

**Image Paths:**
- Products: `/uploads/products/...`
- Categories: `/uploads/categories/...`
- Brands: `/uploads/brands/...`
- Hero: `/uploads/hero/...`
- Sliders: `/uploads/sliders/...`

**Nginx Config:**
```nginx
location /uploads/ {
    alias /app/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

## Error Response Format

All errors return:
```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- `400` - Bad request / Invalid parameters
- `404` - Resource not found
- `500` - Server error
