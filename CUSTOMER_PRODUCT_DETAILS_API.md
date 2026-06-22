# Customer Product Details APIs

Customer-facing endpoints for retrieving product information with color variants, sizes, and images.

---

## 1. Get Product Details

**URL:** `GET /api/products/{id}`

**Parameters:**
- `id` (path) - Product ObjectID

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "تی شرت کلاسیک",
  "description": "تی شرت 100% پنبه با کیفیت بالا",
  "price": 150000,
  "originalPrice": 200000,
  "mainImages": [
    "/uploads/products/main/507f-1702200000000-0.jpg",
    "/uploads/products/main/507f-1702200000001-1.jpg"
  ],
  "colorVariants": [
    {
      "color": "#FF5733",
      "colorName": "قرمز",
      "images": [
        "/uploads/products/variants/507f.../variant_0/images/image1.jpg",
        "/uploads/products/variants/507f.../variant_0/images/image2.jpg"
      ],
      "tryOnImage": "/uploads/products/variants/507f.../variant_0/tryon/tryon.jpg",
      "sizes": [
        {"size": "S", "sku": "SKU-001", "quantity": 3},
        {"size": "M", "sku": "SKU-002", "quantity": 5},
        {"size": "L", "sku": "SKU-003", "quantity": 0}
      ]
    },
    {
      "color": "#0000FF",
      "colorName": "آبی",
      "images": ["/uploads/products/variants/507f.../variant_1/images/image1.jpg"],
      "tryOnImage": null,
      "sizes": [
        {"size": "M", "sku": "SKU-004", "quantity": 2},
        {"size": "L", "sku": "SKU-005", "quantity": 12}
      ]
    }
  ],
  "brand": "Nike",
  "brand_id": "507f1f77bcf86cd799439012",
  "category_ids": ["507f1f77bcf86cd799439013"],
  "collection": "تابستان",
  "attributes": [
    {"name": "material", "value": "Cotton 100%"},
    {"name": "care", "value": "Machine Washable"}
  ],
  "is_flash_sale": false,
  "is_active": true,
  "inStock": true,
  "average_rating": 4.5,
  "review_count": 12,
  "created_at": "2024-12-10T10:00:00Z",
  "updated_at": "2024-12-10T10:00:00Z"
}
```

### UI Handling

**Image Gallery:**
- Combines `mainImages` + selected color's `images`
- Main images displayed first (shared across all colors)
- Color-specific images appended after
- Example: 2 main images + 3 color images = 5 total in gallery

**Color Selection:**
- Renders color buttons from `colorVariants` array
- Button color = `color` (hex code)
- Button label = `colorName` (Persian name)
- Disabled if all sizes have `quantity: 0`
- On selection: gallery resets to first image, size resets

**Size Selection:**
- Populated from selected color's `sizes` array
- Disabled if `quantity: 0`
- Shows "(ناموجود)" label for out-of-stock
- Max quantity selector = selected size's `quantity`

**Try-On Image:**
- Overlay button appears if `tryOnImage` exists for selected color
- Only visible for that specific color variant

**Stock Status:**
- `inStock` = true if any color+size has quantity > 0
- Color disabled if all its sizes are out of stock
- Size disabled if quantity = 0

---

## 2. List Products (Paginated)

**URL:** `GET /api/products`

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `sort` (string) - `newest`, `price-asc`, `price-desc`, `popular`, `discount`
- `search` (string) - Search by name/description
- `is_flash_sale` (bool)
- `in_stock` (bool)
- `brand` (string) - Brand name
- `brandId` (ObjectID)
- `categoryId` or `category` (ObjectID/string)

**Response:**
```json
{
  "data": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "colorVariant": {
        "color": "#FF5733",
        "colorName": "قرمز",
        "images": ["/uploads/products/variants/.../image1.jpg"],
        "tryOnImage": null,
        "sizes": [
          {"size": "M", "sku": "SKU-001", "quantity": 5},
          {"size": "L", "sku": "SKU-002", "quantity": 0}
        ]
      },
      "name": "تی شرت کلاسیک",
      "description": "...",
      "price": 150000,
      "originalPrice": 200000,
      "brand": "Nike",
      "brand_id": "507f1f77bcf86cd799439012",
      "category_ids": ["507f1f77bcf86cd799439013"],
      "collection": "تابستان",
      "is_flash_sale": false,
      "average_rating": 4.5,
      "review_count": 12,
      "created_at": "2024-12-10T10:00:00Z",
      "totalInventory": 5,
      "inStock": true
    }
  ],
  "pagination": {
    "totalPages": 5,
    "currentPage": 1,
    "nextPage": 2,
    "prevPage": null,
    "totalItems": 95
  }
}
```

### UI Handling

**List Item Display:**
- Each color variant is a separate list item
- Shows first image from `colorVariant.images`
- Displays `colorName` as color label
- Shows `totalInventory` (sum of all sizes)
- `inStock` = true if totalInventory > 0

**Product Card:**
- Click navigates to product detail page with color pre-selected
- URL: `/products/{productId}?color={colorName}`
- Discount badge if `originalPrice > price`

---

## 3. Search Products

**URL:** `GET /api/products/search?q=<query>`

**Query Parameters:**
- `q` (string) - Search term

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "تی شرت کلاسیک",
    "description": "...",
    "price": 150000,
    "originalPrice": 200000,
    "mainImages": [...],
    "colorVariants": [...],
    "brand": "Nike",
    "inStock": true,
    "average_rating": 4.5,
    "review_count": 12
  }
]
```

