# Slack Integration Troubleshooting Guide

## Quick Diagnosis

Run the automated diagnostic script:

```bash
cd Project_3
./diagnose_slack.sh
```

This will check:
- ✓ Server is running
- ✓ ngrok is running
- ✓ Current ngrok URL
- ✓ Server connectivity
- ✓ Slack webhook endpoint

## Problem: Slack Messages Not Triggering Agent Pipeline

### Symptoms
- You send "add leads:" message with CSV in Slack
- Nothing happens (no bot response)
- server.py terminal shows NO incoming requests

### Root Cause
Slack webhook events are NOT reaching your server. This is almost always a configuration issue, not a code issue.

## Common Issues & Fixes

### Issue 1: ngrok URL Mismatch (MOST LIKELY)

**Problem:** ngrok generates a NEW random URL every time it restarts (free plan). Your Slack Event Subscriptions URL still points to the OLD, expired URL.

**How to fix:**

1. **Get current ngrok URL:**
   ```bash
   # Option 1: Use diagnostic script
   ./diagnose_slack.sh

   # Option 2: Visit ngrok web interface
   open http://localhost:4040

   # Option 3: Check ngrok terminal
   # Look for: Forwarding https://xxxx.ngrok.io -> http://localhost:8080
   ```

2. **Update Slack Event Subscriptions:**
   - Go to https://api.slack.com/apps
   - Select your Slack app
   - Click "Event Subscriptions" in left sidebar
   - Update "Request URL" to: `https://<current-ngrok-url>/slack/events`
   - Wait for green "Verified ✓" checkmark
   - Click "Save Changes"

3. **Test immediately:**
   ```bash
   # In Slack channel, send:
   add lead: test@example.com Test User, Test Company

   # Watch server.py terminal for logs
   ```

### Issue 2: Bot Not Added to Channel

**Problem:** Bot must be explicitly invited to each Slack channel where you want to use it.

**How to verify:**
- Go to Slack channel
- Click channel name → "Members" tab
- Look for your bot in the list

**How to fix:**
```
In Slack channel, type:
/invite @<your-bot-name>
```

Or:
- Click channel name → "Integrations" tab
- Click "Add apps"
- Find and add your bot

### Issue 3: Missing Bot Scopes

**Problem:** Bot needs specific permissions to receive events and download files.

**Required scopes:**
- `files:read` - Download CSV files
- `chat:write` - Post processing results
- `channels:history` - Read channel messages

**How to fix:**
1. Go to https://api.slack.com/apps → Your App
2. Click "OAuth & Permissions"
3. Under "Bot Token Scopes", verify all 3 scopes exist
4. If any are missing:
   - Click "Add an OAuth Scope"
   - Add the missing scope
   - **Reinstall app** to workspace (button at top of page)

### Issue 4: Event Subscriptions Not Configured

**Problem:** Slack needs to know which events to send to your webhook.

**Required events:**
- `message.channels` - Handle "add lead:" and "add leads:" commands
- `file_shared` - Auto-process CSV uploads

**How to fix:**
1. Go to https://api.slack.com/apps → Your App
2. Click "Event Subscriptions"
3. Verify "Enable Events" toggle is ON
4. Under "Subscribe to bot events", verify both events exist
5. If missing:
   - Click "Add Bot User Event"
   - Select `message.channels`
   - Select `file_shared`
   - Click "Save Changes"

### Issue 5: server.py Not Running

**Problem:** Server is not running or crashed.

**How to verify:**
```bash
lsof -ti:8080
# If no output, server is not running
```

**How to fix:**
```bash
cd Project_3
python server.py
```

Expected startup output:
```
============================================================
LEAD PROCESSOR SERVER - STARTUP DIAGNOSTICS
============================================================
Python version: 3.11.x
Server file: /path/to/server.py
Working directory: /path/to/Project_3
SLACK_BOT_TOKEN: ✓ Configured
SLACK_SIGNING_SECRET: ✓ Configured
SLACK_WEBHOOK_URL: ✓ Configured

FEATURE FLAGS:
  ENABLE_AI_ANALYSIS: ✗ OFF
  DEBUG: ✗ OFF
  DISABLE_SLACK: ✗ OFF (notifications enabled)
============================================================

 * Running on http://0.0.0.0:8080
```

### Issue 6: ngrok Not Running

**Problem:** ngrok tunnel is not active.

**How to verify:**
```bash
lsof -ti:4040
# If no output, ngrok is not running
```

**How to fix:**
```bash
ngrok http 8080
```

**Important:** On free plan, ngrok generates a NEW URL each time! You must update Slack Event Subscriptions URL after EVERY ngrok restart.

## Testing Checklist

Use this checklist to verify everything is configured correctly:

