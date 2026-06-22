# Starting the C2C Marketplace Services

## Prerequisites

The application requires Docker and Docker Compose to be installed and running.

## Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Stop any existing containers
docker compose down -v

# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f
```

### Option 2: If you need sudo permissions

```bash
# Stop any existing containers
sudo docker compose down -v

# Build and start all services
sudo docker compose up --build -d

# View logs
sudo docker compose logs -f
```

## Services

The docker-compose will start 3 services:

1. **MongoDB** (Port 27017)
   - Database for storing all application data
   - Includes health checks
   - Data persisted in `mongodb-data` volume

2. **Backend API Server** (Port 8080)
   - Go backend with all C2C marketplace APIs
   - Connects to MongoDB
   - Serves uploaded files from `/uploads`

3. **Frontend** (Port 3000)
   - Next.js frontend application
   - Connects to backend API
   - Accessible at http://localhost:3000

## Accessing the Application

Once all services are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **MongoDB**: localhost:27017

## Default Credentials

### MongoDB
- Username: `admin`
- Password: `password`
- Database: `admin`

### Admin User (Create after first run)
You'll need to create an admin user through the registration flow and then update their role in the database.

## Checking Service Status

```bash
# Check if all containers are running
docker compose ps

# View logs for all services
docker compose logs

# View logs for specific service
docker compose logs server
docker compose logs front_end
docker compose logs mongo

# Follow logs in real-time
docker compose logs -f
```

## Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: This deletes all data)
docker compose down -v
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Check what's using the port
sudo lsof -i :3000  # Frontend
sudo lsof -i :8080  # Backend
sudo lsof -i :27017 # MongoDB

# Kill the process or change ports in docker-compose.yml
```

### Permission Denied (Docker Socket)

If you get permission denied errors:

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and log back in, then try again
docker compose up --build -d
```

### MongoDB Connection Issues

If the backend can't connect to MongoDB:

```bash
# Check MongoDB health
docker compose logs mongo

# Restart MongoDB
docker compose restart mongo

# Wait for MongoDB to be healthy
docker compose ps
```

### Build Failures

If the build fails:

```bash
# Clean up and rebuild
docker compose down -v
docker system prune -a
docker compose up --build
```

## Development Mode

For development with hot-reload:

### Backend
```bash
# Run backend locally (outside Docker)
go run main.go
```

### Frontend
```bash
# Run frontend locally (outside Docker)
cd front_end
npm install
npm run dev
```

## Environment Variables

The `.env` file contains configuration for:
- SMS service (SMSIR)
- Shipping service (POSTEX)
- AI services (OpenRouter)
- Internal secrets

Update these values as needed for production deployment.

## Database Seeding

To seed the database with initial data:

```bash
# Enter the backend container
docker compose exec server sh

# Run the seed command
./main -seed

# Exit container
exit
```

## Monitoring

### View Resource Usage
```bash
docker stats
```

### View Container Details
```bash
docker compose ps -a
```

### Inspect Logs
```bash
# All services
docker compose logs --tail=100

# Specific service with timestamps
docker compose logs -f --timestamps server
```

## Production Deployment

For production deployment:

1. Update `.env` with production values
2. Set strong passwords for MongoDB
3. Configure proper JWT secrets
4. Set up SSL/TLS certificates
5. Use a reverse proxy (nginx/traefik)
6. Set up monitoring and logging
7. Configure backups for MongoDB
8. Use Docker secrets for sensitive data

## Next Steps

After starting the services:

1. **Access the frontend** at http://localhost:3000
2. **Register a customer account**
3. **Become a seller** through the dashboard
4. **Create an admin user** (manually update role in database)
5. **Approve stores** through the admin panel
6. **Start adding products** as a seller
7. **Browse stores** as a customer

## Support

If you encounter any issues:

1. Check the logs: `docker compose logs -f`
2. Verify all services are running: `docker compose ps`
3. Check MongoDB health: `docker compose exec mongo mongosh --eval "db.adminCommand('ping')"`
4. Restart services: `docker compose restart`
5. Rebuild if needed: `docker compose up --build`

---

**Note**: The first build may take several minutes as it downloads base images and installs dependencies.
