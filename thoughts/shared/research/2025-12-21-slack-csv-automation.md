---
date: 2025-12-21T01:45:33+0530
researcher: Codex
git_commit: ee7dab90f46e45e0f27940615c5e5f5b492e9ab7
branch: feature/project3-and-chart-updates
repository: project_profile
topic: "Slack CSV uploads not triggering automation"
tags: [research, codebase, project-3, slack]
status: complete
last_updated: 2025-12-21
last_updated_by: Codex
---

# Research: Slack CSV uploads not triggering automation

**Date**: 2025-12-21T01:45:33+0530  
**Researcher**: Codex  
**Git Commit**: ee7dab90f46e45e0f27940615c5e5f5b492e9ab7  
**Branch**: feature/project3-and-chart-updates  
**Repository**: project_profile

## Research Question
A CSV file posted into Slack is supposed to kick off the Project 3 automation workflow, but no processing occurs. What components currently implement this trigger path and what conditions must be satisfied for it to run?

## Summary
- Slack must send Events API payloads to `/slack/events`, where the Flask server validates `X-Slack-Request-Timestamp` and `X-Slack-Signature` using `SLACK_SIGNING_SECRET` before any event is handled (`Project_3/server.py:354`).
- The only event that actually launches CSV processing is `file_shared`; when detected, the handler fetches metadata via `files.info`, checks for CSV mimetypes/extensions, downloads the file with `SLACK_BOT_TOKEN`, and spins up a background thread so Slack can be acknowledged within three seconds (`Project_3/server.py:408`).
- Downloaded files feed directly into the core agent pipeline, which ingests CSVs, validates and scores leads, optionally runs AI enrichment, syncs to Notion, generates a text report, and posts a Slack summary via webhook (`Project_3/src/agent.py:46`).
- Slack replies inside the originating channel are posted through the bot token (`chat.postMessage`), while the end-of-run notification uses the incoming webhook configured by `SLACK_WEBHOOK_URL` (`Project_3/src/tools/slack_file_handler.py:206`, `Project_3/src/tools/slack_notify.py:17`).
- Additional entry points exist (slash command `/processlead`, `/process/csv` upload API, and a local filesystem watcher) but the message-based `add lead:` trigger is stubbed out, so CSV attachments remain the only fully automated Slack path (`Project_3/server.py:473`, `Project_3/watch.py:27`).

## Detailed Findings

### Slack Events Webhook (`Project_3/server.py:354`)
- `slack_events` logs every POST, grabs the raw request body before parsing, and services Slack's URL verification challenge without checking signatures so apps can be registered quickly (`Project_3/server.py:374`).
- For normal traffic it reads headers `X-Slack-Request-Timestamp` and `X-Slack-Signature`, then calls `verify_slack_signature` to enforce the signing secret if configured; failures return HTTP 401 immediately (`Project_3/server.py:391`).
- When a `file_shared` event arrives, the handler extracts `file_id`/`channel_id`, requests `files.info`, and only proceeds if `is_csv_file` confirms the type; other file types simply log and exit (`Project_3/server.py:408`).
- Slack requires a response inside three seconds, so the code spawns a background thread per file. That worker downloads the CSV via `download_slack_file`, invokes `agent.process_leads`, deletes the temp file, and posts a formatted status message back into the originating channel using `format_processing_result_message` (`Project_3/server.py:424`).
- `message` events are inspected for `add lead:` prefixes, but the body currently just logs and `pass`, so typing commands in-channel will not result in any action unless the slash command endpoint is used (`Project_3/server.py:474`).

### Slack File Handler Utilities (`Project_3/src/tools/slack_file_handler.py:16`)
- Helper functions pull required credentials from environment: `_get_slack_bot_token` for API calls and `_get_slack_signing_secret` for signature verification, so missing values short-circuit processing and emit simulated output instead of contacting Slack (`Project_3/src/tools/slack_file_handler.py:16`).
- `verify_slack_signature` reconstructs Slack’s `v0:{timestamp}:{body}` base string, rejects timestamps older than five minutes, and compares HMAC digests to guard against spoofed requests (`Project_3/src/tools/slack_file_handler.py:26`).
- `get_file_info` and `download_slack_file` call `https://slack.com/api/files.info` and the `url_private_download` link respectively, requiring that the bot token possess `files:read` scope; missing download URLs trigger guidance logs about scopes (`Project_3/src/tools/slack_file_handler.py:74`).
- `post_message_to_channel` wraps `chat.postMessage`, falling back to a simulated log if no bot token is present, so the automation can still run locally without touching Slack but nothing will be posted to the workspace (`Project_3/src/tools/slack_file_handler.py:207`).
- `format_processing_result_message` renders the agent output (valid/invalid counts, hot/warm/cold stats, Notion sync totals) into a markdown block posted back to the user after processing finishes (`Project_3/src/tools/slack_file_handler.py:270`).

