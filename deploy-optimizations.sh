#!/bin/bash
# Deployment script for image optimization improvements

set -e

echo "🚀 Deploying Image Optimization Improvements to VPS..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Upload nginx config
echo -e "${YELLOW}Step 1: Uploading optimized nginx config...${NC}"
scp nginx-voxcina-optimized.conf vps-ir:/tmp/

# Step 2: Backup and replace nginx config on VPS
echo -e "${YELLOW}Step 2: Backing up and replacing nginx config...${NC}"
ssh vps-ir << 'EOF'
    # Backup current config
    sudo cp /etc/nginx/sites-available/voxcina /etc/nginx/sites-available/voxcina.backup.$(date +%Y%m%d_%H%M%S)
    
    # Replace with new config
    sudo mv /tmp/nginx-voxcina-optimized.conf /etc/nginx/sites-available/voxcina
    
    # Test nginx config
    echo "Testing nginx configuration..."
    sudo nginx -t
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx config test passed"
        sudo systemctl reload nginx
        echo "✅ Nginx reloaded successfully"
    else
        echo "❌ Nginx config test failed! Restoring backup..."
        sudo cp /etc/nginx/sites-available/voxcina.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/voxcina
        exit 1
    fi
EOF

# Step 3: Upload frontend changes
echo -e "${YELLOW}Step 3: Uploading frontend changes...${NC}"
ssh vps-ir "mkdir -p ~/voxcina/front_end/src/components ~/voxcina/front_end/src/app/\(shop\)/products/\[productId\]"

scp front_end/next.config.js vps-ir:~/voxcina/front_end/
scp front_end/src/components/BackendImage.tsx vps-ir:~/voxcina/front_end/src/components/
scp "front_end/src/app/(shop)/products/[productId]/page.tsx" vps-ir:~/voxcina/front_end/src/app/\(shop\)/products/\[productId\]/

# Step 4: Rebuild frontend container
echo -e "${YELLOW}Step 4: Rebuilding frontend container...${NC}"
ssh vps-ir << 'EOF'
    cd ~/voxcina
    
    # Rebuild only frontend
    docker compose up -d --build front_end
    
    echo "Waiting for container to start..."
    sleep 5
    
    # Check if container is running
    if docker ps | grep -q voxcina_frontend; then
        echo "✅ Frontend container is running"
    else
        echo "❌ Frontend container failed to start"
        docker compose logs --tail=50 front_end
        exit 1
    fi
EOF

# Step 5: Verify deployment
echo -e "${YELLOW}Step 5: Verifying deployment...${NC}"
ssh vps-ir << 'EOF'
    echo "Checking nginx status..."
    sudo systemctl status nginx --no-pager | head -5
    
    echo ""
    echo "Checking docker containers..."
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "Testing image serving..."
    curl -I http://localhost/uploads/products/ 2>/dev/null | head -5 || echo "No test image available"
EOF

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Test the site: https://voxcina.com"
echo "2. Check product detail pages load faster"
echo "3. Verify images are cached (check Network tab in browser)"
echo "4. Monitor logs: ssh vps-ir 'docker compose -f ~/voxcina/docker-compose.yml logs -f front_end'"
echo ""
echo "To verify nginx is serving images directly:"
echo "  curl -I https://voxcina.com/uploads/products/... | grep 'X-Served-By'"
echo "  (Should show: X-Served-By: nginx-direct)"
