---
date: 2025-12-21T23:42:46+05:30
researcher: Claude Code
git_commit: 79e68c363bac9c377b495c31bdcf8526925ccf4b
branch: feature/project3-and-chart-updates
repository: project_profile
topic: "Slack CSV File Attachment Workflow - Why It May Not Trigger"
tags: [research, codebase, project-3, slack, csv, file-handling, events-api]
status: complete
last_updated: 2025-12-21
last_updated_by: Claude Code
---

# Research: Slack CSV File Attachment Workflow - Why It May Not Trigger

**Date**: 2025-12-21T23:42:46+05:30
**Researcher**: Claude Code
**Git Commit**: 79e68c363bac9c377b495c31bdcf8526925ccf4b
**Branch**: feature/project3-and-chart-updates
**Repository**: project_profile

## Research Question
User sent a CSV file as an attachment to a Slack message. Verify if the workflow got triggered. If not, what are the potential issues?

## Summary

The workflow may not have triggered due to one of several potential causes:

1. **Missing trigger keyword**: The message must start with `add leads:` (with colon) to trigger CSV processing
2. **Slack event timing**: The `files` array may be empty in the message event (Slack API eventual consistency)
3. **File_shared event**: Standalone file uploads trigger `file_shared` event, not the message handler
4. **Server not running or unreachable**: The webhook endpoint must be accessible from Slack

## How The Workflow Works

### Two Trigger Paths for CSV Processing

| Path | Trigger | Event Type | Handler Location |
|------|---------|------------|------------------|
| **Path 1** | Send message `add leads:` with CSV attached | `message` event | `server.py:1146-1174` |
| **Path 2** | Upload CSV directly (no text) | `file_shared` event | `server.py:1005-1126` |

### Path 1: "add leads:" Message with CSV Attachment

When a user sends a message starting with `add leads:` with a CSV file attached:

1. Slack sends a `message` event to `/slack/events`
2. The code checks if `text.lower().startswith("add leads:")` (`server.py:1146`)
3. If yes, it looks for files in `event.get("files", [])` or checks `subtype == "file_share"`
4. If files found, calls `_process_csv_from_message_files()` (`server.py:563-683`)
5. If no files found, returns error message asking for CSV attachment

**Critical check at `server.py:1155`:**
```python
if files or subtype == "file_share":
    if _process_csv_from_message_files(files, channel_id, user_id, thread_ts, thread_ts):
        return jsonify({"ok": True, "message": "Processing CSV attachment..."})
```

### Path 2: Standalone CSV Upload (file_shared event)

When a user uploads a CSV file directly (without message text):

1. Slack sends a `file_shared` event to `/slack/events`
2. The code checks `event_type == "file_shared"` (`server.py:1005`)
3. It fetches file info using `get_file_info(file_id)`
4. If the file is CSV (`is_csv_file()` returns True), it downloads and processes

## Potential Issues

### 1. Missing or Incorrect Trigger Keyword

**Requirement**: Message must start with `add leads:` (plural, with colon)

| What User Sent | Will It Work? | Why? |
|----------------|---------------|------|
| `add leads: [csv attached]` | Yes | Correct format |
| `add lead: [csv attached]` | No | Singular form - different handler (expects inline text, not file) |
| `Add Leads: [csv attached]` | Yes | Case-insensitive |
| `add leads [csv attached]` | No | Missing colon `:` |
| `[just attached csv]` | Maybe | Triggers `file_shared` path instead |

### 2. Empty Files Array (Slack API Timing Issue)

The `_process_csv_from_message_files()` function handles this case with retry logic:

```python
# server.py:595-614
if not files and message_ts:
    # Fetch message from history
    message = get_message_by_timestamp(channel_id, message_ts)
    if message:
        files = message.get("files", [])

    # If still no files, wait 2 seconds and retry
    if not files:
        time.sleep(2)
        message = get_message_by_timestamp(channel_id, message_ts)
```

