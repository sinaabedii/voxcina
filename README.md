# 🛍️ Voxcina Shop

Modern Persian e-commerce platform with AI-powered chat, smart search, and product recommendations.

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 2. Start all services
docker compose up --build
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api
- MongoDB: localhost:27017

## Features

### E-Commerce
- Product catalog with color/size variants
- Hybrid cart (anonymous → logged-in sync)
- Order management & tracking
- JWT + OTP authentication
- Reviews, wishlist, discounts

### AI-Powered
- Smart Persian product search
- Conversational chatbot
- Personalized recommendations
- Search auto-complete

### Analytics
- 34+ activity types tracked
- Conversion funnel analytics
- Session & device tracking

### Payment Integration
- Zibal payment gateway integration
- Secure online payment processing
- Payment status tracking and verification
- Callback handling for payment confirmation

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.24, Gorilla Mux, MongoDB 6.0 |
| Frontend | Next.js 14, TypeScript, TailwindCSS, Zustand |
| AI | OpenRouter API (DeepSeek, OpenAI embeddings) |
| Infrastructure | Docker, Nginx, Let's Encrypt |

## Project Structure

```
shop/
├── main.go              # Backend entry
├── models/              # MongoDB models
├── handlers/            # API handlers
├── services/            # Business logic (AI, chat, SMS)
├── routes/              # API routes
├── middlewares/         # Auth middleware
├── front_end/           # Next.js app
│   ├── src/app/         # Pages (App Router)
│   ├── src/components/  # React components
│   └── src/store/       # Zustand stores
└── docker-compose.yml
```

## Environment Variables

```env
# Required for AI features
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=deepseek/deepseek-r1:free
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small

# App
APP_URL=http://localhost:3000
INTERNAL_SECRET=your-secret-key

# SMS (optional)
SMSIR_ACCESS_KEY=...
SMSIR_TEMPLATE_ID=...

# Zibal Payment Gateway
ZIBAL_MERCHANT=your-merchant-id
# For testing, use: ZIBAL_MERCHANT=zibal
```

## Docker Commands

```bash
# Start
docker compose up -d --build

# Logs
docker compose logs -f server
docker compose logs -f front_end

# Stop
docker compose down

# MongoDB shell
docker compose exec mongo mongosh -u admin -p password
```

## API Endpoints

### Public
- `GET /api/products` - List products
- `GET /api/products/{id}` - Product details
- `GET /api/search/smart` - AI search
- `POST /api/chat/recommend` - AI chat
- `POST /api/activity/track` - Track activity

### Auth Required
- `GET /api/cart` - Get cart
- `POST /api/checkout` - Checkout
- `GET /api/orders` - User orders
- `POST /api/payment/request` - Initiate Zibal payment
- `POST /api/payment/verify` - Verify payment status
- `POST /api/payment/inquiry` - Inquiry payment details

### Payment Callback
- `GET /api/payment/callback` - Zibal payment callback (public, no auth)

### Admin
- `GET /api/admin/dashboard-stats`
- `POST /api/admin/products`
- `GET /api/admin/chat/analytics`

## Production Deployment

```bash
# 1. Setup VPS
sudo apt update && sudo apt install -y docker.io docker-compose-v2 nginx certbot

# 2. SSL Certificate
sudo certbot certonly --standalone -d yourdomain.com

# 3. Configure Nginx (see nginx config below)
sudo nano /etc/nginx/sites-available/voxcina

# 4. Deploy
docker compose up -d --build
```

### Nginx Config

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Zibal Payment Gateway Integration

### Overview
The application integrates with Zibal (زیبال), a Persian payment gateway, to handle secure online payments. The integration follows Zibal's RESTful API specification.

### Setup

1. **Get Merchant ID**
   - Register at Zibal: https://zibal.ir
   - Obtain your merchant ID from the dashboard
   - For testing, use merchant ID: `zibal`

2. **Configure Environment**
   ```env
   ZIBAL_MERCHANT=your-merchant-id
   APP_URL=https://yourdomain.com  # Must be HTTPS in production
   ```

3. **Callback URL**
   - Zibal will send payment status to: `{APP_URL}/api/payment/callback`
   - Ensure this URL is accessible from the internet

### Payment Flow

1. **Request Payment** (`POST /api/payment/request`)
   - User initiates checkout with order details
   - Backend creates payment request with Zibal
   - Returns `trackId` and payment URL

2. **Redirect to Payment Gateway**
   - Frontend redirects user to: `https://gateway.zibal.ir/start/{trackId}`
   - User enters card details and completes payment

