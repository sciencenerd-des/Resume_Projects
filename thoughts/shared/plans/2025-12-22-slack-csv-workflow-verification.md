# Slack CSV Workflow Verification & Fix Implementation Plan

## Overview

The Slack CSV file attachment workflow is not triggering despite the server running. This plan provides a systematic verification process to identify and fix the root cause.

## Current State Analysis

**Symptoms:**
- User sent CSV file attachment with `add leads:` trigger - nothing happened
- User tried `add lead:`, `add leads:`, and bare CSV upload - none worked
- Server is running locally on port 8080
- No error messages shown in Slack
- No indication server received any events

**Root Cause Hypothesis:**
Slack events are not reaching the local server. The most likely causes (in order of probability):

1. **ngrok not running** - Local server isn't exposed to the internet
2. **Slack app URL not configured** - Events API URL not set or outdated
3. **Bot not in channel** - Bot can't receive events from channels it's not in
4. **Event subscriptions not enabled** - `message.channels` and `file_shared` events not subscribed

### Key Discoveries:
- `diagnose_slack.sh` exists and checks all critical components
- Server validates `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` at startup (`server.py:69-86`)
- Server has comprehensive debug logging for incoming requests (`server.py:204-215`)

## Desired End State

After this plan is complete:
- Slack events successfully reach the server
- `add leads:` with CSV attachment triggers lead processing
- Server logs show `[REQUEST] POST /slack/events` entries
- Processing results are posted back to Slack channel

### How to Verify:
1. Send `add leads:` with CSV in Slack → Server logs show incoming event
2. CSV is downloaded and processed → Results posted as reply in Slack thread

## What We're NOT Doing

- Not modifying server code (unless verification reveals a bug)
- Not changing the trigger keywords
- Not implementing new features
- Not setting up production deployment

## Implementation Approach

This is a **verification-first** approach. We'll systematically check each component in the chain before making any changes.

---

## Phase 1: Run Diagnostic Script

### Overview
Use the existing diagnostic script to identify which component is failing.

### Steps:

#### 1. Run the diagnostic script
**Command**:
```bash
cd /Users/biswajitmondal/Developer/project_profile/Project_3 && chmod +x diagnose_slack.sh && ./diagnose_slack.sh
```

#### 2. Interpret results

| Step | Expected Output | If Failing |
|------|-----------------|------------|
| Step 1: Server running | `✓ Server is running on port 8080` | Start server: `python server.py` |
| Step 2: Local connectivity | `✓ Local server is responding` | Check if port 8080 is blocked |
| Step 3: ngrok running | `✓ ngrok is running` | Start ngrok: `ngrok http 8080` |
| Step 4: ngrok URL | Shows `https://xxxx.ngrok-free.app` | Check ngrok dashboard |
| Step 5: Tunnel works | `✓ ngrok tunnel is working` | Restart ngrok |
| Step 6: Events endpoint | `✓ Slack events endpoint is responding` | Check server logs |

### Success Criteria:

#### Automated Verification:
- [ ] All 6 diagnostic steps pass with green checkmarks
- [ ] ngrok URL is displayed and copied to clipboard

#### Manual Verification:
- [ ] Can access ngrok URL in browser: `https://xxxx.ngrok-free.app/`
- [ ] Server root endpoint returns JSON with service info

---

## Phase 2: Configure Slack App Events URL

### Overview
Update the Slack app's Event Subscriptions URL to point to your current ngrok URL.

### Steps:

#### 1. Get current ngrok URL
From Phase 1, you should have the URL. If not:
```bash
curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['tunnels'][0]['public_url'])"
```

#### 2. Update Slack App Event Subscriptions

1. Go to: https://api.slack.com/apps
2. Select your Lead Processor app
3. Click **Event Subscriptions** in the sidebar
4. Toggle **Enable Events** to ON (if not already)
5. In **Request URL** field, enter:
   ```
   https://YOUR-NGROK-URL.ngrok-free.app/slack/events
   ```
6. Wait for green **Verified ✓** checkmark
7. Click **Save Changes**

#### 3. Verify Event Subscriptions are enabled

Under **Subscribe to bot events**, ensure these are listed:
- `message.channels` - For messages in public channels
- `file_shared` - For file upload events

If missing, click **Add Bot User Event** and add them.

### Success Criteria:

#### Automated Verification:
- [ ] Diagnostic script Step 6 passes: Events endpoint responds to challenge

#### Manual Verification:
- [ ] Slack app shows green "Verified ✓" next to Request URL
- [ ] Both `message.channels` and `file_shared` events are subscribed

---

## Phase 3: Verify Bot Channel Membership

### Overview
The bot must be a member of the channel to receive events from it.

### Steps:

#### 1. Check if bot is in your test channel

In Slack:
1. Go to your test channel
2. Click the channel name at the top
3. Click **Integrations** tab (or **Members** depending on Slack version)
4. Look for your bot in the list

#### 2. If bot is NOT in the channel

Type in the channel:
```
/invite @YourBotName
```

Or:
1. Click **Add an app** in channel details
2. Search for and add your bot

### Success Criteria:

#### Manual Verification:
- [ ] Bot appears in channel member list
- [ ] No error when inviting bot (already present is fine)

---

## Phase 4: Verify OAuth Scopes

### Overview
The bot needs specific OAuth scopes to read files and post messages.

### Steps:

#### 1. Check current scopes

1. Go to: https://api.slack.com/apps
2. Select your app
3. Click **OAuth & Permissions**
4. Scroll to **Scopes** → **Bot Token Scopes**

#### 2. Required scopes

Ensure these are present:

