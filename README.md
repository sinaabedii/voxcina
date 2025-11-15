# 🛍️ Voxcina Shop - E-Commerce Platform with AI

Modern Persian e-commerce platform with AI-powered chat, smart search, and product recommendations.

---

## 🚀 Quick Start (One Command!)

### **Start Everything:**

```bash
docker compose up --build
```

That's it! This starts:

- 🗄️ MongoDB Database
- 🔧 Go Backend API
- 🎨 Next.js Frontend
- 💬 AI Chat System
- 🤖 Smart Search & Recommendations
- 📊 User Activity Tracking

**Then access:**

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8080/api>
- **MongoDB**: `localhost:27017`

---

## 📋 Prerequisites

- Docker & Docker Compose
- `.env` file (copy from `.env.example`)

---

## 🎯 Features

### **✅ E-Commerce Core**

- Product catalog with categories & brands
- **Hybrid cart system** - Seamless anonymous → logged-in transition
- **Smart cart persistence** - LocalStorage + Backend sync
- **Cart merging** - Automatic cart merge on login
- Order management
- User authentication (JWT)
- Address management
- Product reviews & ratings
- Wishlist
- Discount codes & promotions
- Blog system

### **🤖 AI-Powered Features**

- **Smart Search** - AI-powered Persian product search
- **ChatBot** - Conversational AI for customer support
- **Product Recommendations** - Personalized suggestions based on activity
- **Search Suggestions** - Auto-complete with AI
- **Chat History** - All conversations saved & searchable
- **Analytics Dashboard** - Deep insights into chats & user behavior

### **💬 Advanced Chat Management**

- Session management
- Search chats with 8+ filters
- Product click tracking
- Conversion tracking
- Sentiment analysis (ready)
- Analytics with 15+ metrics
- GDPR-compliant auto-expiry (180 days)
- Export functionality

### **📊 User Activity Tracking**

- **Comprehensive tracking** - 34+ activity types
- **Page views** - Track all page visits & duration
- **Product interactions** - Views, clicks, cart actions
- **Search analytics** - Queries, results, click-through
- **E-commerce flow** - Checkout, orders, payments
- **Recently viewed** - Show users their browse history
- **Conversion funnel** - Visitor → Product → Cart → Purchase
- **Session analytics** - Duration, entry/exit pages
- **Device tracking** - Mobile, tablet, desktop analytics
- **Anonymous users** - Track before login, merge after
- **Auto-cleanup** - TTL index (180 days retention)
- **14 optimized indexes** - Fast queries

### **📊 Admin Features**

- Dashboard with statistics
- Product management
- Order management
- User management
- AI metadata generation
- Chat analytics
- **User activity analytics** - Conversion funnels, behavior insights
- Review moderation

---

## 🗂️ Project Structure

```text
shop/
├── main.go                 # Go backend entry point
├── docker-compose.yml      # Docker orchestration
├── Dockerfile              # Backend container
├── models/                 # Data models
│   ├── product.go
│   ├── user.go
│   ├── order.go
│   ├── cart.go            # Hybrid cart system
│   ├── chat.go            # Chat management
│   ├── user_activity.go   # Activity tracking
│   └── ...
├── services/              # Business logic
│   ├── chat_service.go    # Chat operations
│   ├── customer_ai_service.go  # AI search
│   ├── user_activity_service.go  # Activity tracking
│   └── ...
├── handlers/              # API handlers
│   ├── chat_handler.go    # Chat endpoints
│   ├── ai_recommendations.go  # AI endpoints
│   ├── cart.go            # Hybrid cart handlers
│   ├── user_activity_handler.go  # Activity tracking
│   └── ...
├── routes/                # API routes
├── middlewares/           # Auth & validation
├── front_end/            # Next.js frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── module/
│   │   │       └── ChatBot.tsx  # AI ChatBot
│   │   ├── store/
│   │   │   └── cart-store.ts  # Zustand cart store
│   │   ├── lib/
│   │   │   └── activity-tracker.ts  # Activity tracking
│   │   └── ...
│   └── Dockerfile
└── config/               # Configuration
    └── ai_prompts.json   # AI prompts
```

---

## 🔧 Environment Variables

Create `.env` file:

