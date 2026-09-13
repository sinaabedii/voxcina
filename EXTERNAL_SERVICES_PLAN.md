# External Services & Identity Plan

Design and implementation plan for connecting external interfaces (Telegram, Bale,
Instagram, later others) to the storefront backend so external users can register
without a phone, build a cart, pay, and bind a phone only when it is actually needed
(shipping).

Status: design — not yet implemented.

Related: this document defines the architecture and the required modifications.
For the operator/developer onboarding steps see
[EXTERNAL_SERVICES_BINDING_GUIDE.md](EXTERNAL_SERVICES_BINDING_GUIDE.md).

---

## 1. Core model

**One principal, separate identities.** Every shopper gets a `users` document from
first contact (bot or site). It is the only ID space that carts, orders, payments,
and JWTs know. Channel accounts live in `external_identities` and point at it.

```
users: {
  _id, account_type: "external" | "registered" | "merged",
  phone: <absent for external>,          // partial unique index, non-empty only
  phone_verified_method: "telegram_contact" | "sms_otp",
  phone_verified_at, phone_verified_by_service: ObjectID?,
  password_hash: <absent for external>,
  name/first_name/last_name, addresses[...], token_version,
  signup_channel: "telegram" | "instagram" | "bale" | "web",
  merged_into: ObjectID?, merge_state: "idle"|"in_progress"|"done",
  is_active, created_at, updated_at, ...
}

external_identities: {
  _id, provider: "telegram"|"instagram"|"bale"|"whatsapp",
  external_id: "<platform user id>", user_id: ObjectID,
  profile_snapshot{...}, bot_ids: [...], status: "active"|"revoked",
  linked_via: "auto"|"contact"|"otp"|"code_link"|"admin",
  linked_at, last_seen_at, unlinked_at?
}
// unique (provider, external_id); index user_id

external_services: {
  _id, name: "Telegram Main Bot", provider: "telegram"|"bale"|"instagram",
  key_hash, key_prefix, key_last4,               // plaintext shown once, hash stored
  previous_key_hash?, previous_key_expires_at?,  // rotation grace window
  scopes: ["identity:exchange","identity:bind_phone"],
  phone_methods: ["telegram_contact"],           // capabilities; sms_otp allowed for all
  webhook: { url, secret_enc, events[], active },
  status: "active"|"disabled",
  created_by, created_at, updated_at, last_used_at
}
// unique key_hash; unique name

link_codes:      { code, user_id, expires_at (TTL), consumed_at? }
outbound_events: { type, user_id, payload, attempts, delivered_at, service_id }
otps:            { ..., user_id?, purpose: "signup"|"login"|"reset_password"|"bind_phone" }
```

### Invariants

1. Every JWT `user_id` points to an `is_active`, non-`merged` `users` row.
2. `(provider, external_id)` maps to at most one ACTIVE identity row (partial unique
   index on status). A revoked row never blocks a later re-contact: the channel
   account starts over with a fresh identity + shadow user, and the old account keeps
   its revoked row as the audit trail. Nothing re-activates the old link without the
   owner's fresh link code.
3. Data only moves `external -> registered`. Never back.
4. Only `registered` rows may carry a phone. A phone, once set, is immutable: no
   endpoint can change or remove it. Phone uniqueness applies among non-empty values.
5. The merge target is always the phone-verified account; a shadow never wins.
6. Merge is lock-guarded (stale lock takeover after 5 min), re-runnable, and commits
   the tombstone ONLY after every move succeeded — a failed move aborts the merge,
   releases the lock, and leaves the shadow untouched; the caller retries.
7. A revoked identity never re-activates without fresh proof (link code or phone bind).
8. A phone is verified by exactly one method. Telegram contact share and SMS OTP are
   alternatives, never stacked; `phone_verified_method` records which one won.
9. Account takeover over an external channel requires backend-verified proof. The
   contact path (self-attested by the bot) may only CLAIM a free phone; MERGING into
   an existing account is possible only through the SMS-OTP path (backend-sent code)
   with `merge: true`, or through the link-code flow (owner-minted code).

## 2. Phone binding policy

- **Telegram (and providers with a trusted contact primitive): contact share is the
  default and is sufficient.** Telegram verifies account phones; a `contact` update
  delivered to the bot is accepted only when `contact.user_id == message.from.id`,
  which proves the number belongs to the sender.
- **SMS OTP is the parallel option** for providers without contact share (Instagram),
  or when the user chooses to enter a different number manually.
- Both paths funnel into one internal `bindPhoneToUser(...)` and set the same fields;
  neither requires the other.
- **The identity phone is write-once.** `users.phone` can only be written while it is
  empty. There is no change-phone endpoint for users or admins. A bind attempt with a
  different number returns `409 phone_already_set` and must not send an SMS, run a
  verification, or merge.
