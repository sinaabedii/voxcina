# Notifications — what the Go backend needs

The Android app side is done and shipped in this branch. This file is the
contract it was written against, so that `../shop` can be built to match.

**Nothing in `../shop` has been modified.** It is read-only ground truth; this
document is the request.

---

## 0. The one thing to understand first

**FCM is not the delivery mechanism. The inbox is.**

Push delivery cannot be *guaranteed* by FCM: a minority of devices in this
market genuinely have no Play Services (some Huawei/Fire units, MicroG
setups), Google throttles and deprioritises background delivery, and even a
device with Play Services only gets a push when its network and battery state
allow it. So the app treats a push as *a hint that a row exists*, and the
row itself is what it renders:

```
                          ┌──────────────────────┐
  business event  ───────▶│  notifications coll. │◀── GET /users/notifications
  (order shipped, …)      │  one row per user    │        (the actual delivery)
                          └──────────┬───────────┘
                                     │
                                     ▼  (optimisation, Play Services only)
                          ┌──────────────────────┐
                          │  push outbox + FCM   │
                          └──────────────────────┘
```

Two rules fall straight out of this and are not negotiable on the app side:

1. **Write the inbox row before sending the push.** The app marks a row read
   when the user taps the notification, using the id carried in the payload. A
   push naming a row that does not exist yet produces a 404 on that write.
2. **Send data-only FCM messages.** A message containing a `notification` block
   is drawn by Play Services itself while the app is backgrounded, which means
   `onMessageReceived` is never called — the tap cannot be routed, the badge
   does not move, and the Persian channel is not used. Put *everything* in
   `data`. See `push/VoxcinaMessagingService.kt`.

The app polls `GET /users/notifications?unread_only=true` every 15 minutes in
the background and once on every app open, so a device that never receives a
push still gets everything, just later.

---

## 1. Endpoints the app already calls

All under `/api/users`, all behind `middlewares.AuthMiddleware`. See
`data/remote/NotificationApi.kt` for the exact Retrofit definitions.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/users/notifications?unread_only=&page=&limit=` | The inbox, newest first |
| `GET` | `/users/notifications/unread-count` | Badge only — called often, keep it cheap |
| `POST` | `/users/notifications/{id}/read` | Idempotent; re-reading answers 200 |
| `POST` | `/users/notifications/read-all` | |
| `DELETE` | `/users/notifications/{id}` | Removes from this user's inbox |
| `POST` | `/users/devices` | Register/refresh this install's push token |
| `DELETE` | `/users/devices/{installId}` | Sign-out; 404 is treated as success |
| `GET` | `/users/notification-preferences` | |
| `PUT` | `/users/notification-preferences` | Returns the saved state |

### Response shapes

`GET /users/notifications`:

```json
{
  "notifications": [
    {
      "id": "65f0a1b2c3d4e5f6a7b8c9d0",
      "type": "order_status_changed",
      "audience": "user",
      "title": "سفارش شما ارسال شد",
      "body": "سفارش ۱۴۰۴-۱۲۳ تحویل پست شد",
      "image": "/uploads/campaigns/nowruz.jpg",
      "target_type": "order_detail",
      "target_id": "65f0a1b2c3d4e5f6a7b8c9d0",
      "target_extra": "",
      "is_read": false,
      "created_at": "2026-09-14T09:12:00Z"
    }
  ],
  "unread_count": 3,
  "pagination": { "current_page": 1, "total_pages": 2, "total_count": 34, "page_size": 30 }
}
```

Notes that matter:

- `unread_count` rides on every list response, so opening the inbox corrects the
  badge for free. `total_count` is the count across **every** page matching the
  filter, like the returns endpoint — not the length of the array.
- Pagination keys are `snake_case` here. The orders endpoint uses camelCase;
  they genuinely differ, and the app has separate DTOs for that reason.
- `image` is a **relative** upload path like every other image the backend
  returns; the app prefixes `https://voxcina.com`. An absolute URL is passed
  through untouched.
- `created_at` is RFC3339. The app formats Jalali dates and relative times
  itself — send ISO, never Persian digits.
- **Errors go in `error`, not `message`** (`utils.ErrorResponse` already does
  this). The app reads `error ?: message`.

