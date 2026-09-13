# External Services Binding Guide

How to connect a bot or external interface (Telegram, Bale, Instagram, ...) to the
storefront backend. Covers creating the service and API key, registering external
users, binding a phone, linking an existing site account, and webhooks.

The design and backend changes this guide depends on are described in
[EXTERNAL_SERVICES_PLAN.md](EXTERNAL_SERVICES_PLAN.md).

Note: the admin dashboard page for external services is not built yet — manage
services through the admin REST API (admin JWT in `Authorization: Bearer`)
shown below.

---

## 0. Model in one minute

- The backend runs a **token exchange**: the bot server (a trusted confidential
  client) exchanges a verified external identity for a normal user JWT pair.
- External users get a `users` row with `account_type: "external"` and no phone.
- Phone binding promotes that same row to `account_type: "registered"`. The identity
  phone is **write-once**: once set it can never be changed or removed through any API.
- Telegram contact share is accepted as phone proof; SMS OTP is the parallel option
  for other providers or manual entry. They are alternatives, never stacked.
- `users.phone` is the **identity phone**; the delivery phone is part of the shipping
  address, may be different, and can be edited freely per address.

## 1. Create the external service (admin REST)

1. Create the service:

   ```http
   POST /api/admin/external-services
   Authorization: Bearer <admin jwt>

   {
     "name": "Telegram Main Bot",
     "provider": "telegram",
     "scopes": ["identity:exchange", "identity:bind_phone"],
     "phone_methods": ["telegram_contact"],
     "webhook": { "url": "https://bot.example.com/webhooks/voxcina",
                  "events": ["payment.paid", "order.status_changed"], "active": true }
   }
   ```

   - `provider` is a closed set (`telegram` | `bale` | `instagram`) and IMMUTABLE
     after creation.
   - `phone_methods` lists the contact-share capability; `sms_otp` is always allowed
     and needs no listing.
   - The webhook URL must be `https://`; a signing secret is generated server-side
     and stored encrypted.

2. The response is `201` and contains secrets **shown exactly once** — copy both:

   ```json
   {
     "id": "...",
     "api_key": "vxk_<40 hex chars>",
     "webhook_secret": "<32 hex chars>",
     "key_prefix": "vxk_ab12cd34", "key_last4": "ef56",
     ...
   }
   ```

   `webhook_secret` is present only when the request configured a webhook URL for
   the first time. `webhook_secret` never appears again; `webhook` in later reads
   shows only `has_secret: true`.

3. Store `api_key` on the bot server as an environment variable (e.g.
   `VOXCINA_API_KEY`) and `webhook_secret` beside it. Never ship them to the bot
   client, never commit them, never log them.
4. To replace the key later:

   ```http
   POST /api/admin/external-services/{id}/rotate-key
   ```

   The response carries the new plaintext key once; the old key stays valid for a
   24-hour grace window. Deploy the new value to the bot first, then let the old
   one die.
5. Editing the service (`PUT /api/admin/external-services/{id}`) patches name,
   scopes, phone_methods, webhook (URL/events/active) and status
   (`active` | `disabled`); configuring a webhook URL for the first time returns
   the generated `webhook_secret` once.
6. `POST /api/admin/external-services/{id}/webhooks/test` queues a `webhook.test`
   event through the real dispatcher (202, `{"queued": true, "event_id": "..."}`).
7. Other admin reads: `GET /api/admin/external-services/{id}/identities`
   (linked channel accounts) and `.../{id}/audit` (key rotations and config
   changes).

## 2. First contact: `/start`

1. The bot backend calls:

   ```http
   POST /api/auth/external/token
   X-API-Key: <service key>
   Content-Type: application/json

   {
     "provider": "telegram",
     "external_id": "123456789",
     "profile": {
       "username": "erfan",
       "first_name": "Erfan",
       "last_name": "...",
       "language_code": "fa"
     },
     "bot_id": "voxcina_bot"
   }
   ```

   `bot_id` is optional metadata (which bot of the provider saw this account);
   `profile` is a bounded snapshot (string values ≤ 256 chars).