- Binding verifies the **identity phone**. The **delivery phone**
  (`shipping_address.phone_number`) is collected separately at checkout and may differ.
- A user can provide any delivery phone number, per shipping address, without
  verification. That value is unrelated to the identity phone and never affects login.

## 3. Backend modifications

### 3.1 Middleware

`middlewares/service_auth.go` — `ServiceAuthMiddleware(scope)`:

- reads `X-API-Key`, hashes it, looks up `external_services` by `key_hash`;
- checks `status == active`, requested scope, and `provider == body.provider`;
- sets the service ID in the request context;
- updates `last_used_at` best-effort/throttled; applies a per-service rate limit.

### 3.2 Service-authenticated endpoints

| Endpoint | Scope | Behavior |
|---|---|---|
| `POST /api/auth/external/token` | `identity:exchange` | Find-or-create identity + shadow user; returns JWT pair, `is_new`, `has_phone` |
| `POST /api/auth/external/phone/contact` | `identity:bind_phone` | `{provider, external_id, phone, contact_user_id}`; backend enforces `contact_user_id == external_id` and `provider` match; normalizes phone; claim-in-place ONLY — no merge (self-attested contact must not claim an existing account) |
| `POST /api/auth/external/phone/send-otp` | `identity:bind_phone` | `{provider, external_id, phone}`; stores OTP pinned to the resolved user (`user_id`); sends SMS; generic 200 |
| `POST /api/auth/external/phone/verify-otp` | `identity:bind_phone` | `{provider, external_id, phone, code, merge?}`; OTP lookup pinned to `user_id`; code is burned only AFTER the bind lands, so the `phone_taken` consent retry consumes the SAME code; claim-in-place or merge |
| `POST /api/auth/external/link` | `identity:exchange` | `{provider, external_id, code, merge?}`; all validations (incl. the merge flag) run BEFORE the code is burned, and the burn is REFUNDED if the merge fails, so both the `MERGE_REQUIRED` consent retry and the `MERGE_INCOMPLETE` retry reuse the same code |

`bindPhoneToUser(ctx, userID, phone, method, serviceID, merge)`:

1. normalize with `utils.NormalizeIRPhone` (accepts `+98...`, `0098...`, `98...`,
   Persian digits, canonicalizes to `09xxxxxxxxx`; validated by `irPhoneRegex` in
   `handlers/auth_common.go`);
2. if the user already has a phone:
   - same value -> idempotent success (no verification, no write);
   - different value -> `409 {code:"phone_already_set"}`; do not send an OTP, do not
     accept a contact share, do not merge;
3. if the user has no phone, update with the partial-unique guard;
4. duplicate key means the phone belongs to a registered user ->
   `409 {can_merge:...}` — `can_merge:true` on the OTP path (ownership proven by the
   backend-sent code; retry with `merge:true`), `can_merge:false` + `merge_via:"sms_otp"`
   on the contact path (switch the user to the OTP flow);
5. set `phone`, `phone_verified_method`, `phone_verified_at`,
   `phone_verified_by_service`, `account_type: "registered"`.

Token issuance for external routes is pinned to the web refresh policy
(`externalClientPlatform()` in `handlers/external_auth.go`): a bot cannot mint the
Android 100-year non-rotating session by echoing `X-Client-Platform: android`.

### 3.3 User-facing endpoints

- `POST /api/users/link-code` — authenticated; returns a short-TTL one-time code and
  deep links for the enabled providers.
- `GET /api/users/linked-accounts`, `DELETE /api/users/linked-accounts/{id}` —
  unlink refused when the identity is the user's only login method
  (`account_type == "external"`).
- `PUT /api/users/password` — modify `handlers/users.go:479` `ChangePassword`: when the
  stored `PasswordHash` is empty, skip the current-password check and set the first
  password (JWT already authenticates the caller). No `token_version` bump / refresh
  revocation on initial set; keep existing behavior for real changes.
- Profile responses gain `has_password: true|false` (the hash itself is `json:"-"`).

### 3.4 Admin endpoints (AdminAuthMiddleware)

| Endpoint | Purpose |
|---|---|
| `GET /api/admin/external-services` | list |
| `POST /api/admin/external-services` | create; response carries the plaintext API key once |
| `PUT /api/admin/external-services/{id}` | edit name/scopes/webhook/status |
| `DELETE /api/admin/external-services/{id}` | disable/delete |
| `POST /api/admin/external-services/{id}/rotate-key` | new key, plaintext once; old key valid for the grace window |
| `POST /api/admin/external-services/{id}/webhooks/test` | delivery check |
| `GET /api/admin/external-services/{id}/audit` | key rotations, config changes |
| `GET /api/admin/external-services/{id}/identities` | linked identities |

### 3.5 Events / webhooks