### UI Handling

- Returns full products (not color variants)
- Search matches product name and description
- Case-insensitive regex matching
- Empty array if no matches

---

## 4. Product Recommendations

**URL:** `GET /api/products/recommendations`

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "تی شرت کلاسیک",
    "price": 150000,
    "colorVariants": [...],
    "inStock": true
  }
]
```

### UI Handling

- Returns up to 5 products sorted by price (ascending)
- Used for "You might also like" sections
- Full product objects with all color variants

---

## 5. Smart Search (AI-Powered)

**URL:** `POST /api/search/smart`

**Payload:**
```json
{
  "query": "تی شرت قرمز برای تابستان",
  "user_id": "507f1f77bcf86cd799439014"
}
```

**Response:**
```json
{
  "ai_response": "برای شما این تی شرت‌های قرمز پیشنهاد می‌دهم...",
  "products": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "تی شرت کلاسیک",
      "colorVariants": [...],
      "price": 150000
    }
  ],
  "success": true,
  "is_ai_generated": true,
  "search_query": "تی شرت قرمز برای تابستان"
}
```

### UI Handling

- Displays AI response as conversational text
- Shows matched products below response
- `is_ai_generated` indicates if results are AI-enhanced
- Fallback to regular search if AI unavailable

---

## 6. Chat Recommendation (Conversational AI)

**URL:** `POST /api/chat/recommend`

**Payload:**
```json
{
  "message": "من یک تی شرت قرمز برای تابستان می‌خواهم",
  "user_id": "507f1f77bcf86cd799439014",
  "chat_id": "507f1f77bcf86cd799439015"
}
```

**Response:**
```json
{
  "response": "بر اساس درخواست شما، این محصولات را پیشنهاد می‌دهم...",
  "products": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "تی شرت کلاسیک",
      "colorVariants": [...],
      "price": 150000
    }
  ],
  "success": true,
  "is_ai_generated": true,
  "chat_id": "507f1f77bcf86cd799439015"
}
```

### UI Handling

- Conversational chat interface
- AI response displayed as chat message
- Products shown as cards below message
- Maintains chat history with `chat_id`
- Supports multi-turn conversation

---

## 7. Search Suggestions (AI-Enhanced)

**URL:** `GET /api/search/suggestions/smart?q=<query>`

**Query Parameters:**
- `q` (string, min 2 chars) - Search term

**Response:**
```json
[
  "تی شرت قرمز",
  "تی شرت آبی",
  "تی شرت کلاسیک",
  "تی شرت Nike"
]
```

### UI Handling

- Autocomplete dropdown suggestions
- Searches product names, descriptions, brands
- Deduplicates suggestions
- Returns empty array if query < 2 chars

---

## 8. Enhanced Recommendations (AI-Powered)

**URL:** `GET /api/products/smart-recommendations?q=<query>`

**Query Parameters:**
- `q` (string) - Search/recommendation query

**Response:**
```json
{
  "products": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "تی شرت کلاسیک",
      "colorVariants": [...],
      "price": 150000
    }
  ],
  "ai_response": "بر اساس جستجوی شما...",
  "is_ai_generated": true,
  "query": "تی شرت قرمز"
}
```

### UI Handling

- Falls back to regular recommendations if no query
- AI-enhanced if query provided
- Includes AI explanation of recommendations
- Full product objects with all variants

---

## 9. Products by Collection

**URL:** `GET /api/products/collection/{collectionValue}`

**Path Parameters:**
- `collectionValue` - One of: `بهار`, `تابستان`, `پاییز`, `زمستان`

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 20)

**Response:**
```json
{
  "data": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "colorVariant": {...},
      "name": "تی شرت کلاسیک",
      "collection": "تابستان",
      "totalInventory": 5,
      "inStock": true
    }
  ],
  "pagination": {
    "totalPages": 3,
    "currentPage": 1,
    "nextPage": 2,
    "prevPage": null,
    "totalProducts": 45
  },
  "collection": "تابستان"
}
```

### UI Handling

- Returns color variants as list items (like `/api/products`)
- Sorted by newest first
- Paginated results
- Collection name included in response

---

## Image Handling Summary

| Image Type | Location | Per Color | Shared | Max Count |
|-----------|----------|-----------|--------|-----------|
| Main Images | `mainImages` | No | Yes | 10 |
| Color Images | `colorVariant.images` | Yes | No | 5 |
| Try-On | `colorVariant.tryOnImage` | Yes | No | 1 |

**Gallery Flow:**
```
displayImages = mainImages + selectedColorVariant.images
```

**Image Paths:**
- Format: `/uploads/products/main/{filename}` or `/uploads/products/variants/{productId}/variant_{index}/{type}/{filename}`
- Use `unoptimized={true}` in Next.js Image component

---

## Size & Color Variant Flow

**User Interaction:**
1. View product details → all colors shown
2. Select color → gallery updates, sizes populate
3. Select size → quantity selector updates
4. Add to cart → validates color, size, quantity

**Data Structure:**
```
Product
├── colorVariants[]
│   ├── color (hex)
│   ├── colorName (Persian)
│   ├── images[]
│   ├── tryOnImage
│   └── sizes[]
│       ├── size (S, M, L, XL)
│       ├── sku (unique)
│       └── quantity (inventory)
```

**Stock Validation:**
- Color disabled if all sizes have quantity = 0
- Size disabled if quantity = 0
- Quantity selector max = selected size quantity
- Add to cart fails if quantity = 0

---

## Error Responses

| Status | Message | Cause |
|--------|---------|-------|
| 400 | "Product ID not provided" | Missing ID parameter |
| 400 | "Invalid product ID" | Malformed ObjectID |
| 404 | "Product not found" | Product doesn't exist or inactive |
| 500 | "Error fetching products" | Database error |

---

## Performance Tips

1. **Pagination:** Use `limit=20-50` for list endpoints
2. **Caching:** Cache product details for 5-10 minutes
3. **Images:** Compress before upload, use WebP format
4. **Search:** Debounce autocomplete requests (300ms)
5. **AI Endpoints:** 30-second timeout, show loading state