### `POST /users/devices`

```json
{
  "token": "fMEp…",           // null when the device has no Play Services
  "platform": "android",
  "push_provider": "fcm",     // or "none"
  "app_version": "1.0",
  "install_id": "a3f1…",      // random UUID, stable for the install
  "locale": "fa-IR"
}
```

`install_id` is the **upsert key**, not the token. FCM rotates tokens; keying on
the token accumulates a dead row per rotation and the user eventually receives
everything several times. Upsert on `(install_id)` and store `user_id` on the
row.

`push_provider: "none"` is a real, expected value, not a client bug. It means
*this install can never be pushed to* — record it and skip it when fanning out,
rather than spending a send and a failure on it every time.

---

## 2. Collections

### `notifications` — one row per recipient

A broadcast is **fanned out into one row per user**, not stored once and joined.
That is what makes `is_read`, per-user deletion and the unread count a single
indexed query instead of a read-marker table.

```go
type Notification struct {
    ID       primitive.ObjectID `bson:"_id,omitempty"   json:"id,omitempty"`
    UserID   primitive.ObjectID `bson:"user_id"         json:"-"`
    Type     string             `bson:"type"            json:"type"`
    Audience string             `bson:"audience"        json:"audience"`

    Title string `bson:"title"           json:"title"`
    Body  string `bson:"body"            json:"body"`
    Image string `bson:"image,omitempty" json:"image,omitempty"`

    // Deep link: a destination NAME and its arguments. Never a route. See §5.
    TargetType  string `bson:"target_type,omitempty"  json:"target_type,omitempty"`
    TargetID    string `bson:"target_id,omitempty"    json:"target_id,omitempty"`
    TargetExtra string `bson:"target_extra,omitempty" json:"target_extra,omitempty"`

    IsRead bool       `bson:"is_read"          json:"is_read"`
    ReadAt *time.Time `bson:"read_at,omitempty" json:"-"`

    // Set on rows created by a campaign, so one send can be reported on.
    CampaignID *primitive.ObjectID `bson:"campaign_id,omitempty" json:"-"`

    CreatedAt time.Time `bson:"created_at" json:"created_at"`
    // TTL index target — see below.
    ExpiresAt time.Time `bson:"expires_at" json:"-"`
}
```

Indexes:

- `{user_id: 1, created_at: -1}` — the inbox query.
- `{user_id: 1, is_read: 1}` — the unread count and the `unread_only` filter.
- `{expires_at: 1}` with `expireAfterSeconds: 0` — a TTL index. Fanning a
  campaign out to every user writes a row per user per campaign; without
  retention this collection becomes the largest in the database. 90 days is a
  reasonable default, and the app does not paginate past one page of 50 anyway.
- `{campaign_id: 1}` — for the dashboard's per-campaign read stats.

### `user_devices`

```go
type UserDevice struct {
    ID           primitive.ObjectID `bson:"_id,omitempty"`
    UserID       primitive.ObjectID `bson:"user_id"`
    InstallID    string             `bson:"install_id"`    // unique
    Token        string             `bson:"token,omitempty"`
    Platform     string             `bson:"platform"`      // "android"
    PushProvider string             `bson:"push_provider"` // "fcm" | "none"
    AppVersion   string             `bson:"app_version"`
    Locale       string             `bson:"locale"`
    // Cleared on sign-out; a row with no user is not pushed to.
    LastSeenAt time.Time `bson:"last_seen_at"`
    CreatedAt  time.Time `bson:"created_at"`
    UpdatedAt  time.Time `bson:"updated_at"`
}
```

Unique index on `install_id`; plain index on `user_id`.

When FCM answers `UNREGISTERED` or `INVALID_ARGUMENT` for a token, **delete the
row**. That is the only way a reinstalled or wiped device stops costing sends.

### `notification_preferences`

Five booleans keyed by `user_id`, defaulting to **true** — transactional
notifications are opt-out, not opt-in:

```
orders | payments | support | offers | announcements
```

These mirror the app's five Android channels one-for-one
(`domain/model/NotificationModels.kt`, `NotificationChannelKind`). Consult them
*before enqueuing*: a muted category must not produce an inbox row or a push.

