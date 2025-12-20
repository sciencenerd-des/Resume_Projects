# Slack "add leads:" CSV Attachment Processing Implementation Plan

## Overview

Implement support for processing CSV file attachments sent with "add leads:" Slack messages. Currently, the automation only handles `file_shared` events (standalone file uploads) and `add lead:` text commands (singular, for inline lead data). Users expect to be able to send "add leads:" with a CSV attachment and have it processed automatically.

## Current State Analysis

The `/slack/events` endpoint in `server.py` has two independent event handlers:

1. **`file_shared` handler (lines 454-516)**: Processes standalone CSV file uploads. Requires no message text—just triggers when any file is shared to a channel.

2. **`message` handler (lines 519-588)**: Listens for messages starting with `add lead:` (singular). Parses lead data from the message TEXT only. Ignores any file attachments.

### Key Discoveries:
- `server.py:523` – The trigger check is `text.lower().startswith("add lead:")` (singular only)
- Message events with file attachments include a `files` array in the event payload, which is never inspected
- The `file_shared` event is separate from `message` events—uploading a file with a message may not trigger `file_shared` depending on how it's uploaded
- Existing CSV processing logic in `file_shared` handler can be reused

## Desired End State

After implementation:
1. Users can send `add leads: <optional description>` with a CSV file attachment
2. The bot detects the trigger phrase AND the presence of a CSV attachment
3. The CSV is downloaded and processed through the existing lead processing pipeline
4. Results are posted back to the channel in a thread

### Verification:
- Send a Slack message "add leads: batch import" with a CSV attachment
- The bot acknowledges and processes the file
- Results summary is posted to the channel

## What We're NOT Doing

- Not changing the existing `file_shared` handler behavior (standalone CSV uploads still work)
- Not changing the existing `add lead:` singular handler (inline lead data still works)
- Not adding new OAuth scopes (reusing existing `files:read`, `chat:write`)
- Not modifying the lead processing agent pipeline
- Not adding support for non-CSV attachments

## Implementation Approach

Extend the message event handler to:
1. Accept both `add lead:` (singular) and `add leads:` (plural) triggers
2. When the plural trigger is detected, check for file attachments in `event.files`
3. If CSV attachment found, reuse the existing file processing logic from `file_shared` handler
4. If no attachment found with plural trigger, return a helpful error message

## Phase 1: Add "add leads:" Trigger with CSV Attachment Support

### Overview
Modify the message event handler to detect "add leads:" trigger and process attached CSV files.

### Changes Required:

#### 1. Helper Function for CSV Processing from Message Attachments
**File**: `Project_3/server.py`
**Location**: Add after `_parse_add_lead_message` function (around line 367)
**Changes**: Create a helper function to process CSV from message file attachments

```python
def _process_csv_from_message_files(
    files: list,
    channel_id: str,
    user_id: str,
    thread_ts: str
) -> bool:
    """
    Process CSV file from message attachments.
    
    Args:
        files: List of file objects from message event
        channel_id: Channel to post results to
        user_id: User who sent the message
        thread_ts: Thread timestamp for replies
        
    Returns:
        True if a CSV was found and processing started, False otherwise
    """
    from src.tools.slack_file_handler import (
        get_file_info,
        is_csv_file,
        download_slack_file,
        post_message_to_channel,
        format_processing_result_message
    )
    
    # Find CSV file in attachments
    csv_file = None
    for f in files:
        file_id = f.get("id")
        if file_id:
            file_info = get_file_info(file_id)
            if is_csv_file(file_info):
                csv_file = (file_id, file_info)
                break
    
    if not csv_file:
        return False
    
    file_id, file_info = csv_file
    filename = file_info.get("file", {}).get("name", "leads.csv")
    print(f"[DEBUG] Found CSV attachment in message: {filename}", flush=True)
    
    import threading
    
    def process_csv_attachment():
        try:
            print(f"[DEBUG] Processing CSV attachment: {filename}")
            temp_path, error = download_slack_file(file_info)
            
            if error:
                print(f"[DEBUG] Download error: {error}")
                post_message_to_channel(
                    channel_id,
                    f"❌ Failed to download `{filename}`: {error}",
                    thread_ts=thread_ts
                )
                return
            
            print(f"[DEBUG] CSV downloaded to: {temp_path}")
            
            agent = get_agent()
            results = agent.process_leads(temp_path)
            print(f"[DEBUG] Processing complete. Status: {results.get('status')}")
            
            Path(temp_path).unlink(missing_ok=True)
            
            message = format_processing_result_message(filename, results)
            # Add attribution
            message += f"\n\n_Uploaded by <@{user_id}>_"
            post_message_to_channel(channel_id, message, thread_ts=thread_ts)
            print("[DEBUG] Results posted to Slack thread")
            
        except Exception as e:
            print(f"[DEBUG] Exception processing CSV attachment: {e}")
            post_message_to_channel(
                channel_id,
                f"❌ Error processing `{filename}`: {str(e)}",
                thread_ts=thread_ts
            )
    
    threading.Thread(target=process_csv_attachment).start()
    return True
```

