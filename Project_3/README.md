# Project 3: Marketing Ops Automation Agent

> An AI-powered lead processing agent that automates the growth marketing pipeline using Python, OpenAI, and modern integrations.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
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
├── main.py                 # CLI entry point
├── requirements.txt        # Python dependencies
├── .env.example           # Environment template
│
├── src/
│   ├── agent.py           # Main agent orchestrator
│   ├── config.py          # Configuration management
│   └── tools/
│       ├── csv_ingest.py      # CSV file processing
│       ├── email_validator.py # Email validation
│       ├── notion_crm.py      # Notion API integration
│       ├── report_generator.py# Report formatting
│       └── slack_notify.py    # Slack webhooks
│
├── data/
│   └── sample_leads.csv   # Test data
│
├── tests/
│   ├── test_csv_ingest.py
│   └── test_email_validator.py
│
└── research_report.md     # Project research documentation
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

## 📚 Portfolio Context

This project is part of the **Growth Lead Portfolio** demonstrating:

| Project | Focus Area |
|---------|------------|
| Project 1 | Analytics & Data Visualization (India Acquisition Funnel) |
| Project 2 | A/B Testing & Experimentation (Statistical Analysis) |
| **Project 3** | **Marketing Ops Automation (This project)** |

## 📄 License

MIT License - See LICENSE file for details.