```env
# OpenRouter AI (Required for AI features)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=deepseek/deepseek-r1:free
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small

# App Configuration
APP_URL=http://localhost:3000
INTERNAL_SECRET=your-secret-key

# Optional: SMS & Delivery
SMSIR_ACCESS_KEY=...
SMSIR_LINE_NUMBER=...
SMSIR_TEMPLATE_ID=...
POSTEX_API_KEY=...
```

---

## 🐳 Docker Commands

### **Start Services:**

```bash
# Start all (foreground)
docker compose up --build

# Start all (background)
docker compose up -d --build

# View logs
docker compose logs -f

# View specific service logs
docker compose logs server -f
docker compose logs front_end -f
```

### **Stop Services:**

```bash
# Stop all
docker compose down

# Stop and remove volumes (WARNING: deletes data!)
docker compose down -v
```

### **Manage Services:**

```bash
# Check status
docker compose ps

# Restart service
docker compose restart server

# Rebuild specific service
docker compose up --build server

# Access MongoDB
docker compose exec mongo mongosh -u admin -p password
```

---

## 📊 API Endpoints

### **Public Endpoints:**

#### **Products:**

- `GET /api/products` - List products
- `GET /api/products/{id}` - Get product details
- `GET /api/search/smart` - AI-powered search
- `GET /api/products/smart-recommendations` - AI recommendations

#### **Chat:**

- `POST /api/chat/recommend` - AI chat with recommendations
- `POST /api/chat/save` - Save chat message
- `GET /api/chat/history/{chatId}` - Get chat history
- `GET /api/chat/sessions` - List user chat sessions
- `POST /api/chat/search` - Search chats (advanced)

#### **User Activity:**

- `POST /api/activity/track` - Track single activity (public)
- `POST /api/activity/track/batch` - Track batch activities (public)
- `GET /api/activity/user` - Get user activities (auth required)
- `GET /api/activity/recently-viewed` - Recently viewed products (auth required)
- `GET /api/activity/summary` - User activity summary (auth required)
- `GET /api/activity/session/{id}` - Session analytics (auth required)

#### **Cart & Orders:**

- `GET /api/cart` - Get cart
- `POST /api/cart` - Add to cart
- `POST /api/checkout` - Checkout
- `GET /api/orders` - User's orders

#### **Auth:**

- `POST /api/users/register` - Register
- `POST /api/users/login` - Login
- `POST /api/users/refresh` - Refresh token

### **Admin Endpoints:**

- `GET /api/admin/dashboard-stats` - Statistics
- `GET /api/admin/chat/analytics` - Chat analytics
- `GET /api/admin/activity/funnel` - Conversion funnel analytics
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/{id}` - Update product
- `POST /api/admin/ai/generate-metadata` - Generate AI metadata

---

## 🧪 Testing

### **Test API:**

```bash
# Health check
curl http://localhost:8080/api/health

# Test chat save
curl -X POST http://localhost:8080/api/chat/save \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "test_123",
    "message": {
      "text": "سلام",
      "sender": "user"
    }
  }'

# Get chat history
curl http://localhost:8080/api/chat/history/test_123
```

### **Access MongoDB:**

```bash
docker compose exec mongo mongosh -u admin -p password

