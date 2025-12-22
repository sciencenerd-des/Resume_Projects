# User Guide - Lead Processing Agent

**Version**: 2.0.0 (OpenAI Agents SDK Edition)
**Last Updated**: December 21, 2025

---

## 📖 Table of Contents

1. [Getting Started](#getting-started)
2. [Command-Line Interface](#command-line-interface)
3. [Slack Integration](#slack-integration)
4. [Conversational Mode](#conversational-mode)
5. [Web API](#web-api)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## 🚀 Getting Started

### What is the Lead Processing Agent?

The Lead Processing Agent is an AI-powered system that automates your lead management workflow:

- ✅ **Validates** email addresses (format, MX records, disposable detection)
- 📊 **Scores** leads based on company, title, domain (HOT/WARM/COLD)
- 🤖 **Analyzes** with AI for insights (optional)
- 📝 **Syncs** to Notion CRM automatically
- 📈 **Reports** with formatted summaries
- 💬 **Notifies** via Slack (optional)
- 🗣️ **Converses** naturally in Slack (new!)

### Quick Start (3 Minutes)

```bash
# 1. Install dependencies
cd Project_3
pip install -r requirements.txt

# 2. Configure (copy and edit)
cp .env.example .env
# Add your OPENAI_API_KEY

# 3. Process sample leads
python main.py data/sample_leads.csv

# Done! Check the terminal for results.
```

---

## 💻 Command-Line Interface

### Basic Usage

```bash
python main.py <path-to-csv-file>
```

### Examples

**Process leads:**
```bash
python main.py data/my_leads.csv
```

**Disable Slack notifications:**
```bash
python main.py data/my_leads.csv --no-slack
```

**Quiet mode (less output):**
```bash
python main.py data/my_leads.csv --quiet
```

**Export results to CSV:**
```bash
python main.py data/my_leads.csv --export-csv results.csv
```

**Export results to PDF:**
```bash
python main.py data/my_leads.csv --export-pdf report.pdf
```

**Enable AI analysis (for HOT leads):**
```bash
python main.py data/my_leads.csv --enable-ai
```

### CSV Format

Your CSV file should have these columns:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| email | Yes | Email address | john@acme.com |
| name | Yes | Full name | John Doe |
| company | No | Company name | Acme Corp |
| title | No | Job title | VP of Sales |
| tags | No | Comma-separated tags | enterprise,hot |

**Example CSV:**
```csv
email,name,company,title,tags
john@acme.com,John Doe,Acme Corp,VP of Sales,enterprise
jane@startup.io,Jane Smith,Startup Inc,Founder,startup,hot
```

### Understanding Output

**Terminal Report:**
```
╔══════════════════════════════════════════════════════════╗
║           LEAD PROCESSING REPORT                         ║
╠══════════════════════════════════════════════════════════╣
║  Timestamp:      2025-12-21 14:30:00                     ║
╠══════════════════════════════════════════════════════════╣
║  Total Processed:       10                               ║
║  Valid Leads:            7  ✅                          ║
║  Invalid Leads:          3  ❌                          ║
║  Success Rate:        70.0%                           ║
╠══════════════════════════════════════════════════════════╣
║  Lead Categories:                                        ║
║    🔥 HOT:             2  (score >= 70)                  ║
║    🌡️  WARM:            5  (score 40-69)                 ║
║    ❄️  COLD:            0  (score < 40)                  ║
║  Avg Score:         58.6                              ║
╠══════════════════════════════════════════════════════════╣
║  Synced to Notion:       7  📝                          ║
║  Sync Errors:            0                               ║
╚══════════════════════════════════════════════════════════╝
```

**What the scores mean:**
- **HOT (70-100)**: Enterprise companies, senior titles, strong signals → Immediate outreach
- **WARM (40-69)**: Good fit, moderate signals → Nurture campaign
- **COLD (0-39)**: Poor fit or weak signals → Low priority

---

## 💬 Slack Integration

### Setup (One-Time)

1. **Create Slack App** at [api.slack.com/apps](https://api.slack.com/apps)

2. **Enable Features:**
   - Bot Token Scopes: `chat:write`, `files:read`, `channels:history`
   - Event Subscriptions: `message.channels`, `file_shared`
   - Slash Command: `/processlead`

3. **Configure Environment:**
   ```bash
   # In .env file:
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_SIGNING_SECRET=your-secret
   SLACK_WEBHOOK_URL=your-webhook-url
   ```

4. **Start Server:**
   ```bash
   python server.py
   ```

5. **Invite Bot to Channel:**
   ```
   /invite @YourBotName
   ```

### Usage Methods

#### 1. Single Lead (Quick Add)

Post in any channel where bot is present:
```
add lead: john@acme.com John Doe, Acme Corp
```

Bot replies in thread:
```
✅ Lead Processed Successfully

Name: John Doe
Email: john@acme.com
Company: Acme Corp
Category: 🔥 HOT
Score: 85

_Added by @yourname_
```

#### 2. Batch CSV Upload

Post message with CSV attached:
```
add leads: Q4 marketing campaign batch
```

Bot processes all leads and replies:
```
📊 Processed 47 leads from marketing_leads.csv

✅ Valid: 42 (89.4%)
❌ Invalid: 5

Categories:
🔥 HOT: 12 leads
🌡️ WARM: 25 leads
❄️ COLD: 5 leads

📝 Synced 42 leads to Notion
```

#### 3. Auto-Process CSV Files

Simply upload a CSV file to any channel (no message needed):
```
<uploads leads.csv>
```

Bot automatically detects and processes it.

#### 4. Slash Command

```
/processlead john@acme.com John Doe, Acme Corp
```

Same as "add lead:" method.

---

## 🗣️ Conversational Mode

**New in Version 2.0!** Natural language conversations with the bot.

### Requirements

- Python 3.10+ on server
- `USE_SDK_AGENT=true` in environment
- OpenAI Agents SDK installed

### What You Can Ask

**Lead Statistics:**
```
You: How many leads did we process today?
Bot: We processed 47 leads today: 12 HOT, 20 WARM, 15 COLD

You: What's the average score?
Bot: The average lead score today is 62.3 (WARM category)
```

**Lead Search:**
```
You: Show me all HOT leads
Bot: Found 12 HOT leads:
     1. john@acme.com - VP of Sales (92)
     2. jane@techco.com - Director (88)
     ...

You: Find leads from Acme Corp
Bot: Found 3 leads from Acme Corp:
     1. john@acme.com - VP of Sales (92) - HOT
     2. sarah@acme.com - Manager (65) - WARM
     3. bob@acme.com - Associate (35) - COLD
```

**Reports:**
```
You: Generate a summary report for this week
Bot: <formatted weekly summary>

You: Show stats for December
Bot: <December statistics>
```

**Mixed Commands:**
```
You: Add a lead: test@example.com Test User, Test Co
Bot: ✅ Lead added and processed!
     Email: Valid
     Score: 55 (WARM)
     Synced to Notion

You: How many HOT leads now?
Bot: You now have 13 HOT leads (increased by 1)
```

### Conversation Features

- **Context Awareness**: Bot remembers previous messages in the thread
- **Multi-Turn**: Ask follow-up questions naturally
- **Session Persistence**: Conversations saved (24-hour TTL)
- **Thread-Based**: Each Slack thread = separate conversation

### Tips for Best Results

✅ **Do:**
- Ask specific questions ("How many HOT leads?")
- Use natural language ("Show me the top 5")
- Ask follow-ups in the same thread

❌ **Don't:**
- Mix conversations across threads (each thread is separate)
- Expect memory beyond 24 hours (sessions expire)

---

## 🌐 Web API

### Start Server

```bash
python server.py --port 5000
```

### Endpoints

#### Health Check

```bash
GET /health

Response:
{
  "status": "healthy",
  "agent_type": "sdk",
  "python_version": "3.10.15"
}
```

#### Process JSON Leads

```bash
POST /process
Content-Type: application/json

{
  "leads": [
    {
      "email": "john@acme.com",
      "name": "John Doe",
      "company": "Acme Corp"
    }
  ]
}

Response:
{
  "status": "complete",
  "valid_leads": [...],
  "scored_leads": [...],
  "report": "..."
}
```

#### Process CSV Upload

```bash
POST /process/csv
Content-Type: multipart/form-data

file=@leads.csv

Response:
{
  "status": "complete",
  "valid_leads": [...],
  "report": "..."
}
```

---

## 🔧 Troubleshooting

### Common Issues

**Issue**: `ModuleNotFoundError: No module named 'agents'`

**Solution**:
```bash
# SDK requires Python 3.10+
python --version  # Should show 3.10 or higher

# If Python 3.9:
# Option 1: Upgrade Python
# Option 2: Use legacy agent (set USE_SDK_AGENT=false)
```

---

**Issue**: Bot not responding in Slack

**Solution**:
1. Check bot is invited to channel: `/invite @BotName`
2. Verify server is running: `curl http://localhost:5000/health`
3. Check Slack tokens in `.env`
4. Review server logs for errors

---

**Issue**: "Conversational mode requires Python 3.10+"

**Solution**:
This is expected in Python 3.9. Options:
1. Upgrade to Python 3.10+
2. Use command mode: `add lead:` or `add leads:`
3. Set `USE_SDK_AGENT=false` to use legacy agent

---

**Issue**: Leads not syncing to Notion

**Solution**:
1. Verify `NOTION_API_KEY` is set
2. Verify `NOTION_DATABASE_ID` is correct
3. Check Notion integration has access to database
4. Review logs for specific error

---

**Issue**: Slow processing

**Solution**:
```bash
# Run benchmarks
python scripts/benchmark_performance.py

# If SDK is slower than 20%:
# 1. Check OpenAI API latency
# 2. Consider increasing timeout
# 3. Use legacy agent if needed (USE_SDK_AGENT=false)
```

---

## ❓ FAQ

**Q: What's the difference between SDK and legacy agent?**

A: The SDK agent uses OpenAI's multi-agent framework with specialized agents for each task. The legacy agent is a single agent handling all tasks. SDK enables conversational mode but requires Python 3.10+.

---

**Q: Can I use conversational mode without Slack?**

A: Currently, conversational mode is Slack-only. The CLI remains command-based.

---

**Q: How much does it cost?**

A: Costs depend on:
- OpenAI API calls (~$0.01 per 10 leads without AI analysis)
- AI analysis if enabled (~$0.001 per lead)
- Notion API (free tier: 1,000 calls/min)
- Slack (free tier sufficient for most use cases)

---

**Q: Is my data secure?**

A: Yes:
- Email validation is server-side (no external calls for format checks)
- OpenAI API: No data retention (zero data retention policy)
- Notion: Encrypted at rest and in transit
- Slack: Follows enterprise security standards

---

**Q: Can I customize the scoring algorithm?**

A: Yes, edit `src/tools/lead_scorer.py`:
```python
SCORING_RULES = {
    "company": {
        "fortune_500": 30,  # Adjust weight
        # ...
    }
}
```

---

**Q: How do I export leads?**

A: Three ways:
1. CLI: `--export-csv results.csv`
2. CLI: `--export-pdf report.pdf`
3. Notion: All leads auto-sync to Notion database

---

**Q: Can I process leads automatically from Gmail?**

A: Yes, with Zapier integration:
1. Create Zap: Gmail → Webhook
2. Point webhook to `/process` endpoint
3. Map email fields to JSON format

---

**Q: How do I rollback to legacy agent?**

A: Set environment variable:
```bash
USE_SDK_AGENT=false
```
Restart server. No code changes needed!

---

## 📚 Additional Resources

- [README.md](./README.md) - Quick start guide
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment
- [GitHub Issues](https://github.com/your-repo/issues) - Report bugs
- [API Documentation](./API.md) - Full API reference

---

**Need Help?**
- 📧 Email: support@example.com
- 💬 Slack: #lead-processor-support
- 📝 Create issue: github.com/your-repo/issues

---

**Last Updated**: December 21, 2025
**Version**: 2.0.0