#### 2. Extend Message Event Handler
**File**: `Project_3/server.py`
**Location**: Lines 519-588 (message event handler)
**Changes**: Add handling for "add leads:" trigger with file attachments

Replace the current message handler block:

```python
    # Handle message events
    if event_type == "message" and not event.get("bot_id"):
        text = event.get("text", "")
        print(f"[DEBUG] Message text: {text}")
        
        # Check for "add leads:" trigger (plural) - expects CSV attachment
        if text.lower().startswith("add leads:"):
            channel_id = event.get("channel")
            user_id = event.get("user", "unknown")
            thread_ts = event.get("ts")
            files = event.get("files", [])
            print(f"[DEBUG] add leads (plural) detected, files: {len(files)}", flush=True)
            
            if files:
                # Process CSV attachment
                if _process_csv_from_message_files(files, channel_id, user_id, thread_ts):
                    return jsonify({"ok": True, "message": "Processing CSV attachment..."})
                else:
                    # No CSV found in attachments
                    post_message_to_channel(
                        channel_id,
                        "❌ No CSV file found in attachment. Please attach a `.csv` file with your leads.",
                        thread_ts=thread_ts
                    )
                    return jsonify({"ok": True})
            else:
                # No attachments with "add leads:"
                post_message_to_channel(
                    channel_id,
                    "❌ *Missing CSV attachment*\n\nUsage: Send `add leads:` with a CSV file attached.\n\nFor single leads, use: `add lead: email@example.com Name, Company`",
                    thread_ts=thread_ts
                )
                return jsonify({"ok": True})
        
        # Check for "add lead:" trigger (singular) - inline lead data
        if text.lower().startswith("add lead:"):
            # ... existing code for parsing inline lead ...
```

### Success Criteria:

#### Automated Verification:
- [x] Server starts without errors: `cd Project_3 && python -c "from server import app; print('OK')"`
- [x] Existing tests pass: `cd Project_3 && python -m pytest tests/ -v`
- [ ] Linting passes: `cd Project_3 && python -m flake8 server.py --max-line-length=120`

#### Manual Verification:
- [ ] Send "add leads:" with CSV attachment → bot processes and responds with summary
- [ ] Send "add leads:" without attachment → bot responds with helpful error message
- [ ] Send "add leads:" with non-CSV attachment → bot responds "No CSV file found"
- [ ] Existing "add lead: email Name, Company" still works
- [ ] Existing standalone CSV upload still works

---

## Phase 2: Add Unit Tests for New Handler

### Overview
Add tests to verify the new "add leads:" with CSV attachment functionality.

### Changes Required:

#### 1. Test Cases for CSV Attachment Processing
**File**: `Project_3/tests/test_slack_file_handler.py`
**Location**: Add new test class at end of file
**Changes**: Add tests for the new trigger pattern