# In mongosh:
use admin
show collections
db.chats.find().limit(5)
db.products.countDocuments()
```

---

## 📚 Documentation

### **System Documentation:**

- **[DOCKER_STARTUP.md](DOCKER_STARTUP.md)** - Complete Docker guide
- **[USER_ACTIVITY_TRACKING.md](USER_ACTIVITY_TRACKING.md)** - Activity tracking system (620+ lines)
- **[CART_LOGIN_LOGOUT_BEHAVIOR.md](CART_LOGIN_LOGOUT_BEHAVIOR.md)** - Cart persistence guide
- **[FRONTEND_FIXES.md](FRONTEND_FIXES.md)** - Frontend optimization fixes
- **[TEST_CLEANUP_SUMMARY.md](TEST_CLEANUP_SUMMARY.md)** - Test removal summary

### **AI & Chat Documentation:**

- **[CHAT_MANAGEMENT_SYSTEM.md](CHAT_MANAGEMENT_SYSTEM.md)** - Chat system documentation (850+ lines)
- **[CHAT_SYSTEM_QUICKSTART.md](CHAT_SYSTEM_QUICKSTART.md)** - Chat quick start
- **[CHATBOT_AI_UPGRADE.md](CHATBOT_AI_UPGRADE.md)** - AI integration details
- **[AI_AGENTS_UNIFIED_STRUCTURE.md](AI_AGENTS_UNIFIED_STRUCTURE.md)** - AI architecture

---

## 🎯 Key Technologies

### **Backend:**

- Go 1.24
- MongoDB 6.0
- JWT Authentication
- OpenRouter AI API

### **Frontend:**

- Next.js 14
- React 18
- TypeScript
- TailwindCSS
- Framer Motion
- Zustand (State management)
- Sharp (Image optimization)

### **Infrastructure:**

- Docker & Docker Compose
- MongoDB (containerized)
- Multi-stage Docker builds

---

## 🚀 Production Deployment

1. **Update environment variables** in `.env`
2. **Build optimized images:**

   ```bash
   docker compose build --no-cache
   ```

3. **Start services:**

   ```bash
   docker compose up -d
   ```

4. **Configure reverse proxy** (nginx) for HTTPS
5. **Set up monitoring** & backups

---

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin/User)
- MongoDB authentication enabled
- Environment-based secrets
- Input validation & sanitization

---

## 📈 Analytics & Monitoring

### **Chat Analytics:**

```bash
# Get monthly analytics
curl "http://localhost:8080/api/admin/chat/analytics?from=2025-01-01&to=2025-01-31"
```

**Metrics tracked:**

- Total chats & messages
- Average response time
- Click-through rate
- Conversion rate
- Sentiment analysis
- Peak hours
- Device breakdown
- Top intents

### **User Activity Analytics:**

```bash
# Get conversion funnel
curl "http://localhost:8080/api/admin/activity/funnel?from=2025-01-01&to=2025-01-31"

# Get user activity summary (requires auth)
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8080/api/activity/summary"

# Get recently viewed products (requires auth)
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8080/api/activity/recently-viewed"
```

**Metrics tracked:**

- Page views & duration
- Product views & clicks
- Cart additions & removals
- Search queries & results
- Orders & conversions
- Session analytics
- Device breakdown
- Conversion funnel (Visitor → Product → Cart → Checkout → Purchase)

---

## 🛠️ Development

### **Making Changes:**

**Backend changes:**

```bash
# Edit Go files
# Rebuild and restart
docker compose up --build server
```

**Frontend changes:**

```bash
# Next.js has hot reload
# Just save files and refresh browser

# If needed:
docker compose restart front_end
```

**Database changes:**

```bash
# Models updated automatically
# Indexes created on startup
docker compose restart server
```

---

## 🆘 Troubleshooting

**Containers won't start:**

```bash
docker compose down -v
docker compose up --build
```

**Port conflicts:**

```bash
# Check ports
lsof -i :3000
lsof -i :8080
lsof -i :27017

# Or change ports in docker-compose.yml
```

**MongoDB issues:**

```bash
docker compose logs mongo
docker compose restart mongo
```

**View all logs:**

```bash
docker compose logs -f --tail=100
```

---

## 🎉 Success

Once started, you'll have:

- ✅ Full e-commerce platform
- ✅ AI-powered chat & search
- ✅ Product recommendations
- ✅ **Comprehensive user activity tracking**
- ✅ **Smart cart with persistence**
- ✅ Chat history & analytics
- ✅ **Conversion funnel analytics**
- ✅ Admin dashboard
- ✅ All containerized & production-ready

**Access your app:**

- 🌐 **Frontend**: <http://localhost:3000>
- 🔧 **API**: <http://localhost:8080/api>
- 💬 **ChatBot**: Available on all pages

---

## 📞 Support

For detailed documentation, see the docs listed above. For issues:

1. Check Docker logs: `docker compose logs -f`
2. Verify all containers running: `docker compose ps`
3. Check MongoDB health
4. Review environment variables
5. Consult documentation files

---

## 📄 License

[Your License Here]

---

## 👥 Contributors

[Your Team Here]

---

Built with ❤️ using Go, React, MongoDB, and AI
