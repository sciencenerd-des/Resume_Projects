---
date: 2025-12-21T02:32:18+0530
researcher: Cursor AI
git_commit: ee7dab90f46e45e0f27940615c5e5f5b492e9ab7
branch: feature/project3-and-chart-updates
repository: project_profile
topic: "Slack 'add leads:' message with CSV attachment not triggering automation"
tags: [research, codebase, project-3, slack, events-api, file-handling]
status: complete
last_updated: 2025-12-21
last_updated_by: Cursor AI
---

# Research: Slack 'add leads:' Message with CSV Attachment Not Triggering Automation

**Date**: 2025-12-21T02:32:18+0530  
**Researcher**: Cursor AI  
**Git Commit**: ee7dab90f46e45e0f27940615c5e5f5b492e9ab7  
**Branch**: feature/project3-and-chart-updates  
**Repository**: project_profile

## Research Question
When sending a Slack message "add leads:" with a CSV file attachment, the automation is not triggering. What conditions must be satisfied for the automation to process leads from Slack?

## Summary

The automation is not triggering due to a combination of the following factors:

1. **Trigger Keyword Mismatch**: The code listens for `add lead:` (singular) but the user is sending `add leads:` (plural). The exact match check at `server.py:523` uses `text.lower().startswith("add lead:")` which will not match "add leads:".

2. **Two Separate Event Paths**: The code has two independent event handlers that do not interact:
   - `file_shared` event handler (lines 454-516) - processes standalone CSV uploads
   - `message` event handler (lines 519-588) - processes `add lead:` text commands
   
   Neither handler checks for CSV files attached to message events.

3. **Message Events with File Attachments**: When a user sends a message with both text AND a file attachment, Slack sends a `message` event that includes a `files` array. The current implementation does not inspect the `files` field within message events—it only processes the text portion.

4. **file_shared Event Timing**: The `file_shared` event is a separate event that fires when a file is uploaded. If the user is posting a message with a file attachment (not using the drag-and-drop upload), the `file_shared` event may or may not fire depending on Slack app configuration and how the file is uploaded.

## Detailed Findings

### Event Handler: `file_shared` (`Project_3/server.py:454-516`)

The `file_shared` event handler processes CSV uploads when:
1. The event type is exactly `file_shared`
2. A `file_id` is present in the event payload
3. The file is determined to be a CSV via `is_csv_file()` check

```python
if event_type == "file_shared":
    file_id = event.get("file_id")
    channel_id = event.get("channel_id")
    ...
    if is_csv_file(file_info):
        # Process the CSV
```

This handler does NOT process files attached to message events—it only handles the dedicated `file_shared` event.

### Event Handler: `message` (`Project_3/server.py:519-588`)

The message event handler triggers when:
1. Event type is `message`
2. The event does NOT have a `bot_id` (to avoid processing bot messages)
3. The message text starts with `add lead:` (case-insensitive)

```python
if event_type == "message" and not event.get("bot_id"):
    text = event.get("text", "")
    if text.lower().startswith("add lead:"):
        # Parse and process single lead from text
```

Key observations:
- The trigger keyword is `add lead:` (singular), not `add leads:` (plural)
- The handler parses lead data from the message TEXT only
- File attachments in the message are completely ignored
- There is no code to check `event.get("files")` within message events

### CSV Detection Logic (`Project_3/src/tools/slack_file_handler.py:117-148`)

The `is_csv_file()` function checks for CSV files via:
1. Mimetype (`text/csv`, `application/csv`, `text/comma-separated-values`)
2. File extension (`.csv`)
3. Slack's `filetype` field (`csv`)

```python
def is_csv_file(file_info: Dict[str, Any]) -> bool:
    if not file_info.get("ok", False):
        return False
    
    file_data = file_info.get("file", {})
    mimetype = file_data.get("mimetype", "")
    if mimetype in ["text/csv", "application/csv", "text/comma-separated-values"]:
        return True
    
    filename = file_data.get("name", "")
    if filename.lower().endswith(".csv"):
        return True
    
    filetype = file_data.get("filetype", "")
    if filetype == "csv":
        return True
    
    return False
```

### Slack Events Subscription Requirements

For the automation to receive events, the Slack app must be subscribed to:
- `file_shared` - for standalone file uploads
- `message.channels` - for messages in public channels
- `message.groups` - for messages in private channels (if needed)

The app also requires these OAuth scopes:
- `files:read` - to fetch file info and download files
- `chat:write` - to post processing results

### Environment Variables Required

From `Project_3/src/tools/slack_file_handler.py:16-23` and `Project_3/README.md:165-170`:

| Variable | Purpose |
|----------|---------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token for API calls |
| `SLACK_SIGNING_SECRET` | Verify requests come from Slack |
| `SLACK_WEBHOOK_URL` | Post notification summaries |

Missing any of these causes the automation to operate in demo/simulated mode.

## Code References

- `Project_3/server.py:399-590` – `/slack/events` endpoint handling all Slack Events API payloads
- `Project_3/server.py:454-516` – `file_shared` event handling for CSV uploads
- `Project_3/server.py:519-588` – `message` event handling for `add lead:` commands
- `Project_3/server.py:523` – The exact text match: `text.lower().startswith("add lead:")`
- `Project_3/src/tools/slack_file_handler.py:117-148` – CSV file type detection logic
- `Project_3/src/tools/slack_file_handler.py:74-114` – `get_file_info()` Slack API call
- `Project_3/src/tools/slack_file_handler.py:151-204` – `download_slack_file()` file download
- `Project_3/README.md:158-170` – Slack app configuration requirements

## Architecture Documentation

The `/slack/events` endpoint in `server.py` receives Events API payloads from Slack. The handler:
1. Responds to URL verification challenges without signature checks
2. Validates request signatures using `X-Slack-Request-Timestamp` and `X-Slack-Signature` headers
3. Dispatches to specialized handlers based on `event.type`:
   - `file_shared` → Download and process CSV files
   - `message` → Check for `add lead:` text commands

File processing and message text processing are completely independent paths. There is no unified handler that processes messages containing both text triggers AND file attachments.

## Documented Trigger Methods (from README)

The README documents three ways to process leads:

1. **Message Command** – `add lead: john@example.com John Doe, Acme Corp`
2. **CSV Upload** – Upload a CSV file to any channel (standalone)
3. **Slash Command** – `/processlead john@example.com John Doe, Acme Corp`

Notably, there is no documented method for sending "add leads:" with a file attachment.

## Root Cause Analysis

The automation is not triggering because:

1. **Exact trigger mismatch**: User sends `add leads:` but code checks for `add lead:` (singular)

2. **No combined handling**: The message event handler does not inspect the `files` array that Slack includes when a message has attachments. A message with text "add leads:" and an attached CSV would:
   - NOT match the `file_shared` handler (different event type)
   - NOT match the `add lead:` text check (plural vs singular)
   - Even if text matched, the file attachment would be ignored

3. **Event subscription uncertainty**: If the Slack app is not subscribed to `file_shared` events, file uploads will never trigger that handler—only the message event would fire.

## Open Questions

1. Is the Slack app subscribed to the `file_shared` event in addition to `message.channels`?
2. Are the environment variables `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` set in the server environment?
3. What does the server log show when the message is sent? (The code has `[DEBUG]` print statements)
4. Does the user want to support "add leads:" (plural) as an alternative trigger?
5. Should the message handler be extended to detect file attachments and process them?

## Related Research

- `thoughts/shared/research/2025-12-21-slack-csv-automation.md` – Prior research on the same feature area