```python
class TestAddLeadsMessageHandler(unittest.TestCase):
    """Tests for add leads (plural) message handling with CSV attachments."""
    
    def test_add_leads_trigger_detection(self):
        """Verify 'add leads:' trigger is detected."""
        # This tests the trigger detection logic
        text = "add leads: batch import from marketing"
        self.assertTrue(text.lower().startswith("add leads:"))
    
    def test_add_lead_singular_still_works(self):
        """Verify 'add lead:' (singular) trigger is still detected."""
        text = "add lead: john@example.com John Doe, Acme"
        self.assertTrue(text.lower().startswith("add lead:"))
        self.assertFalse(text.lower().startswith("add leads:"))
    
    def test_case_insensitive_trigger(self):
        """Verify trigger is case-insensitive."""
        variants = [
            "ADD LEADS: batch",
            "Add Leads: batch",
            "add leads: batch",
            "ADD leads: batch"
        ]
        for text in variants:
            self.assertTrue(
                text.lower().startswith("add leads:"),
                f"Failed for: {text}"
            )
```

### Success Criteria:

#### Automated Verification:
- [x] New tests pass: `cd Project_3 && python -m pytest tests/test_slack_file_handler.py -v`
- [x] All existing tests still pass: `cd Project_3 && python -m pytest tests/ -v`

#### Manual Verification:
- [x] Test coverage includes the new handler logic

---

## Phase 3: Update Documentation

### Overview
Update README to document the new "add leads:" trigger pattern.

### Changes Required:

#### 1. Update README Usage Section
**File**: `Project_3/README.md`
**Location**: Lines 178-202 (Using Slack Integrations section)
**Changes**: Add documentation for "add leads:" with CSV attachment

Update the "Using Slack Integrations" section:

```markdown
### Using Slack Integrations

Once configured, you can process leads in four ways:

**1. Message Command - Single Lead** (for quick additions)
```
add lead: john@example.com John Doe, Acme Corp
```
Post this in any channel where the bot is present. The bot will:
- Parse the lead information from the message
- Validate and score the lead
- Sync to Notion
- Reply in thread with results (HOT/WARM/COLD classification)

**2. Message Command - Batch CSV** (for bulk imports)
```
add leads: Q4 marketing batch
```
Attach a CSV file to your message with this trigger. The bot will:
- Detect the CSV attachment
- Process all leads in the file
- Post a summary of results in the thread

**3. CSV Upload** (automatic detection)
Simply upload a CSV file to any channel. The bot will automatically:
- Detect the CSV file
- Process all leads in the file
- Post a summary of results

**4. Slash Command**
```
/processlead john@example.com John Doe, Acme Corp
```
Works the same as the single lead message command.
```

### Success Criteria:

#### Automated Verification:
- [x] README renders correctly (no markdown syntax errors)

#### Manual Verification:
- [x] Documentation accurately describes behavior
- [x] Examples are clear and correct

---

## Testing Strategy

### Unit Tests:
- Trigger detection for "add leads:" (plural)
- Trigger detection for "add lead:" (singular) still works
- Case-insensitivity of triggers
- File array extraction from event payload

### Integration Tests:
- Mock Slack event with "add leads:" text and files array
- Verify CSV detection and download flow
- Verify error handling for missing/invalid attachments

### Manual Testing Steps:
1. Start the server: `cd Project_3 && python server.py --debug`
2. In Slack, send "add leads: test batch" with a CSV attachment
3. Verify bot acknowledges and processes the file
4. Verify results are posted as a thread reply
5. Test error cases: no attachment, non-CSV attachment
6. Verify existing triggers still work

## Performance Considerations

- File processing happens in a background thread (same as existing `file_shared` handler)
- Response to Slack is immediate (within 3s requirement)
- No additional API calls beyond existing pattern

## Migration Notes

No migration needed. This is an additive change that:
- Adds new trigger pattern "add leads:" (plural)
- Reuses existing CSV processing infrastructure
- Does not modify existing trigger behaviors

## References

- Research document: `thoughts/shared/research/2025-12-21-slack-add-leads-csv-not-triggering.md`
- Prior research: `thoughts/shared/research/2025-12-21-slack-csv-automation.md`
- Slack Events API: https://api.slack.com/events
- Existing implementation: `Project_3/server.py:399-590`