2. Response (200):

   ```json
   {
     "token": "<access jwt>",
     "refreshToken": "<refresh jwt>",
     "is_new": true,
     "has_phone": false,
     "user": { "id": "...", "name": "...", "account_type": "external",
               "has_phone": false, "has_password": false }
   }
   ```

3. Store the token pair per platform user on the bot server (server-side only).
4. Use `Authorization: Bearer <token>` for every existing storefront call: catalog,
   `GET/POST /api/cart`, `/api/cart/item`, `/api/checkout`, `/api/payment/request`,
   `GET /api/orders/{id}`. On `401` refresh via `POST /api/users/refresh` and persist
   the rotated refresh token.
5. If the request fails with `401/403` because the identity was merged, call
   `/api/auth/external/token` again — the identity now points at the surviving
   account and returns fresh tokens.

No phone, name, or OTP is requested at this point.

## 3. Bind the phone via Telegram contact (default for Telegram)

Do this at the shipping step, when delivery details are actually needed.

1. Send a reply keyboard with a contact button:

   ```json
   {
     "keyboard": [[{ "text": "ارسال شماره من", "request_contact": true }]],
     "resize_keyboard": true,
     "one_time_keyboard": true
   }
   ```

2. When the `contact` update arrives, accept it **only if**
   `contact.user_id == message.from.id`. If `user_id` is missing (manually typed
   number) or different, do not proceed — offer the buttons again, or the manual +
   SMS OTP path.
3. Send the number in any of the formats the platform produces — the backend
   normalizes (`+98912...`, `0098912...`, `98912...`, Persian digits ->
   `09xxxxxxxxx`):

   ```http
   POST /api/auth/external/phone/contact
   X-API-Key: <service key>

   {
     "provider": "telegram",
     "external_id": "123456789",
     "phone": "+989123456789",
     "contact_user_id": "123456789"
   }
   ```

   The contact path can only CLAIM A FREE PHONE. It can never take over an
   existing account: both `external_id` and `contact_user_id` arrive in the
   same request body, so their equality proves nothing the backend can verify,
   and a leaked bot key must not be able to convert a self-attested contact
   into someone else's session.

4. Handle the responses:
   - `200` — bound (or idempotent re-bind of the same number: `already_bound:
     true`). The body carries `phone`, `verified_method: "telegram_contact"`,
     `merged`, `user` and a fresh token pair. The user row is now `registered`;
     OTP login works immediately.
   - `409 { "code": "phone_taken", "can_merge": false, "merge_via": "sms_otp" }` —
     the phone already belongs to a site account. Do NOT retry this endpoint;
     switch the user to the SMS-OTP flow (section 4) — the backend-sent code is
     the proof that makes a consented merge possible there.
   - `409 { "code": "phone_already_set" }` — this identity already has a phone. Do not
     ask for another number; the identity phone cannot be changed. Continue to the
     delivery address step, where a different delivery phone may be entered.
   - `409 { "code": "phone_owner_conflict" }` — the phone's owner is banned or
     merged away; show a generic error and stop retrying.
   - `400 { "code": "INVALID_PHONE" }` — the number never normalized to
     09xxxxxxxxx.
   - `403` — provider mismatch, contact mismatch, or the service lacks the
     `telegram_contact` phone method.
5. Mention in the chat that the delivery phone at checkout can be a different number.

## 4. Alternative: SMS OTP

Use for providers without contact share (e.g. Instagram) or when the user chooses
manual entry.

