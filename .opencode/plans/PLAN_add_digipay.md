# Plan: Adding DigiPay Payment Gateway to Voxcina

## Overview

DigiPay (mydigipay.com) is an Iranian smart payment gateway (UPG/IPG) routing through multiple Shaparak PSPs. It uses OAuth 2.0 authentication and a ticket-based purchase flow.

---

## Confirmed DigiPay API

| Operation | Method | Endpoint | Notes |
|-----------|--------|----------|-------|
| Auth | POST | `/digipay/api/oauth/token` | Basic Auth `base64(client_id:client_secret)`, form-data body |
| Create Ticket | POST | `/digipay/api/tickets/business?type=11` | Bearer token, `Agent: WEB`, `Digipay-Version` header |
| Verify | POST | `/digipay/api/purchases/verify/{ticket}?type={from_callback}` | Ticket in **path**, empty body |
| Inquiry | GET | `/digipay/api/orders/{ticket}` | Ticket in path |
| Deliver | POST | `/digipay/api/purchases/deliver?type={type}` | After verify |
| Refund | POST | `/digipay/api/refunds?type={type}` | body: `{amount, providerId, saleTrackingCode}` |

### Type Parameter Clarification

- **Ticket creation**: `?type=11` = UPG business type. **Always constant 11**.
- **Callback response**: includes `type` field: `0`=IPG, `11`=Wallet, `5`=Credit, `13`=BNPL, `24`=Credit-Card (Table 18 in docs)
- **Verify**: `?type={type_from_callback}` — must match the callback's type. For standard card payment: `0`.

### Callback Semantics

