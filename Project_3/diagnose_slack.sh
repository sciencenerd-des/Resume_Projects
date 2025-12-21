#!/bin/bash
# Diagnostic script to troubleshoot Slack integration issues
#
# Usage: ./diagnose_slack.sh
#
# This script will:
# 1. Check if server.py is running
# 2. Check if ngrok is running
# 3. Get current ngrok URL
# 4. Test local server connectivity
# 5. Test ngrok tunnel connectivity
# 6. Test Slack webhook endpoint

echo "============================================================"
echo "SLACK INTEGRATION DIAGNOSTIC TOOL"
echo "============================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if server.py is running
echo "Step 1: Checking if server.py is running..."
if lsof -ti:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running on port 8080${NC}"
else
    echo -e "${RED}✗ Server is NOT running on port 8080${NC}"
    echo "  To start server: cd Project_3 && python server.py"
    exit 1
fi
echo ""

# Step 2: Test local server health
echo "Step 2: Testing local server connectivity..."
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Local server is responding${NC}"
    echo "  Server response:"
    curl -s http://localhost:8080/ | python3 -m json.tool | sed 's/^/    /'
else
    echo -e "${RED}✗ Local server is not responding${NC}"
    exit 1
fi
echo ""

# Step 3: Check if ngrok is running
echo "Step 3: Checking if ngrok is running..."
if lsof -ti:4040 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ ngrok is running (web interface on port 4040)${NC}"
else
    echo -e "${RED}✗ ngrok is NOT running${NC}"
    echo "  To start ngrok: ngrok http 8080"
    exit 1
fi
echo ""

# Step 4: Get current ngrok URL
echo "Step 4: Getting current ngrok URL..."
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['tunnels'][0]['public_url'] if data.get('tunnels') else 'none')" 2>/dev/null)

if [ "$NGROK_URL" != "none" ] && [ ! -z "$NGROK_URL" ]; then
    # Convert http to https
    NGROK_URL_HTTPS="${NGROK_URL/http:/https:}"
    echo -e "${GREEN}✓ ngrok URL found: $NGROK_URL_HTTPS${NC}"

    # Save to clipboard if pbcopy available (macOS)
    if command -v pbcopy &> /dev/null; then
        echo "$NGROK_URL_HTTPS" | pbcopy
        echo -e "${YELLOW}  📋 URL copied to clipboard!${NC}"
    fi
else
    echo -e "${RED}✗ Could not retrieve ngrok URL${NC}"
    echo "  Check ngrok status at: http://localhost:4040"
    exit 1
fi
echo ""

# Step 5: Test ngrok tunnel
echo "Step 5: Testing ngrok tunnel connectivity..."
if curl -s "$NGROK_URL_HTTPS/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ ngrok tunnel is working${NC}"
    echo "  Response from ngrok URL:"
    curl -s "$NGROK_URL_HTTPS/" | python3 -m json.tool | sed 's/^/    /'
else
    echo -e "${RED}✗ ngrok tunnel is not responding${NC}"
    exit 1
fi
echo ""

# Step 6: Test Slack events endpoint
echo "Step 6: Testing Slack events endpoint..."
CHALLENGE_RESPONSE=$(curl -s -X POST "$NGROK_URL_HTTPS/slack/events" \
    -H "Content-Type: application/json" \
    -d '{"type":"url_verification","challenge":"test123"}')

if echo "$CHALLENGE_RESPONSE" | grep -q "test123"; then
    echo -e "${GREEN}✓ Slack events endpoint is responding correctly${NC}"
    echo "  Response: $CHALLENGE_RESPONSE"
else
    echo -e "${RED}✗ Slack events endpoint failed verification test${NC}"
    echo "  Response: $CHALLENGE_RESPONSE"
fi
echo ""

# Step 7: Provide next steps
echo "============================================================"
echo "NEXT STEPS TO FIX SLACK INTEGRATION:"
echo "============================================================"
echo ""
echo "1. Update Slack Event Subscriptions URL:"
echo "   Go to: https://api.slack.com/apps"
echo "   → Select your app"
echo "   → Click 'Event Subscriptions'"
echo "   → Update Request URL to:"
echo ""
echo -e "   ${GREEN}$NGROK_URL_HTTPS/slack/events${NC}"
echo ""
echo "   → Wait for green 'Verified ✓' checkmark"
echo ""
echo "2. Verify bot is added to your Slack channel:"
echo "   In your Slack channel, check member list for bot"
echo "   If not present, type: /invite @<bot-name>"
echo ""
echo "3. Verify bot has required scopes:"
echo "   Go to: https://api.slack.com/apps → Your App → OAuth & Permissions"
echo "   Required scopes:"
echo "   - files:read"
echo "   - chat:write"
echo "   - channels:history"
echo ""
echo "4. Verify event subscriptions:"
echo "   Go to: https://api.slack.com/apps → Your App → Event Subscriptions"
echo "   Required events:"
echo "   - message.channels"
echo "   - file_shared"
echo ""
echo "5. Test the integration:"
echo "   In Slack channel, send:"
echo "   add lead: test@example.com Test User, Test Company"
echo ""
echo "   Monitor server.py terminal for logs showing the request"
echo ""
echo "============================================================"
echo "IMPORTANT: ngrok URL changes every restart on free plan!"
echo "Remember to update Slack URL after each ngrok restart"
echo "============================================================"