1. `POST /api/auth/external/phone/send-otp`

   ```json
   { "provider": "telegram", "external_id": "123456789", "phone": "09123456789" }
   ```

   The response is always generic (no phone-exists disclosure) when the SMS was
   sent. Two special cases, both before any SMS spend:
   - the identity already holds the SAME phone -> `200 { "already_bound": true }`;
   - the identity holds a DIFFERENT phone -> `409 phone_already_set`.
   Resending within 2 minutes returns `429 { "code": "OTP_RATE_LIMITED" }` with
   the remaining seconds.

2. Ask the user for the code, then `POST /api/auth/external/phone/verify-otp`

   ```json
   {
     "provider": "telegram",
     "external_id": "123456789",
     "phone": "09123456789",
     "code": "48213",
     "merge": false
   }
   ```

   The code may arrive in Persian digits; the backend normalizes it.

3. Response handling matches the contact path: `200` (bound, body includes
   `verified_method: "sms_otp"`), `409 can_merge` (retry the SAME call with
   `"merge": true` — the code is NOT consumed on the 409, so no second SMS is
   needed), `409 phone_already_set`, `409 phone_owner_conflict`, and the OTP
   errors (`OTP_MISMATCH` with remaining attempts, `OTP_EXPIRED`, `OTP_NOT_FOUND`,
   `OTP_ATTEMPTS_EXHAUSTED` after 10 wrong tries). The code is burned only after
   the bind actually lands. Do not combine the two methods: once the phone is
   bound, no further verification is required or accepted for that number.

## 5. Link an existing site account (optional)

For users who registered on the website first.

1. The user generates a code from their site session:

   ```http
   POST /api/users/link-code
   Authorization: Bearer <user token>

   -> 201 { "code": "AB12CD34", "expires_in": 900,
            "links": { "telegram": "https://t.me/<bot>?start=link_AB12CD34" } }
   ```

   `links` appears only when `TELEGRAM_BOT_USERNAME` is configured on the
   backend. The code is single-use and lives 15 minutes.
   (The profile page section exposing this is not built yet — the endpoint is
   live.)

2. They send the code to the bot, or open
   `https://t.me/<bot>?start=link_<code>`.
3. Bot calls (the merge flag is REQUIRED — a code is proof the person controls
   both accounts, but data moving between them still needs consent):

   ```http
   POST /api/auth/external/link
   X-API-Key: <service key>

   { "provider": "telegram", "external_id": "123456789",
     "code": "AB12CD34", "merge": true }
   ```

4. Response (200): tokens for the site account, plus `merged: true` and the user
   summary. If the Telegram shadow had orders or a cart, they were merged into
   that account.
5. Errors:
   - `400 { "code": "LINK_CODE_INVALID" }` — unknown, expired (15 min) or
     already-used code;
   - `409 { "code": "MERGE_REQUIRED", "can_merge": true }` — call again with
     `"merge": true` after consent; the SAME code stays valid (it is burned
     only after every check passes, so the retry needs no new code);
   - `409 { "code": "IDENTITY_LINKED_ELSEWHERE" }` — the Telegram identity is
     already attached to a different account; resolve from the admin panel,
     never by retrying with a different identity;
   - `409 { "code": "ACCOUNT_UNAVAILABLE" }` — the code's owner is banned or
     merged away;
   - `503 { "code": "MERGE_INCOMPLETE" }` — a backend hiccup aborted the merge
     before anything was destroyed; wait a moment and retry — the code is
     refunded on failure, so the SAME code works.

## 6. Webhooks (payment and order events)

1. Configure the URL and events on the admin page (or `PUT
   /api/admin/external-services/{id}`); the signing secret is returned once at
   configuration time (section 1).
2. Delivery is tenant-scoped: an event about a user is sent only to the
   services of the channels that user actually uses. A pure-web shopper's
   events reach nobody; a Bale user's events never reach the Telegram bot.