DigiPay performs a **browser form POST** to the callback URL (user's browser auto-submits a form). Our handler:
1. Accepts POST form data
2. Extracts `providerId` to identify the attempt — **never trusts callback data as proof of payment**
3. Calls verify API (only authoritative source)
4. Responds with `303 See Other` → frontend callback page

---

## Critical Implementation Rules

| # | Rule | Enforcement |
|---|------|------------|
| 1 | **Amount derived server-side** | `RequestPayment` reads `order.TotalAmount * 10`. Remove `amount` from all client→server DTOs. |
| 2 | **Amount verification strict equality** | `FinalizeVerifiedPayment`: `verifiedAmount != expectedAmount` → reject with error. No warning-accept. |
| 3 | **Callback never trusted as proof** | Only use callback to identify the attempt. Verification comes **only** from verify API. |
| 4 | **Retry = new attempt** | Each retry creates fresh `PaymentAttempt` with new UUID `providerId`. Never overwrites previous data. |
| 5 | **DB write error = fail** | `FinalizeVerifiedPayment` returns error if atomic transition fails. Handler redirects with error. |
| 6 | **Verify type = callback type** | Store callback's `type` field on attempt, pass to verify. Not hardcoded. |

---

## Data Models

### NEW: `models/payment_attempt.go` — PaymentAttempt

```go
type PaymentAttempt struct {
    ID                 primitive.ObjectID `bson:"_id"`
    OrderID            primitive.ObjectID `bson:"order_id"`
    UserID             primitive.ObjectID `bson:"user_id"`
    Gateway            string             `bson:"gateway"`            // "zibal" | "digipay"
    ProviderID         string             `bson:"provider_id"`        // UUID, unique per attempt
    GatewayReference   string             `bson:"gateway_reference"`  // trackId (zibal) or ticket (digipay)
    GatewayRefNumber   string             `bson:"gateway_ref_number"` // set after verification
    ExpectedAmount     int64              `bson:"expected_amount"`    // Rials, server-derived
    Status             string             `bson:"status"`             // "pending" | "verified" | "failed"
    CallbackType       int                `bson:"callback_type"`      // type from callback (for verify)
    GatewayData        bson.M             `bson:"gateway_data,omitempty"`
    CreatedAt          time.Time          `bson:"created_at"`
    VerifiedAt         *time.Time         `bson:"verified_at,omitempty"`
}

// Indexes:
// - Unique: { gateway: 1, provider_id: 1 }
// - Unique: { gateway: 1, gateway_reference: 1 }
// - { order_id: 1, status: 1 }
```

### UPDATE: `models/order.go` — Minimal field

```go
// Add alongside existing zibal fields (backward compat):
GatewayName string `bson:"gateway_name,omitempty" json:"gateway_name,omitempty"`
// Keep zibal_track_id, zibal_ref_number as-is for existing orders
```

---

## Services Layer

### NEW: `services/payment_gateway.go` — Interface

```go
type PaymentGateway interface {
    Name() string
    RequestPayment(ctx context.Context, req *PaymentRequest) (*PaymentResponse, error)
    VerifyPayment(ctx context.Context, req *VerifyRequest) (*VerifyResponse, error)
    InquiryPayment(ctx context.Context, req *InquiryRequest) (*InquiryResponse, error)
}

type PaymentRequest struct {
    OrderID     string
    Amount      int64    // Derived by backend, Rials
    CallbackURL string
    Description string
    Mobile      string   // cellNumber for DigiPay
    ProviderID  string   // UUID, set by backend
}

type PaymentResponse struct {
    GatewayRef string // ticket or trackId — set after RequestPayment
    PayURL     string // redirect user here
}

type VerifyRequest struct {
    GatewayRef     string // ticket or trackId
    ExpectedAmount int64
    ProviderID     string // for DigiPay
    CallbackType   int    // for DigiPay (from callback)
}

type VerifyResponse struct {
    Success    bool
    RefNumber  string
    Amount     int64
    GatewayRef string
}
```

### NEW: `services/digipay_service.go` — Implementation

- **Token caching**: `singleflight.Group` for deduplicated refreshes, `sync.RWMutex` for reads. Refresh proactively within 5 min of expiry.
- **Auth**: `POST /oauth/token` with `Basic base64(client_id:client_secret)` header + form-data body `{username, password, grant_type:password}`.
- **RequestPayment**: `POST /tickets/business?type=11`. Body: `{cellNumber, amount, providerId, callbackUrl}`.
- **VerifyPayment**: `POST /purchases/verify/{ticket}?type={type}`. Empty body. Ticket in URL path.
- **InquiryPayment**: `GET /orders/{ticket}`.
- **Configurable**: `DIGIPAY_API_VERSION` env var (default `2022-02-02`).

---

## Handler Layer

### REWRITE: `handlers/payment.go`

**`RequestPayment`**:
1. Validate auth, find order
2. **Derive amount from order**: `amountRials = int64(order.TotalAmount * 10)` — ignore client
3. Generate `providerID = uuid.New()`
4. Create `PaymentAttempt{status: "pending", expected_amount: amountRials, gateway: req.Gateway, provider_id: providerID}`
5. Route to correct gateway service
6. Store `gateway_reference` on attempt
7. Return `{payUrl, gateway, paymentId}` (no `amount` in response)

**`DigipayPaymentCallback`** (NEW, public POST):
1. Parse POST form data: `{providerId, trackingCode, result, type, amount, rrn, psp}`
2. Find `PaymentAttempt` by `providerId`
3. **Do NOT check `result` field** — it's not authoritative
4. Call `DigipayService.VerifyPayment()` with `{ticket: trackingCode, type: callbackType}`
5. If verify succeeds: `FinalizeVerifiedPayment(attemptID, verifiedAmount)`
6. `303 See Other` → frontend callback page

**`FinalizeVerifiedPayment`** (NEW, shared):
```go
func FinalizeVerifiedPayment(attemptID primitive.ObjectID, verifiedAmount int64) error {
    // 1. Find attempt + verify amount == expectedAmount (strict)
    // 2. Atomic findOneAndUpdate: order {_id, payment_status: {$in: ["pending","failed","abandoned"]}}
    //    → {payment_status:"paid", status:"processing", ...}
    // 3. If no document matched → already paid (idempotent) or race condition → return error
    // 4. Update attempt: status="verified", verified_at, ref_number
    // 5. Return nil on success, error on any failure
}
```

**`RetryPayment`**:
1. Find order (not paid, not expired)
2. Create **new** `PaymentAttempt` with fresh `providerID` (UUID)
3. Route to gateway
4. Store new `gateway_reference` on the **new** attempt — never overwrites old

**`PaymentCallback`** (Zibal GET): Keep existing, update to use `PaymentAttempt` lookup.

**`VerifyPayment`**, **`InquiryPayment`**: Resolve gateway from attempt, dispatch to correct service.

---

## Routes

```go
// Keep existing:
// GET /api/payment/callback → handlers.PaymentCallback (Zibal)

// Add:
// POST /api/payment/digipay-callback → handlers.DigipayPaymentCallback (DigiPay, public)
```

---

## Frontend

### `front_end/src/lib/constants.ts`

```typescript
export const PAYMENT_GATEWAYS = [
  { id: "zibal", name: "زیبال", logo: "/images/payment/zibal.png", enabled: true },
  { id: "digipay", name: "دیجی‌پی", logo: "/images/payment/digipay.png", enabled: true },
  { id: "zarinpal", name: "زرین‌پال", logo: "/images/payment/zarinpal.png", enabled: false },
  { id: "mellat", name: "به‌پرداخت ملت", logo: "/images/payment/mellat.png", enabled: false },
];
```

### `front_end/src/types/order.ts`

```typescript
interface Order {
  // ...existing fields
  gateway_name?: 'zibal' | 'digipay';
}
```

### `front_end/src/hooks/usePayment.ts`

Remove `amount` from `requestPayment`:
```typescript
const requestPayment = async (
  orderId: string,
  gateway?: string,
  mobile?: string,
  description?: string
): Promise<PaymentRequestResponse | null>
```

### `front_end/src/app/(shop)/checkout/page.tsx`

1. Add state: `const [selectedGateway, setSelectedGateway] = useState("zibal");`
2. Pass to `PaymentMethods`:
```tsx
<PaymentMethods
  onSelectMethod={setSelectedPaymentMethod}
  selectedMethod={selectedPaymentMethod}
  onSelectGateway={setSelectedGateway}
  selectedGateway={selectedGateway}
/>
```
3. In `handlePlaceOrder()`, for online payment:
```typescript
const paymentResponse = await fetch("/api/payment/request", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    orderId: orderId,
    gateway: selectedGateway,
    mobile: selectedAddress.phoneNumber,
  }),
});
```
No `amount` in body — backend derives from order.

---

## Environment & Deployment

### `.env.example`

```env
# DigiPay Payment Gateway
DIGIPAY_CLIENT_ID=
DIGIPAY_CLIENT_SECRET=
DIGIPAY_USERNAME=
DIGIPAY_PASSWORD=
DIGIPAY_ENVIRONMENT=staging
DIGIPAY_API_VERSION=2022-02-02
```

### `docker-compose.yml`

Add all `DIGIPAY_*` vars to the `server` service environment section.

### `main.go`

```go
handlers.InitZibalService()
handlers.InitDigipayService()  // NEW
```

---

## File Manifest

### New Files (3)
| File | Purpose |
|------|---------|
| `services/payment_gateway.go` | Interface + shared types (no `GetPaymentURL`, no `amount` in request) |
| `services/digipay_service.go` | DigiPay client with `singleflight.Group` token cache |
| `models/payment_attempt.go` | PaymentAttempt model + indexes |

### Modified Files (10)
| File | Changes |
|------|---------|
| `models/order.go` | Add `gateway_name` field |
| `handlers/payment.go` | Gateway dispatch, server-derived amount, `FinalizeVerifiedPayment` (strict `==`), attempt-based retry |
| `routes/routes.go` | Add `POST /api/payment/digipay-callback` |
| `main.go` | Add `InitDigipayService()` |
| `.env.example` | Add `DIGIPAY_*` vars |
| `docker-compose.yml` | Add `DIGIPAY_*` env to server service |
| `front_end/src/lib/constants.ts` | Add `digipay` to `PAYMENT_GATEWAYS` |
| `front_end/src/types/order.ts` | Add `gateway_name` field |
| `front_end/src/hooks/usePayment.ts` | Remove `amount` param, add `gateway` param |
| `front_end/src/app/(shop)/checkout/page.tsx` | Wire gateway selection, pass `gateway` + `mobile` (no `amount`) |

---

## Implementation Order

1. `models/payment_attempt.go` — data model + indexes
2. `models/order.go` — add `gateway_name` field
3. `services/payment_gateway.go` — interface + shared types
4. `services/digipay_service.go` — DigiPay implementation
5. `handlers/payment.go` — refactor with gateway dispatch, `FinalizeVerifiedPayment`, `DigipayPaymentCallback`
6. `routes/routes.go` — add DigiPay callback route
7. `main.go` — init DigipayService
8. `.env.example` + `docker-compose.yml` — env vars
9. Frontend: constants → types → hook → checkout page
10. Audit: verify all 6 critical rules are enforced
