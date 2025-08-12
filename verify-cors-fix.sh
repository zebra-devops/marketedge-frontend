#!/bin/bash

echo "🔍 CORS & Auth0 Configuration Verification"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="https://marketedge-backend-production.up.railway.app"
FRONTEND_URL="https://frontend-bnaxvfa9k-zebraassociates-projects.vercel.app"
CALLBACK_URL="${FRONTEND_URL}/callback"

echo "📋 Configuration Check:"
echo "Backend URL: ${BACKEND_URL}"
echo "Frontend URL: ${FRONTEND_URL}"
echo "Callback URL: ${CALLBACK_URL}"
echo ""

# Test 1: Check if backend is accessible
echo "🧪 Test 1: Backend Health Check"
echo "curl -I ${BACKEND_URL}/health || /api/v1/health"

response=$(curl -s -I "${BACKEND_URL}/api/v1/health" 2>/dev/null || curl -s -I "${BACKEND_URL}/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend is accessible${NC}"
else
    echo -e "${RED}❌ Backend is not accessible${NC}"
fi
echo ""

# Test 2: Test CORS preflight for Auth0 URL endpoint
echo "🧪 Test 2: CORS Preflight Check"
echo "curl -X OPTIONS ${BACKEND_URL}/api/v1/auth/auth0-url"

cors_response=$(curl -s -X OPTIONS \
  -H "Origin: ${FRONTEND_URL}" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  "${BACKEND_URL}/api/v1/auth/auth0-url" \
  -w "%{http_code}" -o /dev/null 2>/dev/null)

if [ "$cors_response" = "200" ] || [ "$cors_response" = "204" ]; then
    echo -e "${GREEN}✅ CORS preflight successful (${cors_response})${NC}"
else
    echo -e "${RED}❌ CORS preflight failed (${cors_response})${NC}"
fi
echo ""

# Test 3: Test actual Auth0 URL call with CORS headers
echo "🧪 Test 3: Auth0 URL Endpoint with CORS"
echo "curl -H \"Origin: ${FRONTEND_URL}\" ${BACKEND_URL}/api/v1/auth/auth0-url?redirect_uri=${CALLBACK_URL}"

auth0_response=$(curl -s \
  -H "Origin: ${FRONTEND_URL}" \
  -w "HTTP_CODE:%{http_code}" \
  "${BACKEND_URL}/api/v1/auth/auth0-url?redirect_uri=${CALLBACK_URL}" 2>/dev/null)

http_code=$(echo "$auth0_response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
response_body=$(echo "$auth0_response" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Auth0 URL endpoint accessible (${http_code})${NC}"
    echo "Response preview: $(echo "$response_body" | head -c 100)..."
else
    echo -e "${RED}❌ Auth0 URL endpoint failed (${http_code})${NC}"
    if [ "$http_code" = "000" ]; then
        echo -e "${YELLOW}⚠️  This might indicate a CORS error${NC}"
    fi
fi
echo ""

# Test 4: Check if frontend is accessible  
echo "🧪 Test 4: Frontend Accessibility"
echo "curl -I ${FRONTEND_URL}"

frontend_response=$(curl -s -I "${FRONTEND_URL}" -w "%{http_code}" -o /dev/null 2>/dev/null)
if [ "$frontend_response" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is accessible (${frontend_response})${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible (${frontend_response})${NC}"
fi
echo ""

# Summary
echo "🎯 Quick Fix Commands:"
echo "====================="
echo ""
echo "1. Railway Backend CORS Fix:"
echo "   Add these environment variables to Railway:"
echo "   FRONTEND_URL=${FRONTEND_URL}"
echo "   CORS_ORIGINS=${FRONTEND_URL},http://localhost:3000"
echo ""
echo "2. Auth0 Configuration:"
echo "   Update in Auth0 Dashboard (dev-g8trhgbfdq2sk2m8.us.auth0.com):"
echo "   - Allowed Callback URLs: ${CALLBACK_URL}"
echo "   - Allowed Web Origins: ${FRONTEND_URL}"
echo "   - Allowed Origins (CORS): ${FRONTEND_URL}"
echo ""
echo "3. Test Auth Flow:"
echo "   open ${FRONTEND_URL}"
echo "   Click 'Sign in with Auth0' and verify no CORS errors"
echo ""

# Environment check
echo "📋 Current Frontend Environment:"
echo "================================"
if [ -f .env ]; then
    echo "NEXT_PUBLIC_API_BASE_URL: $(grep NEXT_PUBLIC_API_BASE_URL .env | cut -d= -f2)"
    echo "NEXT_PUBLIC_AUTH0_DOMAIN: $(grep NEXT_PUBLIC_AUTH0_DOMAIN .env | cut -d= -f2)"
    echo "NEXT_PUBLIC_AUTH0_CLIENT_ID: $(grep NEXT_PUBLIC_AUTH0_CLIENT_ID .env | cut -d= -f2)"
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
fi
echo ""

echo "✅ Verification complete. Review output above for any failed tests."