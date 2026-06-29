# Voucher Validation on Cart Item Removal

## Problem
When a user removes a product from the cart, there's no check whether the active voucher (promo code) would still be valid. Also, `used_count` for admin discounts is never incremented/decremented, and negotiated coupons' `used` flag is never reverted on removal.

## Requirements
1. When user tries to remove a product while a voucher is active, check if the voucher would still be valid after removal (client-side)
2. If valid → simple confirmation: "آیا از حذف {productName} مطمئن هستید?" + two buttons
3. If not valid → warning: "با حذف این محصول، کد تخفیف {code} غیرفعال خواهد شد" + two buttons
4. If user confirms removal and voucher is invalidated → remove voucher + decrement usage
5. Increment usage when voucher is applied (both types), decrement when removed

## Backend Changes

### 1. New endpoint: `POST /api/discounts/activate`
**File:** `handlers/discounts.go`

Increments usage when a voucher is applied to the cart.

```
Request: { "code": "SUMMER20" } or { "code": "TRYN-XXXXXXXX" }
Logic:
  - Look up in `discounts` → $inc: { used_count: 1 }
  - If not found, look up in `negotiated_coupons` → $set: { used: true }
Response: { "success": true }
```

### 2. New endpoint: `POST /api/discounts/deactivate`
**File:** `handlers/discounts.go`

Decrements usage when a voucher is removed from the cart.

```
Request: { "code": "SUMMER20" } or { "code": "TRYN-XXXXXXXX" }
Logic:
  - Look up in `discounts` → $inc: { used_count: -1 } + $max: { used_count: 0 }
  - If not found, look up in `negotiated_coupons` → $set: { used: false }
Response: { "success": true }
```

### 3. Modify `ApplyNegotiatedCoupon`
**File:** `handlers/coupon_negotiation.go`

- Remove `used: true` mark (line 238-241) — now handled by `activate` endpoint
- Add `product_ids` to response (line 247) — needed for client-side validation

### 4. Add routes
**File:** `routes/routes.go`

```go
api.HandleFunc("/discounts/activate", handlers.ActivateDiscount).Methods(http.MethodPost)
api.HandleFunc("/discounts/deactivate", handlers.DeactivateDiscount).Methods(http.MethodPost)
```

## Frontend Changes

### 1. Extend `PromoCode` interface
**File:** `front_end/src/types/cart.ts`

Add two new fields:
- `type?: "admin" | "negotiated"` — distinguish voucher type
- `productIds?: string[]` — for negotiated coupons, the products the coupon is tied to

### 2. Modify `applyPromoCode` in cart store
**File:** `front_end/src/store/cart-store.ts` (line 777)

After setting `promoCode.isValid = true`:
- Add `type: "admin"` to the promoCode state
- Call `POST /api/discounts/activate` (fire-and-forget)

### 3. Modify `applyNegotiatedDiscount` in cart store
**File:** `front_end/src/store/cart-store.ts` (line 784)

- Add `type: "negotiated"` and `productIds` to the promoCode state
- Call `POST /api/discounts/activate` (fire-and-forget)
- Update function signature (line 165) to accept `productIds`

### 4. Modify `removePromoCode` in cart store
**File:** `front_end/src/store/cart-store.ts` (line 801)

Before clearing state, call `POST /api/discounts/deactivate` (fire-and-forget).

### 5. Client-side validation in cart page
**File:** `front_end/src/app/(shop)/cart/page.tsx`

Add `willVoucherSurvive(item: CartItem)` helper:
- **Admin discounts:** check `remainingSubtotal >= promoCode.minPurchase`
- **Negotiated coupons:** check if `item.productId` is NOT in `promoCode.productIds`

### 6. Modify `handleRemoveItem` in cart page
**File:** `front_end/src/app/(shop)/cart/page.tsx` (line 89)

New flow:
- If voucher is active → call `willVoucherSurvive()` → show appropriate modal
- If no voucher → remove directly (current behavior)

### 7. Create `ConfirmRemoveModal` component
**File:** `front_end/src/components/ui/ConfirmRemoveModal.tsx` (new)

Uses existing `Modal` component. Two variants:
- **Simple** (`willInvalidate=false`): "آیا از حذف {productName} مطمئن هستید?"
- **Warning** (`willInvalidate=true`): "با حذف این محصول، کد تخفیف {code} غیرفعال خواهد شد"

## Execution Order

1. Backend: `ActivateDiscount` + `DeactivateDiscount` + routes
2. Backend: Modify `ApplyNegotiatedCoupon` (remove `used: true`, add `product_ids`)
3. Frontend: Extend `PromoCode` type
4. Frontend: Create `ConfirmRemoveModal` component
5. Frontend: Modify cart store functions
6. Frontend: Modify cart page
7. Build + deploy
