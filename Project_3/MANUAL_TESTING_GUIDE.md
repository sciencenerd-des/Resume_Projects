# Manual Testing Guide
**Lead Processor Automation Workflow Server**

---

## Quick Start

The server is **currently running** and ready for testing at:
- **URL:** `http://localhost:8080`
- **Status:** 🟢 Operational
- **Health Check:** `curl http://localhost:8080/health`

---

## Testing Scenarios

### 1. Basic File Upload (Auto-Processing)

**Test:** Upload CSV file via Slack
**Expected:** File automatically processes when uploaded to Slack channel

**What to observe:**
```
[DEBUG] file_shared: file_id=F12345, channel_id=C12345
[DEBUG] Detected CSV file: leads.csv
[DEBUG] Acquired file lock: F12345 for file_shared handler
[DEBUG] Background task started for leads.csv
[DEBUG] Processing complete. Status: complete
[DEBUG] Released file lock: F12345 (processed for 2.3s)
```

---

### 2. Single Lead Addition

**Test:** Send message in Slack
```
add lead: john@example.com John Doe, Acme Corp
```

**Expected:** Single lead processed and added to Notion

**What to observe:**
```
[DEBUG] add lead command detected: john@example.com John Doe, Acme Corp
✅ Lead Processed Successfully
Name: John Doe
Email: john@example.com
Company: Acme Corp
```

---

### 3. Batch Lead Upload

**Test:** Send message with CSV attachment
```
add leads: Q4 marketing campaign leads
[attach CSV file]
```

**Expected:**
- Message handler detects trigger
- CSV file processed in background
- Results posted to thread

**What to observe:**
```
[DEBUG] add leads (plural) detected, files: 1
[DEBUG] Found CSV attachment in message: leads.csv
[DEBUG] Acquired file lock: F12345 for message handler
[DEBUG] Processing CSV attachment: leads.csv
✅ Lead Processing Complete
```

---

### 4. Slack Retry Detection

**Test:** Simulate Slack retry (requires Slack dev tools or webhook tester)

**Headers to send:**
```
X-Slack-Retry-Num: 1
X-Slack-Retry-Reason: http_timeout
```

**Expected:** Server acknowledges but doesn't reprocess

**What to observe:**
```
[INFO] Slack retry detected: attempt #1, reason: http_timeout
[INFO] Event ID: Ev12345, Type: file_shared
```

**Response:**
```json
{
  "ok": true,
  "message": "Retry #1 acknowledged (not reprocessed)"
}
```

---

### 5. Duplicate File Prevention

**Test:** Upload same file twice in quick succession

**Expected:**
- First upload: processes normally
- Second upload: skipped (already processing)

**What to observe:**
```
[DEBUG] Acquired file lock: F12345 for file_shared handler
[DEBUG] Background task started for leads.csv
[DEBUG] File F12345 already being processed by file_shared handler (started 0.5s ago)
[DEBUG] Skipping duplicate processing for file F12345
```

---

### 6. Bot Message Filtering

**Test 1:** Bot uploads CSV file
**Expected:** File SHOULD be processed (bots allowed for file_shared)

**Test 2:** Bot sends text message
**Expected:** Message SHOULD be ignored (prevents loops)

**What to observe:**
```
# For bot message:
[DEBUG] Message from bot B12345 filtered out (prevents loops)

# For bot file upload:
[DEBUG] file_shared: file_id=F12345
[DEBUG] Detected CSV file: leads.csv
# ... processing continues ...
```

---

### 7. Conversational Query Detection

**Test 1:** Send question without file
```
how many leads do we have?
```
**Expected:** Triggers conversational mode

**Test 2:** Send question WITH file attachment
```
add leads?
[attach CSV file]
```
**Expected:** Processes file, NOT conversation

**What to observe:**
```
# Without file:
[DEBUG] Conversational query detected (no files attached)

# With file:
[DEBUG] Message matches conversational pattern but has files - treating as file command
```

---

### 8. Error Logging Verification

**Test:** Upload invalid CSV file (e.g., empty file or wrong format)

**Expected:** Detailed error with full context

**What to observe:**
```
============================================================
[ERROR] Exception in background file processing
============================================================
{
  "error_type": "ValueError",
  "error_message": "Invalid CSV format: no headers found",
  "file_id": "F12345",
  "filename": "invalid.csv",
  "channel_id": "C12345",
  "user_id": "U12345",
  "event_type": "file_shared"
}

Stack trace:
Traceback (most recent call last):
  File "server.py", line 1050, in process_in_background
    results = process_leads_with_agent(agent, temp_path)
  ...
ValueError: Invalid CSV format: no headers found
============================================================
```

---

### 9. CSV Detection Logging

**Test:** Upload files with different extensions

