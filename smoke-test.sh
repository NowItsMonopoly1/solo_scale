#!/bin/bash
# SoloScale Production Smoke Test
# Update RAILWAY_URL with your actual Railway app URL

echo "🚀 SoloScale Production Smoke Test"
echo "=================================="

# Configuration - Update these URLs
VERCEL_URL="https://solo-scale-do5tr3ejp-nowitsmonopoly1s-projects.vercel.app"
RAILWAY_URL="https://primusinsights-production.up.railway.app"

# Test 1: Frontend Accessibility
echo -e "\n1. Testing Frontend Accessibility..."
if curl -s --max-time 10 "$VERCEL_URL" | grep -q "SoloScale"; then
    echo "✅ Frontend live at $VERCEL_URL"
else
    echo "❌ Frontend not accessible or not containing 'SoloScale'"
fi

# Test 2: Backend Health Check
echo -e "\n2. Testing Backend Health..."
if curl -s --max-time 10 "$RAILWAY_URL/health" | grep -q '"status":"ok"'; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    echo "   Make sure RAILWAY_URL is correct and backend is deployed"
fi

# Test 3: Speed Agent API
echo -e "\n3. Testing Speed Agent API..."
RESPONSE=$(curl -s --max-time 10 -X POST "$RAILWAY_URL/api/ai/chat" \
    -H "Content-Type: application/json" \
    -d '{"message": "Hello, test message"}')

if echo "$RESPONSE" | grep -q '"content"'; then
    echo "✅ Speed Agent API responding"
    echo "   Sample response: $(echo "$RESPONSE" | jq -r '.content // "Response received"' | head -c 100)..."
else
    echo "❌ Speed Agent API not responding"
    echo "   Response: $RESPONSE"
fi

echo -e "\n🎯 Smoke Test Complete!"
echo "If all tests pass, SoloScale is production-ready!"
echo ""
echo "Next steps if tests fail:"
echo "1. Check Railway deployment status"
echo "2. Verify environment variables are set"
echo "3. Update RAILWAY_URL with actual Railway app URL"
echo "4. Check Vercel deployment logs"