### `notification_campaigns` (dashboard)

Holds what an admin composed — audience rule, copy, target, schedule, and
counters for fanned-out / delivered / read. The fan-out job reads it; the
dashboard reports off it.

---

## 3. The dispatcher

**Reuse the shape already in `services/outbound_webhooks.go`.** It is the right
pattern and it is already proven in this codebase: an outbox row written in the
same request as the business change, a background poller with exponential
backoff, a bounded batch, and auto-disable on repeated failure.

A `push_outbox` collection mirroring `models.OutboundEvent` (`pending` /
`delivered` / `failed`, `attempts`, `next_attempt_at`, `last_error`,
`OutboundEventMaxAttempts`), and a dispatcher goroutine started the same way,
gives:

- Business handlers that never block on FCM.
- Retries for free when Google is unreachable — which, from Iranian
  infrastructure, is a routine condition rather than an exception. **The FCM
  send almost certainly needs to go through the same outbound proxy the rest of
  the backend uses** (`services/email_service.go` already mentions one); plan
  for the send to fail often and the outbox to carry it.
- One place to enforce "inbox row first, push second".

Use **FCM HTTP v1** (`https://fcm.googleapis.com/v1/projects/{id}/messages:send`)
with a service-account JSON and OAuth2 — the legacy server key is gone. Batch by
token; FCM v1 has no true multicast, so fan out with bounded concurrency.

Message shape:

```json
{
  "message": {
    "token": "…",
    "data": {
      "notification_id": "65f0…",
      "type": "order_status_changed",
      "title": "سفارش شما ارسال شد",
      "body": "سفارش ۱۴۰۴-۱۲۳ تحویل پست شد",
      "image": "/uploads/…",
      "target_type": "order_detail",
      "target_id": "65f0…",
      "target_extra": ""
    },
    "android": { "priority": "high" }
  }
}
```

No `notification` key. See §0.

---

## 4. Where events come from

The four audience kinds the app models (`NotificationAudience`) map onto four
ways of producing rows.

### Event-driven, user-specific — the bulk of the value

Each of these already has a handler that knows the moment it happened. Most sit
right next to an existing `BroadcastOutboundEvent` call, so the enqueue is a
one-line addition at a site that is already doing this kind of work.

| Trigger | `type` | `target_type` / `target_id` |
|---|---|---|
| Order created | `order_placed` | `order_detail` / order id |
| `UpdateOrderStatusAdmin` (`handlers/orders.go`) | `order_status_changed` | `order_detail` / order id |
| Payment verified (`handlers/payment.go`, `snappay.go`) | `payment_succeeded` | `order_detail` / order id |
| Payment failed | `payment_failed` | `order_detail` / order id |
| Return approved/rejected (`handlers/return_requests.go`) | `return_decided` | `order_detail` / order id |
| Admin replies to a ticket (`handlers/tickets.go`) | `ticket_replied` | `ticket_detail` / ticket id |
| Agent replies in the try-on room | `tryon_reply` | `tryon` |
| Voucher granted (`handlers/vouchers.go`) | `voucher_granted` | `vouchers` |
| Negotiated / cart-recovery coupon offered | `coupon_offer` | `cart` / the code |

### Scheduled, user-specific

Cron-style jobs over existing data:

- `voucher_expiring` — vouchers expiring in ~48 h → `vouchers`
- `cart_reminder` — a cart untouched for N hours → `cart`

`handlers/cart_recovery.go` already has the cart-abandonment notion; reuse its
window rather than inventing a second one.

### Segment — "a specific section of users"

The dashboard composes an audience **rule**, and a fan-out job resolves it to
user ids at send time. Rules worth supporting first, because the data already
exists:

- Bought in the last N days / never bought
- Has an abandoned cart
- Owns an unused voucher
- Favourited a given product (`handlers/wishlist.go`) → `price_drop`,
  `back_in_stock`
- City / province (`users.addresses`)
- Last app-open within N days (`handlers/user_activity_handler.go`)

`price_drop` and `back_in_stock` are the two that pay for the whole segment
engine: both are a product-side change joined against the wishlist, and both
carry `target_type: "product_detail"` with the product id and colour hex.