- [ ] server.py is running (`lsof -ti:8080` shows process)
- [ ] ngrok is running (`lsof -ti:4040` shows process)
- [ ] Can access http://localhost:8080/health (returns OK)
- [ ] Can access ngrok URL (visit http://localhost:4040 to get URL)
- [ ] Slack Event Subscriptions URL is updated to current ngrok URL
- [ ] Slack Event Subscriptions shows "Verified ✓"
- [ ] Bot has scopes: files:read, chat:write, channels:history
- [ ] Event subscriptions include: message.channels, file_shared
- [ ] Bot is added to test Slack channel (visible in member list)
- [ ] Environment variables are set in .env:
  - [ ] SLACK_BOT_TOKEN
  - [ ] SLACK_SIGNING_SECRET
  - [ ] SLACK_WEBHOOK_URL
  - [ ] OPENAI_API_KEY

## Testing the Integration

### Test 1: Single Lead

In Slack channel:
```
add lead: test@example.com Test User, Test Company
```

**Expected behavior:**
1. server.py terminal shows:
   ```
   ============================================================
   [REQUEST] POST /slack/events
   [FROM] 54.xxx.xxx.xxx
   [SLACK] Request from Slack detected
   ============================================================

   [DEBUG] Incoming request to /slack/events
   [DEBUG] Event type: message
   [DEBUG] Processing single 'add lead:' command
   ```

2. Slack channel shows (in thread):
   ```
   ✅ Lead Processing Complete
   📊 Results: 1 lead processed
   🔥 HOT: 1 lead
   📝 1 lead synced to Notion CRM
   ```

### Test 2: CSV Batch with "add leads:"

1. Upload a CSV file to Slack channel
2. In the message, type: `add leads: Q4 batch`

**Expected behavior:**
- Bot processes CSV in background
- Posts results to thread with lead counts and scores

### Test 3: Standalone CSV Upload

1. Just upload a CSV file (no text)

**Expected behavior:**
- Bot auto-detects CSV
- Processes automatically
- Posts results to channel

## Debug Logging

server.py has extensive debug logging built-in. When messages arrive, you should see detailed logs like:

```
============================================================
[REQUEST] POST /slack/events
[FROM] 54.173.xxx.xxx
[HEADERS] User-Agent: Slackbot 1.0
[HEADERS] Content-Type: application/json
[SLACK] Request from Slack detected
[SLACK] Timestamp: 1703187234
============================================================

[DEBUG] Incoming request to /slack/events at 2025-12-21T10:30:45
[DEBUG] Raw body size: 1234 bytes
[DEBUG] Request type: event_callback
[DEBUG] Signature verification PASSED
[DEBUG] Event type: message, full event keys: ['type', 'user', 'text', 'ts', 'channel']
[DEBUG] Message event details - text: 'add lead: test@test.com', has_files: False, files_count: 0
[DEBUG] Processing single 'add lead:' command
```

## Still Not Working?

If you've checked everything above and it's still not working:

1. **Check server.py terminal for errors**
   - Any Python exceptions?
   - Any "FAILED" messages?

2. **Check ngrok inspection interface**
   - Visit http://localhost:4040/inspect/http
   - Are requests from Slack showing up?
   - What's the response status code?

3. **Test endpoint manually**
   ```bash
   curl -X POST https://<ngrok-url>/slack/events \
     -H "Content-Type: application/json" \
     -d '{"type":"url_verification","challenge":"test123"}'

   # Should return: {"challenge":"test123"}
   ```

4. **Check Slack App logs**
   - Go to https://api.slack.com/apps → Your App
   - Click "Event Subscriptions"
   - Scroll down to see recent delivery attempts
   - Check for errors

## Production Deployment (Recommended)

For production use, deploy to a cloud provider instead of using ngrok:

**Options:**
- Render.com (free tier)
- Railway.app (free tier)
- Heroku (paid)
- AWS EC2 / DigitalOcean

**Benefits:**
- Permanent URL (no need to update Slack config)
- Better reliability
- No ngrok dependency
- Auto-restart on crashes

**Deployment steps:**
1. Create account on hosting provider
2. Connect GitHub repo or upload code
3. Set environment variables in dashboard
4. Deploy
5. Update Slack Event Subscriptions URL to `https://<your-app>.provider.com/slack/events`
6. Verify and save

## Important Reminders

1. **ngrok URL changes on EVERY restart** (free plan)
   - Must update Slack URL after each restart
   - Consider paid ngrok plan or cloud deployment

2. **Bot must be in EVERY channel** where you want to use it
   - Invite bot to each channel separately

3. **Slack caches verification failures**
   - Wait 1-2 minutes after fixing issues before testing

4. **Port must match**
   - server.py runs on port 8080
   - ngrok must forward to localhost:8080

## Understanding the Architecture

**Current Setup (What Exists):**
```
Slack Message → server.py (Flask webhook) → LeadProcessorAgent → Results
```

**What Does NOT Exist:**
```
❌ Slack Message → OpenAI Agents SDK → main.py → Results
```

The project uses a **custom agent implementation**, not OpenAI's Agents SDK. The comment in requirements.txt is misleading - it uses the standard OpenAI library for AI features, but the automation is handled by Flask webhooks.

main.py is a **CLI tool** for manual processing. It does NOT get triggered by Slack messages. server.py is what handles Slack integration.

## Getting Help

If you're still stuck:

1. Run `./diagnose_slack.sh` and share the output
2. Share the last 50 lines from server.py terminal
3. Share screenshot of Slack Event Subscriptions page
4. Share screenshot of Slack OAuth & Permissions page showing scopes
5. Confirm bot is visible in channel member list
