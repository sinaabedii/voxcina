# Backend Authentication APIs

## 1. Register
**POST** `/api/users/register`

**Payload:**
```json
{
  "name": "علی احمدی",
  "email": "ali@example.com",
  "password": "SecurePass123",
  "phone": "09123456789"
}
```

**Response (201):**
```json
{
  "_id": "...",
  "name": "علی احمدی",
  "phone": "09123456789",
  "token": "...",
  "refreshToken": "..."
}
```

**Errors:** 400 (invalid), 409 (phone exists), 500

---

## 2. Login
**POST** `/api/users/login`

**Payload:**
```json
{
  "phone": "09123456789",
  "password": "SecurePass123"
}
```

**Response (200):** User + tokens

**Errors:** 400, 401 (invalid credentials), 500

---

## 3. OTP Signup - Send
**POST** `/api/auth/signup/send-otp`

**Payload:**
```json
{
  "firstName": "علی",
  "lastName": "احمدی",
  "phone": "09123456789"
}
```

**Response (200):**
```json
{
  "message": "کد تأیید ارسال شد",
  "expiresIn": 600,
  "phone": "09123456789"
}
```

**Errors:** 400, 409 (phone exists), 429 (rate limited), 500

---

## 4. OTP Signup - Verify
**POST** `/api/auth/signup/verify-otp`

**Payload:**
```json
{
  "phone": "09123456789",
  "code": "12345",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

**Response (201):** User + tokens

**Errors:** 400 (invalid OTP/password), 409 (phone exists), 429 (max attempts), 500

---

## 5. OTP Signup - Resend
**POST** `/api/auth/signup/resend-otp`

**Payload:**
```json
{
  "phone": "09123456789"
}
```

**Response (200):** Success message

**Errors:** 400, 429 (rate limited), 500

---

## 6. OTP Login - Send
**POST** `/api/auth/send-otp`

**Payload:**
```json
{
  "phone": "09123456789"
}
```

**Response (200):** OTP sent

**Errors:** 400, 404 (user not found), 429, 500

---

## 7. OTP Login - Verify
**POST** `/api/auth/check-otp`

**Payload:**
```json
{
  "phone": "09123456789",
  "code": "12345"
}
```

**Response (200):**
```json
{
  "message": "کد صحیح است",
  "valid": true
}
```

**Errors:** 400, 429, 500

---

## 8. Login via SMS
**POST** `/api/users/login-sms`

**Payload:**
```json
{
  "phone": "09123456789"
}
```

**Response (200):** User + tokens

**Errors:** 404, 500

---

## 9. Forgot Password - Send OTP
**POST** `/api/auth/forgot-password/send-otp`

**Payload:**
```json
{
  "phone": "09123456789"
}
```

**Response (200):** OTP sent

**Errors:** 400, 404 (user not found), 429, 500

---

## 10. Forgot Password - Reset
**POST** `/api/auth/forgot-password/reset`

**Payload:**
```json
{
  "phone": "09123456789",
  "code": "12345",
  "password": "NewPass123",
  "confirmPassword": "NewPass123"
}
```

**Response (200):**
```json
{
  "message": "رمز عبور تغییر کرد"
}
```

**Errors:** 400, 404, 429, 500

---

## 11. Refresh Token
**POST** `/api/users/refresh`

**Payload:**
```json
{
  "refreshToken": "..."
}
```

**Response (200):**
```json
{
  "accessToken": "..."
}
```

**Errors:** 400, 401 (expired/invalid), 500

---

## 12. Check Phone
**POST** `/api/users/check-phone`

**Payload:**
```json
{
  "phone": "09123456789"
}
```

**Response (200):**
```json
{
  "exists": true
}
```

**Response (404):** Phone doesn't exist

---

## 13. Logout
**POST** `/api/users/logout`

**Auth:** Required (Bearer token)

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

## Authentication Header
```
Authorization: Bearer <access_token>
```

---

## Token Details
- **Access Token:** 24 hours
- **Refresh Token:** 7 days
- **Algorithm:** HS256

---

## Validation Rules
- **Password:** Min 8 chars, uppercase, lowercase, digit
- **Phone:** Format `09xxxxxxxxx` (11 digits)
- **OTP:** 5 digits, expires 10 minutes, max 5 attempts
- **Names (OTP):** Persian characters only

---

## Rate Limiting
- OTP resend: 2 minutes between requests
- OTP attempts: Max 5 per code

---

## Error Codes
- `400` - Invalid input
- `401` - Unauthorized/invalid credentials
- `404` - Not found
- `409` - Conflict (phone exists)
- `429` - Too many requests
- `500` - Server error
