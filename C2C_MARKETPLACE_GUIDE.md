# C2C Marketplace Implementation Guide

This document describes the Consumer-to-Consumer (C2C) marketplace implementation for the e-commerce platform.

## Overview

The platform has been transformed into a C2C marketplace where:
- **Customers** can browse and purchase products from multiple stores
- **Sellers** can register stores and list their products
- **Admins** can approve/reject stores and manage the marketplace

## Backend Changes

### 1. New Models

#### Store Model (`models/store.go`)
- Store information (name, description, logo, banner)
- Owner/seller reference
- Address and contact details
- Bank information for payouts
- Status: pending, approved, rejected, suspended
- Metrics: rating, review count, product count, total sales
- Commission rate (platform fee)

#### Updated Models
- **User** (`models/user.go`): Added `store_id` field and "seller" role
- **Product** (`models/product.go`): Added `store_id`, `store_name`, `seller_id` fields
- **Order** (`models/order.go`): Order items now include store information

### 2. New Handlers

#### Store Handlers (`handlers/stores.go`)
- `RegisterStore`: Allows customers to register as sellers
- `GetStore`: Public store details
- `GetMyStore`: Seller's own store
- `UpdateStore`: Update store information
- `ListStores`: Browse approved stores
- `GetStoreProducts`: Products from a specific store
- `AdminListStores`: Admin view of all stores
- `AdminUpdateStoreStatus`: Approve/reject stores
- `CanBecomeSeller`: Check if user can register as seller

#### Seller Product Handlers (`handlers/seller_products.go`)
- `AddSellerProduct`: Sellers add products to their store
- `ListSellerProducts`: View seller's products
- `UpdateSellerProduct`: Update product details
- `DeleteSellerProduct`: Soft delete products
- `GetSellerOrders`: View orders containing seller's products
- `GetSellerDashboard`: Dashboard with sales metrics

### 3. New Routes

#### Public Routes
```
GET  /api/stores                    - List approved stores
GET  /api/stores/{id}                - Get store details
GET  /api/stores/{id}/products       - Get store products
```

#### Authenticated Routes
```
POST /api/stores/register            - Register as seller
GET  /api/users/can-become-seller    - Check eligibility
```

#### Seller Routes (requires seller role)
```
GET  /api/seller/store               - Get my store
PUT  /api/seller/store               - Update my store
GET  /api/seller/products            - List my products
POST /api/seller/products            - Add product
PUT  /api/seller/products/{id}       - Update product
DELETE /api/seller/products/{id}     - Delete product
GET  /api/seller/orders              - View orders
GET  /api/seller/dashboard           - Dashboard stats
```

#### Admin Routes
```
GET  /api/admin/stores               - List all stores
PUT  /api/admin/stores/{id}/status   - Update store status
```

### 4. Middleware

Added `SellerAuthMiddleware` in `middlewares/auth.go` to protect seller-only routes.

### 5. Database Indexes

Created indexes in `db/store_indexes.go`:
- Store owner_id (unique)
- Store slug (unique)
- Store status and is_active
- Product store_id
- Order items store_id

## Frontend Changes

### 1. New Types (`front_end/src/types/store.ts`)
- `Store`: Store information
- `StoreRegistrationData`: Registration form data
- `SellerDashboardData`: Dashboard metrics
- `StoreStatus`: pending | approved | rejected | suspended

### 2. New Stores (Zustand)

#### Store Store (`front_end/src/store/store-store.ts`)
- Browse public stores
- Register new store
- Manage seller's store
- Fetch seller dashboard
- Admin store management

#### Seller Store (`front_end/src/store/seller-store.ts`)
- Manage seller products
- View seller orders
- Product CRUD operations

### 3. New Pages

#### Customer Pages
- `/stores` - Browse all stores
- `/stores/{slug}` - Store detail page (to be implemented)

#### Seller Pages
- `/dashboard/become-seller` - Store registration wizard
- `/dashboard/seller` - Seller dashboard
- `/dashboard/seller/store` - Store settings
- `/dashboard/seller/products` - Product management
- `/dashboard/seller/orders` - Order management

### 4. Updated Components

#### Sidebar (`front_end/src/components/layout/Sidebar.tsx`)
- Added seller menu section
- "Become a Seller" option for customers
- Seller-specific navigation items

## User Flows

### 1. Customer Becoming a Seller

1. Customer logs in
2. Navigates to "فروشنده شوید" (Become a Seller)
3. Fills out 3-step registration form:
   - Step 1: Store information (name, description, contact)
   - Step 2: Address details
   - Step 3: Bank information for payouts
4. Submits registration
5. Store status is "pending" awaiting admin approval
6. User role changes to "seller"

### 2. Seller Adding Products