3. **Callback Handling** (`GET /api/payment/callback`)
   - Zibal sends payment status via query parameters
   - Backend updates order status in database
   - User is redirected back to checkout success page

4. **Verify Payment** (`POST /api/payment/verify`)
   - Frontend verifies payment status with backend
   - Backend confirms with Zibal
   - Updates order payment status

5. **Inquiry Payment** (`POST /api/payment/inquiry`)
   - Check payment status at any time
   - Returns full transaction details

### API Endpoints

#### Request Payment
```
POST /api/payment/request
Authorization: Bearer {token}

Body:
{
  "orderId": "order-id",
  "amount": 1000000,  // in Rials
  "description": "Order description",
  "mobile": "09xxxxxxxxx"  // optional
}

Response:
{
  "result": 100,
  "message": "Payment request created successfully",
  "trackId": 123456,
  "payUrl": "https://gateway.zibal.ir/start/123456"
}
```

#### Payment Callback
```
GET /api/payment/callback?success=1&trackId=123456&orderId=order-id&status=1

Zibal sends this automatically after payment
```

#### Verify Payment
```
POST /api/payment/verify
Authorization: Bearer {token}

Body:
{
  "trackId": 123456
}

Response:
{
  "result": 100,
  "message": "Payment verified",
  "status": 1,
  "amount": 1000000,
  "refNumber": "ref-123456",
  "cardNumber": "****-****-****-1234",
  "paymentStatus": "paid",
  "statusText": "پرداخت شده - تاییدشده"
}
```

#### Inquiry Payment
```
POST /api/payment/inquiry
Authorization: Bearer {token}

Body:
{
  "trackId": 123456
}

Response:
{
  "result": 100,
  "message": "Payment inquiry successful",
  "status": 1,
  "amount": 1000000,
  "refNumber": "ref-123456",
  "cardNumber": "****-****-****-1234",
  "createdAt": "2024-12-10T12:00:00Z",
  "paidAt": "2024-12-10T12:05:00Z",
  "paymentStatus": "paid",
  "statusText": "پرداخت شده - تاییدشده"
}
```

### Payment Status Codes

| Status | Description |
|--------|-------------|
| -1 | Pending payment |
| -2 | Internal error |
| 1 | Paid - Verified |
| 2 | Paid - Unverified |
| 3 | Cancelled by user |
| 4 | Invalid card number |
| 5 | Insufficient balance |
| 6 | Wrong password |
| 7 | Too many requests |
| 8 | Daily transaction limit exceeded |
| 9 | Daily amount limit exceeded |
| 10 | Invalid card issuer |
| 11 | Switch error |
| 12 | Card not accessible |
| 15 | Transaction refunded |
| 16 | Transaction refunding |
| 18 | Transaction reversed |
| 21 | Invalid merchant |

### Frontend Integration

Use the `usePayment` hook in React components:

```tsx
import { usePayment } from "@/hooks/usePayment";

function CheckoutPage() {
  const { requestPayment, verifyPayment, isLoading } = usePayment();

  const handlePayment = async () => {
    const response = await requestPayment(
      orderId,
      amount,
      "Order description",
      mobile
    );
    
    if (response?.payUrl) {
      window.location.href = response.payUrl;
    }
  };

  return (
    <button onClick={handlePayment} disabled={isLoading}>
      Pay with Zibal
    </button>
  );
}
```

### Testing

1. **Test Merchant**
   ```env
   ZIBAL_MERCHANT=zibal
   ```

2. **Test Cards**
   - Card: 6221061113530007
   - CVV: 123
   - Expiry: 12/26

3. **Test Flow**
   - Create order
   - Request payment
   - Complete payment on test gateway
   - Verify payment status

### Production Checklist

- [ ] Register production merchant account with Zibal
- [ ] Update `ZIBAL_MERCHANT` with production ID
- [ ] Ensure `APP_URL` is HTTPS
- [ ] Configure callback URL in Zibal dashboard
- [ ] Test payment flow end-to-end
- [ ] Set up error monitoring and logging
- [ ] Configure email notifications for payment failures
- [ ] Test refund process

### Troubleshooting

**Payment request fails with "merchant not found"**
- Verify `ZIBAL_MERCHANT` environment variable is set
- Check merchant ID is correct in Zibal dashboard

**Callback not received**
- Ensure `APP_URL` is publicly accessible
- Check firewall allows incoming requests
- Verify callback URL in Zibal dashboard matches `{APP_URL}/api/payment/callback`

**Payment status shows "unverified"**
- Call `/api/payment/verify` endpoint to confirm payment
- Check order status in database

## License

[Your License]

---

Built with Go, Next.js, MongoDB, and AI