**Test Files:**
- `leads.csv` - should detect
- `leads.CSV` - should detect (case insensitive)
- `leads.txt` - should reject
- `data` (no extension) with CSV mimetype - should detect

**What to observe:**
```
[DEBUG] Checking file type for 'leads.csv':
[DEBUG]   mimetype: text/csv
[DEBUG]   filetype: csv
[DEBUG]   extension: csv
[DEBUG] ✓ Detected as CSV via mimetype: text/csv
```

OR

```
[DEBUG] Checking file type for 'data.txt':
[DEBUG]   mimetype: text/plain
[DEBUG]   filetype: txt
[DEBUG]   extension: txt
[DEBUG] ✗ File 'data.txt' is NOT a CSV
```

---

### 10. Timestamp Validation

**Test:** Send event with old timestamp (requires Slack dev tools)

**Timestamps to test:**
- Current time: Should pass ✅
- 10 minutes ago: Should pass ✅ (within 15-min window)
- 20 minutes ago: Should fail ❌ (exceeds window)

**What to observe:**
```
# 10 minutes old:
[INFO] Old timestamp accepted: 600s difference (within 900s window)

# 20 minutes old:
[WARNING] Signature timestamp expired: 1200s difference (limit: 900s)
[WARNING] Request timestamp: 1703188637, Current time: 1703189837
```

---

## Monitoring Commands

### Watch Logs in Real-Time
```bash
# The server logs to console output
# Look for these patterns:
tail -f server.log | grep -E '\[ERROR\]|\[WARNING\]|\[INFO\]'
```

### Check Server Health
```bash
curl http://localhost:8080/health
```

### View Running Process
```bash
ps aux | grep server.py
lsof -ti:8080
```

### Restart Server
```bash
# Stop current server
kill $(lsof -ti:8080)

# Start server
python server.py --port 8080
```

---

## Expected Performance

### Response Times
- Health check: < 100ms
- File processing: 1-5 seconds (depends on file size)
- Single lead: < 1 second
- Conversational query: 2-10 seconds (depends on SDK)

### File Lock Duration
- Typical: 2-5 seconds for CSV processing
- Large files: Up to 30 seconds
- Logged in release message

---

## Troubleshooting

### Server Won't Start

**Problem:** Port already in use
```
Address already in use
Port 8080 is in use by another program.
```

**Solution:**
```bash
# Find process on port 8080
lsof -ti:8080

# Kill it
kill $(lsof -ti:8080)

# Or use different port
python server.py --port 8081
```

---

### Missing Credentials

**Problem:** Server exits immediately
```
❌ FATAL ERROR: Missing required Slack credentials
  ✗ SLACK_BOT_TOKEN is not configured
  ✗ SLACK_SIGNING_SECRET is not configured
```

**Solution:**
1. Check `.env` file exists
2. Verify credentials are set:
   ```bash
   grep SLACK_BOT_TOKEN .env
   grep SLACK_SIGNING_SECRET .env
   ```
3. Copy from `.env.example` if needed

---

### File Not Processing

**Check:**
1. Is it a CSV file? (check extension and mimetype)
2. Is file lock already held? (check logs for "already being processed")
3. Is it a retry event? (check for X-Slack-Retry-Num header)
4. Are credentials valid? (check startup validation)

---

## Success Indicators

### ✅ Healthy Server
- Health endpoint returns 200
- Startup shows "✓ All required credentials configured"
- No ERROR messages in logs
- File locks acquired and released properly

### ✅ Proper File Processing
- CSV detected correctly
- File lock acquired
- Processing completes
- File lock released
- Results posted to Slack

### ✅ Retry Handling
- Retry events acknowledged
- Not reprocessed
- Logged with [INFO] level

### ✅ Error Handling
- Full stack traces
- JSON context with all fields
- User-friendly Slack messages
- Error type included

---

## Known Limitations

### SDK Agent (Python 3.10+ required)
- Current: Python 3.9.6
- Fallback: Legacy agent active
- Impact: Conversational mode may have reduced features

### Port Availability
- Default port 8080 may be in use
- Can specify alternate with `--port` flag

---

## Next Steps After Testing

1. **Verify all scenarios work** ✓
2. **Check logs for errors** ✓
3. **Confirm retry detection** ✓
4. **Test file locks** ✓
5. **Deploy to production** (when ready)

---

## Support

If you encounter issues:

1. Check server logs for ERROR messages
2. Verify credentials in `.env` file
3. Confirm server is running: `curl http://localhost:8080/health`
4. Review this testing guide for expected behavior
5. Check `SERVER_VERIFICATION_REPORT.md` for detailed status

---

**Server Status:** 🟢 **READY FOR MANUAL TESTING**

All reliability improvements are active and operational. Happy testing! 🎉