1. Seller logs in
2. Goes to "محصولات من" (My Products)
3. Clicks "افزودن محصول جدید" (Add New Product)
4. Fills product form (name, price, images, variants, etc.)
5. Product is automatically linked to seller's store
6. Product appears in store's product list

### 3. Customer Purchasing from Store

1. Customer browses stores at `/stores`
2. Clicks on a store to view products
3. Adds products to cart
4. During checkout, order items include store information
5. Seller can view the order in their dashboard

### 4. Admin Approving Stores

1. Admin logs in
2. Goes to admin panel
3. Views pending stores
4. Reviews store information
5. Approves or rejects store
6. Seller is notified of status change

## Commission System

- Each store has a `commission_rate` (default: 10%)
- Platform takes commission from each sale
- Seller dashboard shows:
  - Total revenue
  - Net revenue (after commission)
  - Commission rate

## API Endpoints Summary

### Store Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/stores` | Public | List approved stores |
| GET | `/api/stores/{id}` | Public | Get store details |
| GET | `/api/stores/{id}/products` | Public | Store products |
| POST | `/api/stores/register` | User | Register store |
| GET | `/api/seller/store` | Seller | Get my store |
| PUT | `/api/seller/store` | Seller | Update store |
| GET | `/api/admin/stores` | Admin | List all stores |
| PUT | `/api/admin/stores/{id}/status` | Admin | Update status |

### Seller Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/seller/products` | Seller | List products |
| POST | `/api/seller/products` | Seller | Add product |
| PUT | `/api/seller/products/{id}` | Seller | Update product |
| DELETE | `/api/seller/products/{id}` | Seller | Delete product |
| GET | `/api/seller/orders` | Seller | View orders |
| GET | `/api/seller/dashboard` | Seller | Dashboard stats |

## Database Schema Changes

### Users Collection
```javascript
{
  role: "customer" | "admin" | "seller",
  store_id: ObjectId // Reference to stores (if seller)
}
```

### Stores Collection (New)
```javascript
{
  _id: ObjectId,
  owner_id: ObjectId, // Reference to users
  name: String,
  slug: String, // URL-friendly identifier
  description: String,
  logo: String,
  banner: String,
  phone: String,
  email: String,
  address: {
    province: String,
    city: String,
    address: String,
    postal_code: String
  },
  bank_info: {
    bank_name: String,
    account_number: String,
    iban: String,
    account_holder: String
  },
  rating: Number,
  review_count: Number,
  product_count: Number,
  total_sales: Number,
  status: "pending" | "approved" | "rejected" | "suspended",
  is_verified: Boolean,
  is_active: Boolean,
  commission_rate: Number,
  created_at: Date,
  updated_at: Date
}
```

### Products Collection
```javascript
{
  // ... existing fields
  store_id: ObjectId, // Reference to stores
  store_name: String, // Denormalized for quick access
  seller_id: ObjectId // Reference to seller user
}
```

### Orders Collection
```javascript
{
  items: [{
    // ... existing fields
    store_id: ObjectId,
    store_name: String,
    seller_id: ObjectId
  }]
}
```

## Security Considerations

1. **Store Registration**: Only authenticated customers can register
2. **Product Management**: Sellers can only manage their own products
3. **Order Access**: Sellers only see orders containing their products
4. **Admin Controls**: Store approval/rejection requires admin role
5. **Commission Protection**: Commission rate can only be changed by admins

## Future Enhancements

1. **Store Reviews**: Allow customers to review stores
2. **Seller Analytics**: Detailed sales reports and analytics
3. **Multi-vendor Cart**: Handle shipping from multiple stores
4. **Seller Messaging**: Direct communication between customers and sellers
5. **Seller Verification**: Enhanced verification process (documents, etc.)
6. **Payout System**: Automated payout processing
7. **Store Subscriptions**: Premium store features
8. **Seller Ratings**: Performance-based seller ratings

## Testing

To test the C2C marketplace:

1. **Register as Customer**: Create a customer account
2. **Become Seller**: Navigate to "Become a Seller" and complete registration
3. **Admin Approval**: Use admin account to approve the store
4. **Add Products**: As seller, add products to your store
5. **Browse Stores**: As customer, browse stores and products
6. **Place Order**: Purchase products from different stores
7. **View Orders**: Check orders in both customer and seller dashboards

## Deployment Notes

1. Ensure MongoDB indexes are created (run on first deployment)
2. Set up file upload directory permissions for store logos/banners
3. Configure commission rates in environment variables (optional)
4. Set up email notifications for store approval/rejection
5. Configure payment gateway for multi-vendor payouts

## Support

For questions or issues with the C2C marketplace implementation, please refer to:
- Backend API documentation
- Frontend component documentation
- Database schema documentation