This is already handled, but the retry only waits 2 seconds. If Slack's eventual consistency takes longer, the file may not be found.

### 3. File Not Detected as CSV

The `is_csv_file()` function at `slack_file_handler.py:131-170` uses 3-tier detection:

| Tier | Check | Example |
|------|-------|---------|
| 1 | MIME type | `text/csv`, `application/csv`, `text/comma-separated-values` |
| 2 | File extension | `.csv` |
| 3 | Slack filetype field | `filetype == "csv"` |

If the file doesn't match any of these, it won't be processed. Check the server logs for:
```
[DEBUG] Checking file type for 'filename'
[DEBUG]   mimetype: <value>
[DEBUG]   filetype: <value>
[DEBUG]   extension: <value>
```

### 4. Server Not Running or Unreachable

To verify the server is running and receiving events:

```bash
# Check if server is running
curl http://localhost:8080/health

# Check server logs for incoming requests
# Look for: [REQUEST] POST /slack/events
```

### 5. Slack App Configuration Issues

Required Slack app settings:

| Setting | Requirement |
|---------|-------------|
| Event Subscriptions | Enabled with correct Request URL |
| Subscribe to Events | `file_shared`, `message.channels` (or `message.groups`) |
| OAuth Scopes | `files:read`, `chat:write`, `channels:history` |
| Bot Token | Set as `SLACK_BOT_TOKEN` env var |
| Signing Secret | Set as `SLACK_SIGNING_SECRET` env var |

### 6. Race Condition with file_shared Event

When a message with an attachment is sent, Slack may send BOTH:
- A `message` event (with or without files array)
- A `file_shared` event

The code handles this with file locking (`server.py:105-136`):
```python
_processing_files = {}  # Dict[file_id, dict] - tracks files currently being processed
_processing_files_lock = threading.Lock()
```

If `file_shared` arrives first and acquires the lock, the message handler skips processing.

## How to Verify if Workflow Triggered

Check the server logs for these debug messages:

**If "add leads:" was received:**
```
[DEBUG] Message event - text: 'add leads:', subtype: file_share, files_count: N
[DEBUG] add leads (plural) detected, files: N, subtype: file_share
```

**If file was found:**
```
[DEBUG] Found CSV attachment in message: filename.csv
[DEBUG] Processing CSV attachment: filename.csv
```

**If processing started:**
```
[DEBUG] File downloaded to: /tmp/slack_filename_xxx.csv
[DEBUG] Agent initialized, starting processing...
[DEBUG] Processing complete. Status: complete
[DEBUG] Results posted to Slack thread
```

## Code References

| File | Lines | Description |
|------|-------|-------------|
| `Project_3/server.py` | 1146-1174 | "add leads:" message handler |
| `Project_3/server.py` | 1005-1126 | `file_shared` event handler |
| `Project_3/server.py` | 563-683 | `_process_csv_from_message_files()` function |
| `Project_3/src/tools/slack_file_handler.py` | 131-170 | `is_csv_file()` CSV detection |
| `Project_3/src/tools/slack_file_handler.py` | 88-128 | `get_file_info()` Slack API call |
| `Project_3/src/tools/slack_file_handler.py` | 173-226 | `download_slack_file()` download logic |

## Verification Checklist

- [ ] Message starts with `add leads:` (not "add lead:" or "add leads" without colon)
- [ ] Server is running and accessible from internet (check `/health` endpoint)
- [ ] Slack Events API URL is configured correctly
- [ ] Bot has required OAuth scopes (`files:read`, `chat:write`, `channels:history`)
- [ ] `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` are set in environment
- [ ] Check server logs for incoming Slack events
- [ ] Verify the file extension is `.csv` or MIME type is `text/csv`

## Related Research

- `thoughts/shared/research/2025-12-21-slack-add-leads-csv-not-triggering.md` - Prior research on this issue
- `thoughts/shared/research/2025-12-21-slack-csv-automation.md` - CSV automation research
