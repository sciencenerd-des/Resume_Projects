---
title: "Slack Socket Mode Prevents Webhook Event Delivery"
category: integration-issues
component: slack-events-api
severity: critical
symptoms:
  - Slack events not reaching server
  - No requests in ngrok logs from Slack
  - Bot appears configured correctly but silent
  - Event Subscriptions URL shows "Verified" but events don't arrive
root_cause: socket-mode-enabled
tags:
  - slack
  - webhook
  - socket-mode
  - events-api
  - ngrok
date_solved: 2025-12-22
time_to_solve: 45min
environment: development
slack_sdk_version: N/A (HTTP webhook)
---

# Slack Socket Mode Prevents Webhook Event Delivery

## Problem Summary

Slack Events API webhook requests were not reaching the Flask server despite:
- Server running correctly on port 8080
- ngrok tunnel active and accessible
- Event Subscriptions URL showing "Verified ✓"
- All required OAuth scopes configured (`channels:history`, `files:read`, `chat:write`)
- Bot invited to the channel
- Correct event subscriptions (`message.channels`, `file_shared`)

## Symptoms

1. **No server logs** - No `[REQUEST] POST /slack/events` entries
2. **No ngrok requests** - Running `curl http://localhost:4040/api/requests/http` showed no Slack requests after test messages
3. **Silent failure** - No error messages in Slack, no indication of failure
4. **Misleading UI** - Slack's Event Subscriptions page showed green "Verified ✓" checkmark

## Investigation Steps

### What We Checked (All Passed)

```bash
# 1. Token validation
curl -H "Authorization: Bearer $SLACK_BOT_TOKEN" https://slack.com/api/auth.test
# Result: {"ok": true, "team": "CRM", ...}

# 2. OAuth scopes
# x-oauth-scopes header showed: channels:history, files:read, chat:write, groups:history

# 3. Server health
curl http://localhost:8080/health
# Result: {"status": "ok"}

# 4. ngrok tunnel
curl https://xxx.ngrok-free.app/slack/events -X POST -d '{"type":"url_verification","challenge":"test"}'
# Result: {"challenge":"test"}

# 5. ngrok request log
curl http://localhost:4040/api/requests/http
# Result: No Slackbot requests after test messages (only curl tests)
```

### The Missing Clue

In the Slack Event Subscriptions page, below the Request URL field:

> **"Socket Mode is enabled. You won't need to specify a Request URL."**

## Root Cause

**Socket Mode was enabled** in the Slack app configuration.

When Socket Mode is ON:
- Slack does NOT send HTTP POST requests to webhook URLs
- The app must connect TO Slack via WebSocket (outbound connection)
- The "Verified ✓" checkmark is misleading - it only verifies the URL responds, not that events will be sent there
- All webhook-based event delivery is disabled

### Why This Happens

Socket Mode is designed for:
- Development without exposing public URLs
- Apps behind firewalls
- Faster local development iteration

But it's **incompatible** with HTTP webhook servers like Flask + ngrok.

## Solution

### Option 1: Disable Socket Mode (Recommended for HTTP Webhooks)

1. Go to: https://api.slack.com/apps → Your App → **Socket Mode**
2. Toggle OFF "Enable Socket Mode"
3. Return to **Event Subscriptions**
4. Verify the Socket Mode warning is gone
5. Click **Save Changes**
6. Test by sending a message in Slack

### Option 2: Implement Socket Mode in Server

If Socket Mode is required, rewrite server to use Slack Bolt SDK with WebSocket:

```python
# Requires: pip install slack-bolt
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

app = App(token=os.environ["SLACK_BOT_TOKEN"])

@app.event("message")
def handle_message(event, say):
    if event.get("text", "").lower().startswith("add lead:"):
        # Process lead...
        say("Lead processed!")

if __name__ == "__main__":
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
```

Note: Socket Mode requires an **App-Level Token** (`xapp-...`), not just a Bot Token.

## Prevention Strategies

### 1. Add Socket Mode Check to Diagnostic Script

```bash
# In diagnose_slack.sh, add:
echo "Step 7: Checking Socket Mode status..."
echo "⚠️  IMPORTANT: Verify Socket Mode is DISABLED in Slack app settings"
echo "   Go to: https://api.slack.com/apps → Your App → Socket Mode"
echo "   If 'Enable Socket Mode' is ON, webhook events will NOT be delivered"
```

### 2. Document in README

Add to Project_3/README.md:

```markdown
## Slack App Configuration

> ⚠️ **CRITICAL**: Socket Mode must be DISABLED for webhook events to work.
>
> Go to: https://api.slack.com/apps → Your App → Socket Mode → Toggle OFF
```

### 3. Add Server Startup Warning

```python
# In server.py startup
print("=" * 60)
print("⚠️  REMINDER: Ensure Socket Mode is DISABLED in Slack app")
print("   Socket Mode prevents HTTP webhook delivery")
print("=" * 60)
```

## Verification Checklist

After fixing, verify with:

- [ ] Socket Mode is OFF in Slack app settings
- [ ] Event Subscriptions page does NOT show "Socket Mode is enabled" warning
- [ ] Send test message: `add lead: test@example.com Test, Company`
- [ ] Check ngrok logs: `curl http://localhost:4040/api/requests/http | grep Slackbot`
- [ ] Verify server logs show `[REQUEST] POST /slack/events`
- [ ] Confirm Slack shows bot response

## Related Documentation

- [Slack Socket Mode Guide](https://api.slack.com/apis/connections/socket)
- [Slack Events API](https://api.slack.com/events-api)
- `Project_3/diagnose_slack.sh` - Diagnostic script
- `thoughts/shared/plans/2025-12-22-slack-csv-workflow-verification.md` - Full verification plan

## Key Learnings

1. **"Verified ✓" doesn't mean "Working"** - URL verification only checks if the endpoint responds to challenges
2. **Check for competing modes** - Socket Mode and HTTP webhooks are mutually exclusive
3. **No events in logs = delivery problem** - If server works but no Slack requests, the issue is on Slack's side
4. **Read the fine print** - The Socket Mode warning was displayed but easy to overlook

## Timeline

| Time | Action |
|------|--------|
| 0:00 | Reported: CSV attachment not triggering workflow |
| 0:05 | Verified server, ngrok, scopes all correct |
| 0:15 | Noticed no Slack requests in ngrok logs |
| 0:25 | Checked Slack app settings, found Socket Mode enabled |
| 0:30 | Disabled Socket Mode |
| 0:35 | Tested - events now reaching server |
| 0:45 | Documented solution |