### Broadcast

`promotion` and `announcement`, fanned out to every active user. Do this in
batches on a worker, not in the admin's request — it is one row per user.

---

## 5. The deep-link contract — please do not "improve" this

The wire carries `target_type` + `target_id` + `target_extra`. **It must never
carry a route or a URL.** The app resolves the name to a route itself through a
closed `when` (`push/NotificationDeepLink.kt`); anything it does not recognise
becomes inert rather than a guess.

This is deliberate. A payload field naming its own destination would let anyone
who can reach the FCM sender — or forge an intent extra on the device — steer
the app to an arbitrary screen with arbitrary arguments. That is Android intent
redirection, arriving by way of push. `NotificationTargetTest` pins it.

Valid `target_type` values, with what goes in `target_id` / `target_extra`:

| `target_type` | `target_id` | `target_extra` |
|---|---|---|
| `home`, `returns`, `tickets`, `vouchers`, `collection`, `tryon`, `notifications` | — | — |
| `orders` | an `OrderStatus` value, or empty for unfiltered | — |
| `order_detail` | order id | — |
| `ticket_detail` | ticket id | — |
| `cart` | a voucher code to auto-apply, or empty | — |
| `product_detail` | product id | colour hex |
| `products` | category id, or empty | — |

Two degradations are intentional and already tested: `order_detail` with a blank
id opens the orders list, and an `orders` status outside `OrderStatus` opens the
**unfiltered** list rather than silently filtering to `pending`.

Adding a new type is safe at any time — an app that predates it renders the row
with the server's title and body under `NotificationType.UNKNOWN`. Adding a new
**target** is also safe: older apps make it non-tappable.

---

## 6. Admin dashboard

Under `/api/admin`, behind the existing staff/admin gates, and a page under
`front_end/src/app/(admin)/admin/notifications` alongside the other resources:

- **Compose**: type, audience (all / segment / one user), Persian title and body,
  optional image, target picker (a dropdown of the §5 vocabulary, with an id
  field that validates against the chosen kind), send now or schedule.
- **Audience preview**: resolve the rule and show the count *before* sending.
  Fanning a mistake out to every user writes a row each and cannot be recalled.
- **History**: per campaign — fanned out, pushed, delivered, read.
- **Templates** for the recurring campaigns, so copy is not retyped.
- **Per-user view** on the existing user detail page: what they were sent and
  whether they read it. This is the first thing support will ask for.

Reuse `config/ai_prompts.json`-style externalised copy for the event-driven
templates, so changing "سفارش شما ارسال شد" is not a deploy.

---

## 7. Checklist

- [ ] `notifications`, `user_devices`, `notification_preferences`,
      `notification_campaigns` collections + indexes (incl. the TTL index)
- [ ] The nine `/users/**` endpoints in §1
- [ ] `push_outbox` + dispatcher, modelled on `services/outbound_webhooks.go`
- [ ] FCM HTTP v1 client with a service account, through the outbound proxy
- [ ] Delete device rows on `UNREGISTERED` / `INVALID_ARGUMENT`
- [ ] Preferences consulted before enqueuing
- [ ] Enqueue calls at the §4 event sites
- [ ] Scheduled jobs: `voucher_expiring`, `cart_reminder`
- [ ] Segment resolver + fan-out worker
- [ ] Admin endpoints + dashboard page
- [ ] A Firebase project, and `app/google-services.json` handed to the app team

---

## 8. Notes for whoever picks this up

- `POST /users/devices` is called on every app open, but only sends a request
  when the token or the signed-in user actually changed — so it is not a
  per-launch write.
- The app sends `X-Client-Platform: android` on everything
  (`ClientHeaderInterceptor`), which is a free way to tell app traffic from web.
- The app never asks for "public" notifications separately. A broadcast is
  fanned out into per-user rows, so a signed-out device has no inbox at all —
  which is also why signing out must not leave the previous user's rows
  reachable.
- `DELETE /users/devices/{installId}` is sent *before* the app clears its
  tokens, so it arrives with a valid credential. It is best effort: a phone with
  no signal signs out anyway, and the device row will be cleaned up when a push
  to it bounces.
