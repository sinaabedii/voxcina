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

## License

[Your License]

---

Built with Go, Next.js, MongoDB, and AI