`outbound_events` outbox with a dispatcher goroutine started from `main.go`:

- events: `payment.paid`, `payment.failed`, `order.status_changed`,
  `return_request.decided`, `identity.merged`;
- hook points where SMS is sent today: `handlers/payment.go:405`,
  `handlers/orders.go:531`, plus the payment callbacks;
- HMAC header `X-Signature: sha256=<...>` over the raw body, event id for idempotency,
  exponential retries, auto-disable webhook after N failures and flag it in admin;
- tenant scoping: a user-scoped event is delivered only to services of the providers
  the user actually has active identities for (`BroadcastOutboundEvent` joins
  `external_identities`); a pure-web shopper's events reach nobody;
- budget: one dispatcher pass delivers up to 20 events under a 2-minute budget with
  per-event windows capped by the remaining time — the loop stops early instead of
  letting tail events die on the context deadline;
- a pending event whose webhook is disabled/unconfigured is HELD (stays pending),
  never terminally failed — and it is also EXCLUDED from the delivery batch
  (`service_id $in` the live-webhook services), because a dead integration's
  backlog is the oldest pending set and would otherwise occupy every batch and
  starve the other webhooks. Held events deliver as soon as the webhook is
  re-enabled; the outbox TTL (keyed on `updated_at`, which holds never touch)
  sweeps them if it never is.

### 3.6 Merge engine

`services/identity_merge.go` — order of operations:

1. lock: `FindOneAndUpdate({_id: shadow, account_type:"external", $or:[
   {merge_state:{$ne:"in_progress"}}, {merge_started_at: <5min ago>}]}, {$set:
   {merge_state:"in_progress", merge_started_at: now}})` — stale takeover replaces
   the flag a crashed process can never release; abort on miss;
2. guard: `shadow != target`, target `account_type == "registered"` and active;
3. revoke shadow sessions (`RevokeAllForUser(shadow, bumpTokenVersion=true)`);
4. registry of `UpdateMany({user_id: shadow}, {$set:{user_id: target}})`: `orders`,
   `payment_attempts`, `negotiated_coupons`, `return_requests`, `tickets`,
   `tryon_chats`, `checkout_chats`, `chats`, `virtual_tryons`, `user_activities`;
   (wishlist has no storage and `product_metadata` is not a user collection —
   neither is in the registry);
