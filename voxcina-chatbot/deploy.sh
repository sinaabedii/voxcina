#!/bin/bash
# deploy.sh - Voxcina Chatbot Deployment Script

set -e

echo "🚀 Starting Voxcina Chatbot Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed."
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p nginx/ssl
    mkdir -p mongo-init
    mkdir -p monitoring/grafana/provisioning/{dashboards,datasources}
    mkdir -p logs
    mkdir -p data/chroma_db
    
    print_status "Directories created successfully."
}

# Setup MongoDB initialization script
setup_mongodb_init() {
    print_status "Setting up MongoDB initialization..."
    
    cat > mongo-init/01-init.js << 'EOF'
// MongoDB Initialization Script for Voxcina
db = db.getSiblingDB('voxcina');

// Create collections
db.createCollection('products');
db.createCollection('categories');
db.createCollection('brands');
db.createCollection('users');
db.createCollection('orders');
db.createCollection('reviews');
db.createCollection('blog_posts');
db.createCollection('cart');
db.createCollection('discounts');

// Create indexes for better performance
db.products.createIndex({ "name": "text", "description": "text", "tags": "text" });
db.products.createIndex({ "category": 1, "price": 1 });
db.products.createIndex({ "brand": 1, "active": 1 });
db.products.createIndex({ "variants.color": 1, "variants.size": 1 });
db.products.createIndex({ "created_at": -1 });

db.categories.createIndex({ "name": 1, "parent_id": 1 });
db.categories.createIndex({ "active": 1 });

db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "phone": 1 });

db.orders.createIndex({ "user_id": 1, "created_at": -1 });
db.orders.createIndex({ "status": 1 });

db.reviews.createIndex({ "product_id": 1, "rating": 1 });
db.reviews.createIndex({ "user_id": 1 });

db.blog_posts.createIndex({ "published": 1, "created_at": -1 });
db.blog_posts.createIndex({ "slug": 1 }, { unique: true });

print("Voxcina database initialized successfully!");
EOF

    print_status "MongoDB initialization script created."
}

# Setup monitoring configuration
setup_monitoring() {
    print_status "Setting up monitoring configuration..."
    
    # Prometheus configuration
    cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'voxcina-chatbot'
    static_configs:
      - targets: ['chatbot:8765']
    metrics_path: '/metrics'
    scrape_interval: 30s
EOF

    # Grafana datasource
    mkdir -p monitoring/grafana/provisioning/datasources
    cat > monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

    print_status "Monitoring configuration completed."
}

# Validate environment file
validate_env() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env
        print_error "Please update the .env file with your configuration before continuing."
        exit 1
    fi
    
    # Check for required variables
    required_vars=("OPENAI_API_KEY" "JWT_SECRET" "MONGO_ROOT_PASSWORD")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env; then
            print_error "Required environment variable ${var} not found in .env file."
            exit 1
        fi
    done
    
    print_status "Environment configuration validated."
}

# Build and start services
start_services() {
    print_status "Building and starting services..."
    
    # Build the chatbot image
    docker compose build chatbot
    
    # Start core services
    docker compose up -d mongodb redis
    
    # Wait for MongoDB to be ready
    print_status "Waiting for MongoDB to be ready..."
    sleep 10
    
    # Start the chatbot service
    docker compose up -d chatbot
    
    # Start nginx
    docker compose up -d nginx
    
    print_status "Core services started successfully."
}

# Start optional services
start_optional_services() {
    read -p "Do you want to start development tools (Mongo Express)? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose --profile development up -d
        print_status "Development tools started."
    fi
    
    read -p "Do you want to start monitoring tools (Prometheus, Grafana)? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose --profile monitoring up -d
        print_status "Monitoring tools started."
    fi
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check MongoDB
    if docker compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        print_status "✅ MongoDB is healthy"
    else
        print_error "❌ MongoDB health check failed"
    fi
    
    # Check Redis
    if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_status "✅ Redis is healthy"
    else
        print_error "❌ Redis health check failed"
    fi
    
    # Check Chatbot
    if curl -f http://localhost:8765/health > /dev/null 2>&1; then
        print_status "✅ Chatbot is healthy"
    else
        print_warning "⚠️  Chatbot health check failed (this might be normal during startup)"
    fi
}

# Display service information
display_info() {
    print_status "🎉 Deployment completed!"
    echo
    echo "📋 Service Information:"
    echo "├── Chatbot WebSocket: ws://localhost:8765"
    echo "├── MongoDB: mongodb://localhost:27017"
    echo "├── Redis: redis://localhost:6379"
    echo "├── Nginx: http://localhost:80"
    
    if docker compose ps | grep -q mongo-express; then
        echo "├── Mongo Express: http://localhost:8081"
    fi
    
    if docker compose ps | grep -q grafana; then
        echo "├── Grafana: http://localhost:3000 (admin/admin123)"
        echo "└── Prometheus: http://localhost:9090"
    else
        echo "└── (Monitoring tools not started)"
    fi
    
    echo
    echo "📝 Useful Commands:"
    echo "├── View logs: docker compose logs -f chatbot"
    echo "├── Restart chatbot: docker compose restart chatbot"
    echo "├── Stop all: docker compose down"
    echo "└── Update: docker compose pull && docker compose up -d"
    echo
    echo "⚙️  Configuration:"
    echo "├── Edit .env file for configuration changes"
    echo "├── Update nginx/nginx.conf for proxy settings"
    echo "└── Modify docker compose.yml for service changes"
}

# Main execution
main() {
    echo "=========================================="
    echo "    Voxcina Chatbot Deployment Script    "
    echo "=========================================="
    echo
    
    check_docker
    create_directories
    setup_mongodb_init
    setup_monitoring
    validate_env
    start_services
    start_optional_services
    health_check
    display_info
    
    print_status "Deployment script completed successfully! 🚀"
}

# Cleanup function
cleanup() {
    print_status "Stopping all services..."
    docker compose down
    print_status "Services stopped."
}

# Stop function
stop_services() {
    print_status "Stopping Voxcina Chatbot services..."
    docker compose down
    print_status "All services stopped."
}

# Update function
update_services() {
    print_status "Updating Voxcina Chatbot services..."
    docker compose pull
    docker compose build chatbot
    docker compose up -d
    print_status "Services updated successfully."
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        stop_services
        ;;
    "update")
        update_services
        ;;
    "cleanup")
        cleanup
        ;;
    "logs")
        docker compose logs -f "${2:-chatbot}"
        ;;
    *)
        echo "Usage: $0 {deploy|stop|update|cleanup|logs [service]}"
        echo "  deploy  - Deploy all services (default)"
        echo "  stop    - Stop all services"
        echo "  update  - Update and restart services"
        echo "  cleanup - Stop and remove all containers"
        echo "  logs    - Show logs for specified service (default: chatbot)"
        exit 1
        ;;
esac