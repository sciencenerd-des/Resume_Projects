# Project 3: Marketing Ops Automation Agent

> An AI-powered lead processing agent that automates the growth marketing pipeline using Python, OpenAI, and modern integrations.

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![OpenAI](https://img.shields.io/badge/OpenAI-Agents%20SDK-412991.svg)
![Notion](https://img.shields.io/badge/Notion-CRM-000000.svg)
![Slack](https://img.shields.io/badge/Slack-Notifications-4A154B.svg)

## 🎯 Overview

This project demonstrates **operational efficiency** through marketing automation—a key skill for Growth Lead roles. It showcases the ability to:

- 🔄 Automate repetitive lead processing tasks
- 🧹 Validate and clean incoming data
- 📝 Integrate with CRM systems (Notion)
- 🔔 Provide real-time notifications (Slack)
- 📊 Generate actionable reports

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LEAD PROCESSOR AGENT                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐   ┌──────────┐   ┌─────────┐   ┌───────────┐  │
│  │  CSV    │──▶│ Validate │──▶│ Notion  │──▶│  Report   │  │
│  │ Ingest  │   │  Emails  │   │   CRM   │   │ Generator │  │
│  └─────────┘   └──────────┘   └─────────┘   └───────────┘  │
│       │                            │              │         │
│       │                            │              ▼         │
│       │                            │       ┌───────────┐   │
│       │                            └──────▶│   Slack   │   │
│       ▼                                    │  Notify   │   │
│  sample_leads.csv                          └───────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Agent Architecture (OpenAI Agents SDK)

This project uses the **OpenAI Agents SDK** for multi-agent orchestration:

- **Orchestrator Agent**: Coordinates the complete pipeline
- **Email Validator Agent**: Validates email addresses with RFC 5322 compliance
- **Lead Scorer Agent**: Scores and categorizes leads (HOT/WARM/COLD)
- **AI Analyzer Agent**: Optional AI-powered insights (when ENABLE_AI_ANALYSIS=true)
- **Notion Syncer Agent**: Syncs leads to Notion CRM
- **Report Generator Agent**: Creates formatted reports
- **Slack Notifier Agent**: Sends notifications (when DISABLE_SLACK=false)

**Rollback to Legacy Agent:**

If you encounter issues with the SDK multi-agent system, you can instantly rollback to the legacy single-agent implementation:

```bash
# In your .env file
USE_SDK_AGENT=false
```

Then restart the server. The system will automatically use the legacy agent instead. No code changes needed!

**Automatic Fallback (Python 3.9):**

If running in Python 3.9, the system will automatically fall back to the legacy agent since the SDK requires Python 3.10+. You'll see a warning message:

```
⚠️  Warning: Failed to import SDK agent (requires Python 3.10+): TypeError
Falling back to legacy agent
```

This is by design and ensures the system continues to work in Python 3.9 environments.

## 📋 Requirements

- **Python 3.10+** (required for OpenAI Agents SDK)
- OpenAI API key
- Notion API key (optional - runs in demo mode without it)
- Slack webhook URL (optional)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd Project_3
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Run the Agent

```bash
# Process sample leads (demo mode)
python main.py data/sample_leads.csv

# With Slack notifications disabled
python main.py data/sample_leads.csv --no-slack

# Quiet mode (minimal output)
python main.py data/sample_leads.csv --quiet
```

## 📁 Project Structure

```
Project_3/
├── main.py                     # CLI entry point
├── server.py                   # Flask webhook server
├── requirements.txt            # Python dependencies
├── .env.example               # Environment template
│
├── src/
│   ├── agent.py               # Legacy agent (rollback support)
│   ├── config.py              # Configuration management
│   │
│   ├── sdk/                   # OpenAI Agents SDK (NEW)
│   │   ├── sdk_config.py      # SDK configuration & presets
│   │   ├── agents/            # Specialized agents
│   │   │   ├── orchestrator.py    # Main coordinator
│   │   │   ├── email_validator.py # Email validation agent
│   │   │   ├── lead_scorer.py     # Lead scoring agent
│   │   │   ├── ai_analyzer.py     # AI analysis agent
│   │   │   ├── notion_syncer.py   # Notion CRM agent
│   │   │   ├── report_generator.py# Report generation agent
│   │   │   └── slack_notifier.py  # Slack notification agent
│   │   ├── tools/             # @function_tool wrappers
│   │   ├── sessions/          # Conversational sessions (Phase 4)
│   │   │   └── slack_session_manager.py
│   │   └── utils/             # Adapters & utilities
│   │       ├── legacy_adapter.py  # SDK → Legacy format
│   │       └── feature_flags.py   # Feature flag management
│   │
│   └── tools/                 # Legacy tools
│       ├── csv_ingest.py      # CSV file processing
│       ├── email_validator.py # Email validation
│       ├── lead_scorer.py     # Lead scoring
│       ├── notion_crm.py      # Notion API integration
│       ├── report_generator.py# Report formatting
│       └── slack_notify.py    # Slack webhooks
│
├── data/
│   └── sample_leads.csv       # Test data
│
├── scripts/                   # Utility scripts
│   ├── validate_compatibility.py  # SDK vs Legacy validation
│   └── benchmark_performance.py   # Performance benchmarks
│
├── tests/                     # Test suite
│   ├── test_legacy_adapter.py # Legacy adapter tests
│   ├── test_session_manager.py# Session manager tests
│   ├── test_conversational_detection.py
│   └── test_sdk_integration.py# Integration tests
│
└── docs/                      # Documentation
    ├── PHASE3_COMPLETION_SUMMARY.md
    ├── PHASE4_COMPLETION_SUMMARY.md
    ├── DEPLOYMENT_GUIDE.md
    └── USER_GUIDE.md
```

## ⚙️ Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `NOTION_API_KEY` | No | Notion integration token |
| `NOTION_DATABASE_ID` | No | Target Notion database |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook |

> **Demo Mode**: If Notion/Slack aren't configured, the agent runs in demo mode with simulated responses.

## 🧪 Testing

```bash
# Run all tests
pytest -v

# Run specific test file
pytest tests/test_email_validator.py -v

# With coverage
pytest --cov=src tests/
```

## 📊 Sample Output

```
╔══════════════════════════════════════════════════════════╗
║           LEAD PROCESSING REPORT                         ║
╠══════════════════════════════════════════════════════════╣
║  Timestamp:      2025-12-20 02:15:00                     ║
╠══════════════════════════════════════════════════════════╣
║  Total Processed:    10                                  ║
║  Valid Leads:         7  ✅                              ║
║  Invalid Leads:       3  ❌                              ║
║  Success Rate:     70.0%                                 ║
╠══════════════════════════════════════════════════════════╣
║  Synced to Notion:    7  📝                              ║
║  Sync Errors:         0                                  ║
╚══════════════════════════════════════════════════════════╝
```

## 🔗 Integrations

### Notion CRM Setup

1. Create a Notion integration at [notion.so/my-integrations](https://notion.so/my-integrations)
2. Create a database with columns: Name (title), Email, Company, Tags (multi-select)
3. Share the database with your integration
4. Copy the database ID from the URL

### Slack Integration Setup

#### Incoming Webhooks (for notifications)

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Enable Incoming Webhooks
3. Add a webhook to your workspace
4. Copy the webhook URL to `.env` as `SLACK_WEBHOOK_URL`

#### Events API (for interactive lead processing)

1. In your Slack app settings, enable **Event Subscriptions**
2. Set the Request URL to: `https://your-server.com/slack/events`
3. Subscribe to these bot events:
   - `file_shared` - Auto-process CSV uploads
   - `message.channels` - Handle "add lead:" commands
4. Add Bot Token Scopes:
   - `files:read` - Download CSV files
   - `chat:write` - Post processing results
5. Install the app to your workspace
6. Copy the **Bot User OAuth Token** to `.env` as `SLACK_BOT_TOKEN`
7. Copy the **Signing Secret** to `.env` as `SLACK_SIGNING_SECRET`

#### Slash Command (optional)

1. Create a slash command (e.g., `/processlead`)
2. Set Request URL to: `https://your-server.com/slack/command`
3. Add usage hint: `email@example.com Name, Company`

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

**5. Conversational Mode** ✨ NEW in Phase 4 (Requires Python 3.10+ with SDK)
Natural language queries for lead insights and reports:
```
How many leads did we process today?
Show me the top 5 HOT leads
What's the average score this week?
List all leads from Acme Corp
```
The bot will:
- Understand natural language questions
- Maintain conversation context across multiple messages
- Provide formatted responses with lead data
- Remember previous queries in the thread

**Requirements:**
- Python 3.10+ with OpenAI Agents SDK enabled
- Optional: Redis for persistent session storage (otherwise uses in-memory)

**Configuration:**
```bash
# In .env file
USE_SDK_AGENT=true  # Enable SDK agents
REDIS_URL=redis://localhost:6379  # Optional: for persistent sessions
SESSION_TTL_SECONDS=86400  # 24-hour session timeout
```

**Example Conversation:**
```
User: How many leads did we process today?
Bot: We processed 47 leads today: 12 HOT, 20 WARM, 15 COLD

User: Show me the top 3 HOT leads
Bot: Here are the top 3 HOT leads:
     1. john@acme.com - VP of Sales at Acme Corp (score: 92)
     2. jane@techco.com - Director at TechCo (score: 88)
     3. bob@startup.io - Founder at Startup Inc (score: 85)

User: Add a lead: sarah@enterprise.com Sarah Johnson, Enterprise Inc
Bot: ✅ Lead added and processed!
     - Email: Valid
     - Score: 78 (HOT)
     - Synced to Notion
```

## 🤖 AI-Powered Features

### Enable AI Analysis

The lead processor can use OpenAI to analyze HOT leads and provide insights. To enable:

1. Set environment variable in `.env`:
   ```bash
   ENABLE_AI_ANALYSIS=true
   ```

2. Ensure `OPENAI_API_KEY` is configured

3. Restart the server

**What AI Analysis Does:**
- Classifies HOT leads with AI-generated insights
- Provides reasoning for lead quality assessment
- Suggests personalized outreach strategies
- Works for both CLI (`main.py`) and Slack-triggered processing

**Example AI Output:**
```
🤖 AI Insight: Senior decision-maker at enterprise company.
Strong engagement indicators. Recommend personalized outreach
focusing on ROI and integration capabilities.
```

**Cost:** Uses OpenAI API (approximately $0.001 per lead analyzed)

**Note:** When enabled, only HOT leads (score ≥ 75) are analyzed to optimize API costs.

## 📚 Portfolio Context

This project is part of the **Growth Lead Portfolio** demonstrating:

| Project | Focus Area |
|---------|------------|
| Project 1 | Analytics & Data Visualization (India Acquisition Funnel) |
| Project 2 | A/B Testing & Experimentation (Statistical Analysis) |
| **Project 3** | **Marketing Ops Automation (This project)** |

## 📄 License

MIT License - See LICENSE file for details.
