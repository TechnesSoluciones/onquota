#!/bin/bash
# ============================================================================
# OnQuota Production Diagnostic Script
# ============================================================================
# This script helps diagnose deployment issues on the production server
#
# Usage:
#   ssh root@91.98.42.19 'bash -s' < deployment/diagnose-production.sh
#   OR
#   scp deployment/diagnose-production.sh root@91.98.42.19:/tmp/
#   ssh root@91.98.42.19 'bash /tmp/diagnose-production.sh'
# ============================================================================

set -e

echo "============================================================================"
echo "OnQuota Production Diagnostics"
echo "============================================================================"
echo "Server: $(hostname)"
echo "Date: $(date)"
echo "User: $(whoami)"
echo ""

# Change to OnQuota directory
cd /opt/onquota

echo "============================================================================"
echo "1. Container Status"
echo "============================================================================"
docker compose -f docker-compose.production.yml ps
echo ""

echo "============================================================================"
echo "2. Running Containers (raw docker ps)"
echo "============================================================================"
docker ps --filter "name=onquota" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
echo ""

echo "============================================================================"
echo "3. Backend Container Details"
echo "============================================================================"
if docker ps | grep -q "onquota-backend"; then
    echo "Backend Container: RUNNING"
    echo ""

    # Get image hash
    echo "Image Details:"
    docker inspect onquota-backend --format='{{.Config.Image}}' || echo "Failed to get image"
    docker inspect onquota-backend --format='{{.Image}}' || echo "Failed to get image hash"
    echo ""

    # Check if wget is available
    echo "Checking tools in container:"
    echo -n "  curl: "
    docker exec onquota-backend which curl > /dev/null 2>&1 && echo "INSTALLED" || echo "NOT FOUND"
    echo -n "  wget: "
    docker exec onquota-backend which wget > /dev/null 2>&1 && echo "INSTALLED" || echo "NOT FOUND"
    echo ""

    # Test health endpoint with curl
    echo "Testing health endpoint (curl):"
    docker exec onquota-backend curl -s http://localhost:8000/api/v1/health | head -n 5 || echo "FAILED"
    echo ""

    # Test health endpoint with wget (if available)
    echo "Testing health endpoint (wget):"
    docker exec onquota-backend wget -q -O- http://localhost:8000/api/v1/health 2>&1 | head -n 5 || echo "wget not available or failed"
    echo ""

    # Check backend logs for rate limiter config
    echo "Rate Limiter Configuration (from logs):"
    docker compose -f docker-compose.production.yml logs backend 2>&1 | grep -i "rate_limiting" | tail -n 5 || echo "No rate limiting logs found"
    echo ""

else
    echo "Backend Container: NOT RUNNING"
fi

echo "============================================================================"
echo "4. Frontend Container Details"
echo "============================================================================"
if docker ps | grep -q "onquota-frontend"; then
    echo "Frontend Container: RUNNING"
    echo ""

    # Get image hash
    echo "Image Details:"
    docker inspect onquota-frontend --format='{{.Config.Image}}' || echo "Failed to get image"
    docker inspect onquota-frontend --format='{{.Image}}' || echo "Failed to get image hash"
    echo ""

    # Test health endpoint
    echo "Testing health endpoint:"
    docker exec onquota-frontend curl -s http://localhost:3001/api/health 2>&1 | head -n 5 || echo "FAILED"
    echo ""
else
    echo "Frontend Container: NOT RUNNING"
fi

echo "============================================================================"
echo "5. Redis Status"
echo "============================================================================"
if docker ps | grep -q "onquota-redis"; then
    echo "Redis Container: RUNNING"
    echo ""

    # Load Redis password from env
    if [ -f .env.production ]; then
        export $(grep REDIS_PASSWORD .env.production | xargs)
    fi

    # Test Redis connectivity
    echo "Redis Connectivity:"
    docker compose -f docker-compose.production.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping 2>&1 || echo "FAILED"

    echo ""
    echo "Redis Key Count:"
    docker compose -f docker-compose.production.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning DBSIZE 2>&1 || echo "FAILED"
    echo ""
else
    echo "Redis Container: NOT RUNNING"
fi

echo "============================================================================"
echo "6. Network Configuration"
echo "============================================================================"
echo "OnQuota Network:"
docker network inspect copilot-app_copilot-network 2>&1 | grep -A 5 "onquota" || echo "No OnQuota containers found in network"
echo ""

echo "============================================================================"
echo "7. Recent Backend Logs (last 20 lines)"
echo "============================================================================"
docker compose -f docker-compose.production.yml logs --tail=20 backend 2>&1 || echo "Failed to get logs"
echo ""

echo "============================================================================"
echo "8. Image Tags vs Running Containers"
echo "============================================================================"
echo "Expected IMAGE_TAG from .env:"
if [ -f .env.production ]; then
    grep IMAGE_TAG .env.production || echo "IMAGE_TAG not set"
else
    echo ".env.production not found"
fi
echo ""

echo "Actual running images:"
docker ps --filter "name=onquota" --format "{{.Names}}: {{.Image}}"
echo ""

echo "Available images in registry cache:"
docker images | grep "onquota" | head -n 10
echo ""

echo "============================================================================"
echo "9. External Health Check Test (via Caddy)"
echo "============================================================================"
echo "Testing backend health endpoint (external):"
curl -s -w "\nHTTP Status: %{http_code}\n" https://api.onquota.app/health 2>&1 | head -n 10 || echo "FAILED"
echo ""

echo "Testing frontend health endpoint (external):"
curl -s -w "\nHTTP Status: %{http_code}\n" https://onquota.app/api/health 2>&1 | head -n 10 || echo "FAILED"
echo ""

echo "============================================================================"
echo "10. Test Login Endpoint"
echo "============================================================================"
echo "Testing login endpoint availability:"
curl -s -X POST https://api.onquota.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"invalid"}' \
  -w "\nHTTP Status: %{http_code}\n" 2>&1 | head -n 15
echo ""

echo "============================================================================"
echo "Diagnostics Complete"
echo "============================================================================"
echo ""
echo "Summary:"
echo "--------"
echo "1. Check if containers are running and healthy"
echo "2. Verify image tags match expected deployment"
echo "3. Confirm health endpoints are accessible"
echo "4. Review logs for errors or misconfigurations"
echo "5. Test external endpoints through Caddy proxy"
echo ""
echo "Next Steps:"
echo "-----------"
echo "- If images don't match: Re-run deployment workflow"
echo "- If health checks fail: Check container logs"
echo "- If Redis fails: Verify password configuration"
echo "- If login endpoint errors: Check CORS and rate limiting"
echo ""