### Lead Processing Agent Pipeline (`Project_3/src/agent.py:46`)
- `LeadProcessorAgent.process_leads` orchestrates seven ordered steps: ingest, validate, score, optional AI analysis, Notion sync, report generation, and Slack notification (`Project_3/src/agent.py:50`).
- CSV ingestion delegates to `csv_ingest` and attaches a schema summary to the step log before email validation enforces the `email` column presence (`Project_3/src/agent.py:72`).
- Scoring runs through `LeadScorer` to categorize each lead, and optional AI analysis only activates when `ENABLE_AI_ANALYSIS=true` and an OpenAI API key is loaded (`Project_3/src/agent.py:98`).
- Synchronization uses `add_leads_batch`; errors there mark the Notion step as `partial` but do not abort the pipeline, so Slack feedback will still go out with the recorded error counts (`Project_3/src/agent.py:135`).
- End-of-run Slack notifications go through `send_lead_report_notification`, which will report a simulated success if `SLACK_WEBHOOK_URL` is unset, mirroring the behavior of the Events handler’s bot token checks (`Project_3/src/agent.py:160`).

### Slack Notification Helper (`Project_3/src/tools/slack_notify.py:17`)
- `_get_slack_webhook_url` reads `SLACK_WEBHOOK_URL` for the outgoing report; in its absence the method returns a `simulated` status to indicate demo mode (`Project_3/src/tools/slack_notify.py:37`).
- `send_slack_notification` composes a single attachment payload with optional channel override, username, and emoji icon, then POSTs to the webhook; HTTP errors bubble back so the agent can log them (`Project_3/src/tools/slack_notify.py:47`).
- `send_lead_report_notification` builds the success summary with emoji-coded severity and optional Notion/error info before delegating to `send_slack_notification`; error alerts reuse the same helper but with a red theme (`Project_3/src/tools/slack_notify.py:83`).

### Local File Watcher CLI (`Project_3/watch.py:27`)
- `watch.py` provides an alternate automation path that listens to a filesystem directory using `watchdog`; every new `.csv` file triggers `agent.process_leads`, prints the generated report, and optionally relocates processed files (`Project_3/watch.py:36`).
- CLI switches allow disabling Slack notifications (`--no-slack`) or silencing logs (`--quiet`), matching the flags exposed by `server.py` so behavior stays consistent across entry points (`Project_3/watch.py:105`).
- This watcher is separate from Slack, so uploading a CSV to Slack will only work if the Events API is configured; otherwise users can drop files into the watched directory to get the same processing path (`Project_3/watch.py:145`).

## Code References
- `Project_3/server.py:354` – Slack Events endpoint and event dispatch
- `Project_3/server.py:408` – `file_shared` trigger path that downloads and processes CSVs
- `Project_3/src/tools/slack_file_handler.py:16` – Slack credential helpers and request verification
- `Project_3/src/tools/slack_file_handler.py:207` – Channel messaging helper used for workspace replies
- `Project_3/src/agent.py:46` – Lead processing pipeline invoked for every CSV
- `Project_3/src/tools/slack_notify.py:17` – Incoming webhook utility for end-of-run summaries
- `Project_3/watch.py:27` – Local filesystem watcher that mirrors the Slack-triggered workflow

## Architecture Documentation
Slack automations flow through Flask: `/slack/events` ingests Events API payloads, validates signatures, and delegates file downloads plus status replies to helpers in `src/tools/slack_file_handler.py`. Once a CSV is saved locally, the same `LeadProcessorAgent` used by CLI commands handles validation, scoring, optional AI enrichment, Notion sync, and Slack reporting so every entry point stays consistent. Workspace feedback splits between the bot token (`chat.postMessage` for channel replies) and the general webhook used by the pipeline. Auxiliary entry points (`/slack/command`, `/process`, `/process/csv`, `watch.py`) all construct an agent instance via `create_agent`, keeping configuration centralized.

## Related Research
- None referenced.

## Open Questions
- Is the Slack app subscribed to the `file_shared` event and pointed at `/slack/events`? (required for attachments to arrive here)
- Are `SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN` (with `files:read` and `chat:write`), and `SLACK_WEBHOOK_URL` configured in the environment where the Flask server runs?
- Should the stubbed `add lead:` message handler eventually invoke processing similar to the slash command, or remain unimplemented?