5. custom mergers for unique-conflict collections: carts (merge items by
   product+variant, clamp to stock, one active cart; deactivate LAST so a retried
   merge re-folds with clamped quantities instead of losing carts), reviews (drop
   duplicates by product), addresses (append, dedupe, exactly one default; an empty
   target address book adopts the shadow's list wholesale);
6. re-point identities: `UpdateMany({user_id: shadow, status:"active"},
   {$set:{user_id: target}})`;
7. commit: shadow -> `account_type:"merged", merged_into: target, is_active:false,
   merge_state:"done"`, `token_version++`; write a merge-log row in
   `identity_merges` with counts.

Crash safety: the tombstone (step 7) is committed ONLY when steps 3–6 all succeeded.
Any failed move aborts the merge, releases the lock (deferred release stamped with
the merge's own `merge_started_at`, so a late release from a dying predecessor can
never clear a newer attempt's lock), and returns `ErrMergeIncomplete` — the shadow
stays a live external account and the caller retries; every step filters on the
shadow's user_id, so the retry only moves what is left. Self-healing: any request
that sees an identity pointing at a `merged` user follows `merged_into`, re-points,
and issues tokens for the target. Keep the collection registry in one place with a
test that asserts every model carrying `user_id` is listed.

## 4. Login and password after binding

- OTP login already works with no changes once `phone` is written: `SendLoginOTP`
  (`handlers/otp.go:592`) finds the user by phone, `VerifyLoginOTP`
  (`handlers/otp.go:697`) never touches the password, `LoginViaSMS`
  (`handlers/users.go:1567`) consumes the one-time grant and checks only `IsActive`.
- `POST /api/users/login` (phone + password) fails generically while the hash is empty
  (`handlers/users.go:205`); no crash, no special casing.
- Forgot-password (`ResetPasswordWithOTP`, `handlers/otp.go:789`) already lets a phone
  owner set a password without knowing the old one.

## 5. Admin page

`front_end/src/app/(admin)/admin/external-services/page.tsx` with components under
`front_end/src/components/admin/`:

- table: name, provider, status, key prefix/last4, last used, webhook status, linked
  identity count;
- create modal: name, provider, scopes, webhook URL/events, phone methods;
- **API key reveal modal, shown once**, copy button, warning;
- row actions: edit, rotate key (reveal once), enable/disable, test webhook, view
  identities, audit log;
- provider capability hint: `telegram` -> "contact share allowed"; providers without
  it -> "OTP only".

User-side profile page: connected accounts list, link-code generation, and a
"set password" form shown when `has_password == false`.

## 6. Database and migration steps

1. `db/db.go`: drop the existing `phone_1` index, create `phone_1_partial` unique with
   `partialFilterExpression: {phone: {$type:"string", $ne:""}}` (mirror the email fix
   at `db/db.go:48-61`). Shadows must omit the field entirely (`omitempty`), because
   an empty string still collides in a sparse index.
2. New index ensure (new file, e.g. `db/external_service_indexes.go`): unique
   `external_services.key_hash`, unique `name`, unique
   `external_identities.(provider, external_id)`, index `user_id`, TTL for
   `link_codes.expires_at`, TTL for `outbound_events`.
3. `main.go` flag `-migrate-account-types -dry-run`: set `account_type:"registered"`
   for users with a non-empty phone; report (do not modify) any phone-less users.
4. Model changes: `models/user.go` (`Phone` omitempty, new fields),
   `models/order.go` (`PlacedVia`), `models/otp.go` (`bind_phone` purpose +
   `user_id`), new model files for `external_identity`, `external_service`,
   `link_code`, `outbound_event`.
5. `services/authjwt/jwt.go`: optional `channel` claim (backward compatible) and
   provider client constants; `X-Client-Platform` at issuance.
6. `routes/routes.go`: register the new routes; respect the literal-before-wildcard
   ordering rule and update `routes_shadow_test.go`.

## 7. Edge-case matrix

| Case | Resolution |
|---|---|
| Concurrent `/start` | unique index + upsert retry; both get the same user |
| Site user starts the bot | shadow is created; they can link via code before ordering, or claim/link later and merge |
| Contact message with `user_id != from.id` or absent | reject; offer retry with the button or the OTP path |
| Telegram account changes owner | identity persists; fresh proof required to re-link |
| Phone belongs to a banned account | refuse, no merge |
| Merge triggered twice concurrently | `merge_state` lock; second attempt returns current state |
| Payment callback lands mid-merge | order moved by `_id`; callback updates the order regardless of owner |
| Old shadow token after merge | shadow `is_active:false` -> middleware rejects; bot re-exchanges and self-heals |
| Both carts / same review / same address | custom mergers dedupe |
| Identity linked to another registered user | `409`, admin resolution only |
| Link code replayed or expired | burned atomically, short TTL, generic error |
| OTP enumeration | generic send response; reveal only after OTP proof |
| Double phone bind | same value -> idempotent `200`; different value -> `409 phone_already_set`, no SMS, no verification |
| Same phone on a second identity | consent + merge, target always the registered account; the target's phone is never overwritten |
| User wants a different identity phone | not supported by design; collect the new number as the shipping-address phone |
| Telegram account phone later changes | `users.phone` stays as first bound; the identity stays linked via the Telegram ID |
| Two bots, same person | one identity per `(provider, external_id)`; `bot_ids` is metadata |
| Telegram + Instagram + Bale same person | separate identities, all merged into one registered user |
| DigiPay/SnappPay before phone bind | pass `mobile` in `payment/request` from the shipping address, else gate those gateways |
| Order attribution after merge | `order.placed_via` filled from the optional JWT `channel` claim |
| Admin lists/counts | exclude `account_type:"merged"` |
| Shadow spam | optional sweeper for `external` rows with zero orders/carts/activity after N days |
| Existing production users | backfill `account_type` with `-migrate-account-types` |

## 8. Rollout order

1. Indexes + model fields + `utils.NormalizeIRPhone` + table tests.
2. `ServiceAuthMiddleware` + `external_services` CRUD + admin page.
3. Exchange endpoint + `external_identities`.
4. Contact bind + OTP bind + merge engine + `has_password` / initial password set.
5. Webhooks/outbox.
6. Bot integration (see the binding guide).

### Tests

- normalization table tests (`+98`, `0098`, `98`, Persian digits, invalid);
- `contact_user_id != external_id` rejected;
- second bind attempt is a no-op/409, never a stacked verification;
- `users.phone` has a single writer (`bindPhoneToUser` on an empty phone); every other
  path returns `phone_already_set` and no code path overwrites a non-empty phone;
- claim-in-place vs merge-instead matrix;
- merge idempotency and crash-resume;
- service key/scope/provider rejection;
- profile `has_password` and initial password set without revocation;
- `routes_shadow_test.go` updated for the new routes.

## 9. Open decisions

1. Shipping before or after payment (flat/free shipping + `PATCH
   /api/orders/{orderId}/shipping-address`, or collect address+phone at checkout).
2. Bot session policy: reuse web rotating refresh (recommended) or add a long-lived
   non-rotating policy like Android's.
3. Link prompt at `/start`: always show "already have an account?" or only in profile.
4. Shadow cleanup policy: keep indefinitely or sweep zero-activity rows.