| Scope | Purpose |
|-------|---------|
| `files:read` | Download CSV file attachments |
| `chat:write` | Post processing results to channel |
| `channels:history` | Read message history (for retry logic) |

#### 3. If scopes are missing

1. Click **Add an OAuth Scope**
2. Add the missing scope
3. **Reinstall the app** (prompted at top of page)
4. Update `SLACK_BOT_TOKEN` in `.env` with new token

### Success Criteria:

#### Manual Verification:
- [ ] All three required scopes are listed
- [ ] If scopes were added, app was reinstalled and token updated

---

## Phase 5: Test the Integration

### Overview
Send a test message to verify the complete flow works.

### Steps:

#### 1. Monitor server logs

In a terminal, watch the server output:
```bash
# If server is running in foreground, watch that terminal
# If running in background, check logs or restart in foreground:
cd /Users/biswajitmondal/Developer/project_profile/Project_3
python server.py
```

#### 2. Send test message (single lead)

In your Slack channel, type:
```
add lead: test@example.com Test User, Test Company
```

**Expected server log output:**
```
[REQUEST] POST /slack/events
[FROM] <ip-address>
[SLACK] Request from Slack detected
[DEBUG] Event type: message
[DEBUG] add lead command detected: test@example.com Test User, Test Company
```

#### 3. Send test CSV

Create a test CSV file `test_leads.csv`:
```csv
email,name,company
lead1@example.com,Lead One,Company A
lead2@example.com,Lead Two,Company B
```

In Slack:
1. Type `add leads:` in the message field
2. Attach `test_leads.csv`
3. Send the message

**Expected server log output:**
```
[DEBUG] Message event - text: 'add leads:', subtype: file_share, files_count: 1
[DEBUG] add leads (plural) detected, files: 1, subtype: file_share
[DEBUG] Found CSV attachment in message: test_leads.csv
[DEBUG] Processing CSV attachment: test_leads.csv
```

### Success Criteria:

#### Automated Verification:
- [ ] Server logs show `[REQUEST] POST /slack/events` for each message sent

#### Manual Verification:
- [ ] `add lead:` test receives processing result in Slack
- [ ] `add leads:` with CSV receives processing result in Slack thread
- [ ] Results show correct lead counts and scores

---

## Phase 6: Troubleshooting (If Tests Fail)

### Overview
If Phase 5 tests fail, use this decision tree to identify the issue.

### Decision Tree:

```
Server logs show [REQUEST] POST /slack/events?
├── NO → Events not reaching server
│   ├── Check ngrok is running: `lsof -ti:4040`
│   ├── Check Slack app URL matches ngrok URL
│   └── Check Slack app Event Subscriptions is enabled
│
└── YES → Events reaching server, processing fails
    │
    └── Check for error messages in logs:
        ├── "Signature verification FAILED"
        │   └── Check SLACK_SIGNING_SECRET in .env
        │
        ├── "Bot message ignored"
        │   └── Your message is being sent by a bot, use human account
        │
        ├── "No CSV file found"
        │   └── File not detected as CSV - check file extension
        │
        ├── "SLACK_BOT_TOKEN not configured"
        │   └── Check .env has valid bot token
        │
        └── "Download failed"
            └── Check bot has `files:read` scope
```

### Common Fixes:

#### Fix 1: ngrok URL Changed
ngrok free tier generates new URL on each restart. Update Slack app:
```bash
./diagnose_slack.sh  # Get new URL
# Then update in Slack app Event Subscriptions
```

#### Fix 2: Signature Verification Failed
Regenerate signing secret:
1. Go to Slack app → **Basic Information**
2. Under **App Credentials**, click **Regenerate** for Signing Secret
3. Update `SLACK_SIGNING_SECRET` in `.env`
4. Restart server

#### Fix 3: Bot Token Invalid
1. Go to Slack app → **OAuth & Permissions**
2. Click **Reinstall to Workspace**
3. Copy new **Bot User OAuth Token**
4. Update `SLACK_BOT_TOKEN` in `.env`
5. Restart server

### Success Criteria:

#### Manual Verification:
- [ ] Root cause identified from decision tree
- [ ] Fix applied and integration working

---

## Testing Strategy

### Integration Test Flow:
1. Run `./diagnose_slack.sh` - all steps pass
2. Send `add lead: test@example.com Test, Company` - result posted
3. Send `add leads:` with CSV - result posted
4. Upload bare CSV (no text) - result posted via `file_shared` path

### Edge Cases to Verify:
- [ ] Case variations: `Add Leads:`, `ADD LEADS:`
- [ ] CSV with different MIME types (some apps send `application/octet-stream`)
- [ ] Large CSV file (>100 leads)
- [ ] Invalid CSV format (missing headers)

---

## Quick Reference: Required Configuration

### Environment Variables (.env):
```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
```

### Slack App Settings:
| Setting | Location | Value |
|---------|----------|-------|
| Event Subscriptions URL | Event Subscriptions | `https://xxx.ngrok-free.app/slack/events` |
| Bot Events | Event Subscriptions | `message.channels`, `file_shared` |
| Bot Scopes | OAuth & Permissions | `files:read`, `chat:write`, `channels:history` |

### Running Services:
```bash
# Terminal 1: Server
cd Project_3 && python server.py

# Terminal 2: ngrok
ngrok http 8080
```

---

## References

- Research report: `Project_3/research_report.md`
- Diagnostic script: `Project_3/diagnose_slack.sh`
- Server implementation: `Project_3/server.py`
- Slack file handler: `Project_3/src/tools/slack_file_handler.py`
- Environment template: `Project_3/.env.example`