3. The backend posts JSON to the configured URL with headers:

   - `X-Signature: sha256=<HMAC-SHA256(webhook_secret, rawBody)>`
   - `X-Event-Id: <unique event id>` — dedupe key
   - `X-Event-Type: <event type>`

   Body shape:

   ```json
   { "id": "<event id>", "type": "payment.paid",
     "created_at": "...", "data": { "order_id": "...", "order_number": "...",
     "total_amount": 123, "gateway": "zibal" } }
   ```

   Event types: `payment.paid`, `payment.failed`, `order.status_changed`,
   `return_request.decided`, `identity.merged`, `webhook.test`.

3. On the bot server:
   - recompute the HMAC over the exact raw body and compare (constant time);
   - dedupe by event id (idempotent handler);
   - return `2xx` quickly, do bot API calls asynchronously;
   - on failure the backend retries with backoff (1m, 5m, 30m, 2h, 6h; 8
     attempts max); 10 consecutive failures disable the webhook automatically
     and surface in the admin panel (`webhook_failure_count`). Events queued
     while the webhook is disabled are HELD, not destroyed — they deliver as
     soon as the webhook is re-enabled, and a dead integration's backlog
     never blocks the other integrations' deliveries.
4. Typical use: on `payment.paid`, send the order confirmation and ask for the
   shipping location/address if the chosen model defers it.

## 7. Security checklist

- Keep `X-API-Key` and the webhook signing secret on the server only; never in
  the bot client or logs.
- Always enforce `contact.user_id == message.from.id` before calling the contact
  bind endpoint; the backend re-checks `contact_user_id == external_id`.
- Never call `/api/users/register` or the signup OTP flow for external users.
- One identity per `(provider, external_id)`; never trust an `external_id` supplied
  by the bot client itself.
- Never attempt to overwrite `users.phone`. The only writer is the initial bind on an
  empty phone; the backend rejects any other value with `phone_already_set`.
- The backend decides who may merge: the SMS-OTP path (proven number) and the
  link-code flow (owner-minted code) honor `"merge": true` after user consent; the
  contact path NEVER merges — a leaked bot key must not be able to convert a
  self-attested contact into someone else's session.
- Rotate keys from the admin API; watch `last_used_at` and webhook failures.
- Rate-limit binds and `/start` processing per platform user in the bot.

## 8. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `401` on exchange (`MISSING_API_KEY` / `INVALID_API_KEY`) | key missing/wrong; check the `X-API-Key` header and the key value |
| `403 SERVICE_DISABLED` | the service is disabled; re-enable from the admin API |
| `403` on exchange (`INSUFFICIENT_SCOPE` / `PROVIDER_MISMATCH`) | scope missing from `scopes`, or `provider` in the body differs from the service provider |
| `409 can_merge:true` on bind (OTP path) | phone already has an account; show consent and retry with `"merge": true` |
| `409 can_merge:false + merge_via:"sms_otp"` on contact bind | phone already has an account; the contact path cannot merge — switch the user to the SMS-OTP flow |
| `409 phone_already_set` | this identity already has a phone; identity phones cannot be changed — only the shipping-address phone may differ |
| User asks to change their account phone | not possible by design; collect the new number as the shipping-address phone instead |
| `409 IDENTITY_LINKED_ELSEWHERE` on link | the Telegram identity is already attached to another account; admin resolution |
| `429 OTP_RATE_LIMITED` on send-otp | 2-minute resend window per identity (wait the reported seconds); a shared phone may also cap concurrent live codes — wait and retry |
| OTP never arrives | SMS service not configured; for Telegram prefer the contact path |
| Stored token stops working after a merge | expected; call `/api/auth/external/token` again and replace the pair |
| `503 MERGE_INCOMPLETE` on bind or link | a backend hiccup aborted the merge before anything was destroyed; retry shortly — the same code stays valid for /link |
| Webhook receives nothing | webhook disabled after failures or URL unreachable; check the admin panel and the webhooks/test endpoint. Also: user-scoped events only go to the channels the user actually uses |
| User can log in with OTP but not password | normal: external users have no password until one is set in the site profile |
