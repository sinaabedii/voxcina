# 🚀 C2C Marketplace - Docker Setup

## Quick Start

### Automated Start (Recommended)

```bash
./start.sh
```

This script will:
- Check for required dependencies
- Create .env file if missing
- Stop existing containers
- Build and start all services
- Show service status

### Manual Start

```bash
# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f
```

## 🔐 Important: Docker Permissions

If you get "permission denied" errors, you have two options:

### Option 1: Add user to docker group (Recommended)
```bash
sudo usermod -aG docker $USER
newgrp docker  # Or log out and back in
```

### Option 2: Use sudo
```bash
sudo docker compose up --build -d
```

## 📋 Services Overview

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js web application |
| Backend | 8080 | Go API server |
| MongoDB | 27017 | Database |

## 🌐 Access URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api
- **Admin Panel**: http://localhost:3000/admin
- **Seller Dashboard**: http://localhost:3000/dashboard/seller

## 📝 First Time Setup

1. **Start the services**
   ```bash
   ./start.sh
   ```

2. **Wait for services to be ready** (check logs)
   ```bash
   docker compose logs -f
   ```

3. **Access the frontend** at http://localhost:3000

4. **Register a customer account**
   - Go to Sign Up
   - Fill in the registration form
   - You'll be logged in automatically

5. **Become a seller**
   - Navigate to Dashboard
   - Click "فروشنده شوید" (Become a Seller)
   - Complete the 3-step registration
   - Wait for admin approval

6. **Create an admin user** (for testing)
   ```bash
   # Connect to MongoDB
   docker compose exec mongo mongosh -u admin -p password --authenticationDatabase admin
   
   # Switch to your database
   use admin
   
   # Update a user to admin role
   db.users.updateOne(
     { email: "your-email@example.com" },
     { $set: { role: "admin" } }
   )
   
   # Exit
   exit
   ```

7. **Approve stores** (as admin)
   - Log in with admin account
   - Go to http://localhost:3000/admin/stores
   - Approve pending stores

## 🛠️ Common Commands

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f server
docker compose logs -f front_end
docker compose logs -f mongo
```

### Check Status
```bash
docker compose ps
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart server
```

### Stop Services
```bash
# Stop (keeps data)
docker compose down

# Stop and remove data
docker compose down -v
```

### Rebuild
```bash
# Rebuild and restart
docker compose up --build -d
```

### Access Container Shell
```bash
# Backend
docker compose exec server sh

# MongoDB
docker compose exec mongo mongosh -u admin -p password --authenticationDatabase admin
```

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
docker compose logs

# Check if ports are in use
sudo lsof -i :3000
sudo lsof -i :8080
sudo lsof -i :27017
```

### MongoDB connection issues
```bash
# Check MongoDB health
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Restart MongoDB
docker compose restart mongo
```

### Frontend can't connect to backend
```bash
# Check backend logs
docker compose logs server

# Verify backend is running
curl http://localhost:8080/api/health
```

### Permission denied errors
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply changes
newgrp docker

# Or log out and back in
```

### Clean slate (removes all data)
```bash
docker compose down -v
docker system prune -a
./start.sh
```

## 📊 Monitoring

### Resource Usage
```bash
docker stats
```

### Container Details
```bash
docker compose ps -a
```

### Network Info
```bash
docker network ls
docker network inspect voxcina_backend-network
```

## 🔧 Configuration

### Environment Variables (.env)

Key variables to configure:

```env
# Required for production
INTERNAL_SECRET=your-secret-key-here

# Optional: SMS service
SMSIR_ACCESS_KEY=your-key
SMSIR_LINE_NUMBER=your-number
SMSIR_TEMPLATE_ID=your-template

# Optional: Shipping service
POSTEX_API_KEY=your-key

# Optional: AI features
OPENROUTER_API_KEY=your-key
```

### Ports

To change ports, edit `docker-compose.yml`:

```yaml
services:
  front_end:
    ports:
      - "3000:3000"  # Change first number
  
  server:
    ports:
      - "8080:8080"  # Change first number
```

## 📦 Data Persistence

Data is stored in Docker volumes:

- **mongodb-data**: Database files
- **./uploads**: Uploaded files (logos, product images)

### Backup Data
```bash
# Backup MongoDB
docker compose exec mongo mongodump --out=/data/backup

# Copy backup from container
docker cp mongodb:/data/backup ./mongodb-backup
```

### Restore Data
```bash
# Copy backup to container
docker cp ./mongodb-backup mongodb:/data/backup

# Restore
docker compose exec mongo mongorestore /data/backup
```

## 🚀 Production Deployment

For production:

1. **Update .env with production values**
2. **Use strong passwords**
3. **Set up SSL/TLS**
4. **Configure reverse proxy (nginx)**
5. **Set up monitoring**
6. **Configure backups**
7. **Use Docker secrets for sensitive data**

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Go Documentation](https://golang.org/doc/)

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker compose logs -f`
2. Verify services are running: `docker compose ps`
3. Check MongoDB: `docker compose exec mongo mongosh --eval "db.adminCommand('ping')"`
4. Review START_SERVICES.md for detailed troubleshooting
5. Check C2C_MARKETPLACE_GUIDE.md for feature documentation

---

**Note**: First build may take 5-10 minutes depending on your internet connection and system resources.
