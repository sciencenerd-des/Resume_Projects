#!/usr/bin/env python3
"""Webhook server for lead processing.

Expose an HTTP endpoint to receive leads via POST request.

Usage:
    python server.py
    python server.py --port 8080
"""
import sys
import os
import json
import csv
import tempfile
import argparse
from pathlib import Path
from datetime import datetime

try:
    from flask import Flask, request, jsonify
except ImportError:
    print("Error: Flask not installed. Run: pip install flask")
    sys.exit(1)

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))
from src.agent import create_agent

app = Flask(__name__)

# Log startup configuration
print("=" * 60)
print("LEAD PROCESSOR SERVER - STARTUP DIAGNOSTICS")
print("=" * 60)
print(f"Python version: {sys.version}")
print(f"Server file: {__file__}")
print(f"Working directory: {os.getcwd()}")
print(f"SLACK_BOT_TOKEN: {'✓ Configured' if os.getenv('SLACK_BOT_TOKEN') else '✗ MISSING'}")
print(f"SLACK_SIGNING_SECRET: {'✓ Configured' if os.getenv('SLACK_SIGNING_SECRET') else '✗ MISSING'}")
print(f"SLACK_WEBHOOK_URL: {'✓ Configured' if os.getenv('SLACK_WEBHOOK_URL') else '✗ MISSING'}")
print("=" * 60)
print()

# Global agent instance - will be lazily initialized
_agent = None


def get_agent():
    """Get or create the agent instance (lazy initialization).

    This ensures the agent is available whether the server is started via:
    - python server.py
    - flask run
    - gunicorn server:app
    """
    global _agent
    if _agent is None:
        _agent = create_agent(
            verbose=os.getenv("DEBUG", "false").lower() == "true",
            notify_slack=os.getenv("DISABLE_SLACK", "false").lower() != "true"
        )
    return _agent


@app.before_request
def log_request():
    """Log all incoming requests for debugging."""
    print(f"\n{'='*60}")
    print(f"[REQUEST] {request.method} {request.path}")
    print(f"[FROM] {request.remote_addr}")
    print(f"[HEADERS] User-Agent: {request.headers.get('User-Agent', 'N/A')}")
    print(f"[HEADERS] Content-Type: {request.headers.get('Content-Type', 'N/A')}")
    if 'X-Slack-Request-Timestamp' in request.headers:
        print(f"[SLACK] Request from Slack detected")
        print(f"[SLACK] Timestamp: {request.headers.get('X-Slack-Request-Timestamp')}")
    print(f"{'='*60}\n")


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "service": "lead-processor",
        "timestamp": datetime.now().isoformat()
    })


@app.route("/process", methods=["POST"])
def process_leads():
    """
    Process leads from JSON payload.
    
    Expected JSON format:
    {
        "leads": [
            {"name": "John", "email": "john@example.com", "company": "Acme"},
            ...
        ]
    }
    
    Returns:
        JSON with processing results
    """
    agent = get_agent()
    
    # Validate content type
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
    
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Empty request body"}), 400
    
    if "leads" not in data:
        return jsonify({"error": "Missing 'leads' field in request body"}), 400
    
    leads = data["leads"]
    
    if not isinstance(leads, list):
        return jsonify({"error": "'leads' must be an array"}), 400
    
    if len(leads) == 0:
        return jsonify({"error": "'leads' array is empty"}), 400
    
    # Validate lead structure
    required_fields = ["email"]  # Only email is strictly required
    for i, lead in enumerate(leads):
        if not isinstance(lead, dict):
            return jsonify({"error": f"Lead {i} is not a valid object"}), 400
        for field in required_fields:
            if field not in lead:
                return jsonify({"error": f"Lead {i} missing required field: {field}"}), 400
    
    # Write leads to temp CSV file
    try:
        fieldnames = list(leads[0].keys())
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(leads)
            temp_path = f.name
        
        # Process through agent
        results = agent.process_leads(temp_path)
        
        # Clean up temp file
        Path(temp_path).unlink(missing_ok=True)
        
        # Format response
        response = {
            "status": results.get("status", "unknown"),
            "steps": results.get("steps", []),
            "summary": {
                "total": len(leads),
                "valid": len(results.get("valid_leads", [])),
                "invalid": len(results.get("invalid_leads", [])),
                "synced": results.get("notion_results", {}).get("success", 0)
            }
        }
        
        # Add scoring data if available
        if results.get("score_stats"):
            response["scoring"] = {
                "hot": results["score_stats"].get("hot", 0),
                "warm": results["score_stats"].get("warm", 0),
                "cold": results["score_stats"].get("cold", 0),
                "avg_score": results["score_stats"].get("avg_score", 0)
            }
        
        if results.get("error"):
            response["error"] = results["error"]
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


@app.route("/process/csv", methods=["POST"])
def process_csv():
    """
    Process leads from uploaded CSV file.
    
    Expected: multipart/form-data with 'file' field containing CSV
    
    Returns:
        JSON with processing results
    """
    agent = get_agent()
    
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded. Use 'file' field."}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({"error": "File must be a CSV"}), 400
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.csv', delete=False) as f:
            file.save(f)
            temp_path = f.name
        
        # Process through agent
        results = agent.process_leads(temp_path)
        
        # Clean up temp file
        Path(temp_path).unlink(missing_ok=True)
        
        # Format response
        response = {
            "status": results.get("status", "unknown"),
            "steps": results.get("steps", []),
            "file": file.filename
        }
        
        if results.get("score_stats"):
            response["scoring"] = {
                "hot": results["score_stats"].get("hot", 0),
                "warm": results["score_stats"].get("warm", 0),
                "cold": results["score_stats"].get("cold", 0)
            }
        
        if results.get("error"):
            response["error"] = results["error"]
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


@app.route("/slack/command", methods=["POST"])
def slack_command():
    """
    Handle Slack slash command.
    
    Setup in Slack:
    1. Create a Slack app at api.slack.com/apps
    2. Add a slash command (e.g., /processlead)
    3. Set Request URL to: https://your-server.com/slack/command
    
    Usage in Slack:
        /processlead john@example.com John Doe, Acme Corp
        /processlead jane@company.com Jane Smith
    
    Returns:
        Slack-formatted response
    """
    agent = get_agent()
    
    # Slack sends form data, not JSON
    text = request.form.get("text", "").strip()
    user_id = request.form.get("user_id", "unknown")
    channel_id = request.form.get("channel_id", "unknown")
    
    if not text:
        return jsonify({
            "response_type": "ephemeral",
            "text": "❌ Usage: `/processlead email@example.com Name, Company`\n\nExamples:\n• `/processlead john@acme.com John Doe, Acme Corp`\n• `/processlead jane@startup.io Jane Smith`"
        })
    
    # Parse the input: email name, company
    parts = text.split(" ", 1)
    email = parts[0].strip()
    
    # Parse name and company from remaining text
    name = "Unknown"
    company = ""
    if len(parts) > 1:
        name_company = parts[1].split(",", 1)
        name = name_company[0].strip() or "Unknown"
        if len(name_company) > 1:
            company = name_company[1].strip()
    
    # Create single lead
    lead = {
        "name": name,
        "email": email,
        "company": company,
        "source": f"slack-{user_id}",
        "tags": "slack-import"
    }
    
    try:
        # Write to temp CSV and process
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            writer = csv.DictWriter(f, fieldnames=lead.keys())
            writer.writeheader()
            writer.writerow(lead)
            temp_path = f.name
        
        results = agent.process_leads(temp_path)
        Path(temp_path).unlink(missing_ok=True)
        
        # Format Slack response
        if results.get("status") == "complete":
            valid_count = len(results.get("valid_leads", []))
            score_stats = results.get("score_stats", {})
            
            if valid_count > 0:
                category = score_stats.get("hot", 0) > 0 and "🔥 HOT" or score_stats.get("warm", 0) > 0 and "🌡️ WARM" or "❄️ COLD"
                return jsonify({
                    "response_type": "in_channel",
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": f"✅ *Lead Processed Successfully*\n\n*Name:* {name}\n*Email:* {email}\n*Company:* {company or 'N/A'}\n*Category:* {category}\n*Score:* {score_stats.get('avg_score', 0):.0f}"
                            }
                        },
                        {
                            "type": "context",
                            "elements": [{"type": "mrkdwn", "text": f"Added by <@{user_id}>"}]
                        }
                    ]
                })
            else:
                errors = results.get("validation_errors", ["Invalid email format"])
                return jsonify({
                    "response_type": "ephemeral",
                    "text": f"❌ *Lead Rejected*\n\nEmail `{email}` failed validation:\n• {errors[0] if errors else 'Unknown error'}"
                })
        else:
            return jsonify({
                "response_type": "ephemeral",
                "text": f"❌ Processing failed: {results.get('error', 'Unknown error')}"
            })
            
    except Exception as e:
        return jsonify({
            "response_type": "ephemeral",
            "text": f"❌ Error: {str(e)}"
        })


def _parse_add_lead_message(lead_text: str, user_id: str = "unknown"):
    """
    Parse 'add lead:' message text into a lead dictionary.

    Args:
        lead_text: Text after 'add lead:' prefix (e.g., "email@example.com John Doe, Acme")
        user_id: Slack user ID for attribution

    Returns:
        Tuple of (lead_dict, error_message)
        - If successful: (lead_dict, None)
        - If failed: (None, error_message)
    """
    # Strip leading/trailing whitespace first
    lead_text = lead_text.strip()

    if not lead_text:
        return None, "❌ Usage: add lead: email@example.com Name, Company"

    parts = lead_text.split(" ", 1)
    email = parts[0].strip()

    if not email:
        return None, "❌ Please provide an email after 'add lead:'"

    # Parse name and company
    name = "Unknown"
    company = ""
    if len(parts) > 1:
        name_company = parts[1].split(",", 1)
        name = name_company[0].strip() or "Unknown"
        if len(name_company) > 1:
            company = name_company[1].strip()

    lead = {
        "name": name,
        "email": email,
        "company": company,
        "source": f"slack-{user_id}",
        "tags": "slack-import"
    }

    return lead, None


def _process_csv_from_message_files(
    files: list,
    channel_id: str,
    user_id: str,
    thread_ts: str,
    message_ts: str = None
) -> bool:
    """
    Process CSV file from message attachments.

    Args:
        files: List of file objects from message event
        channel_id: Channel to post results to
        user_id: User who sent the message
        thread_ts: Thread timestamp for replies
        message_ts: Message timestamp for fetching files when array is empty

    Returns:
        True if a CSV was found and processing started, False otherwise
    """
    from src.tools.slack_file_handler import (
        get_file_info,
        is_csv_file,
        download_slack_file,
        post_message_to_channel,
        format_processing_result_message,
        get_message_by_timestamp
    )

    # If files array is empty, fetch from message history
    if not files and message_ts:
        print("[DEBUG] Files array empty, fetching message from history...", flush=True)
        message = get_message_by_timestamp(channel_id, message_ts)
        if message:
            files = message.get("files", [])
            print(f"[DEBUG] Retrieved {len(files)} files from message history", flush=True)

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


@app.route("/slack/interactive", methods=["POST"])
def slack_interactive():
    """
    Handle Slack interactive components (buttons, modals).

    This endpoint receives payloads when users interact with
    buttons or other interactive elements in Slack messages.
    """
    try:
        payload = json.loads(request.form.get("payload", "{}"))
        action_type = payload.get("type", "")

        if action_type == "block_actions":
            actions = payload.get("actions", [])
            if actions:
                action_id = actions[0].get("action_id", "")

                # Handle different button actions
                if action_id == "process_more":
                    return jsonify({
                        "response_type": "ephemeral",
                        "text": "Use `/processlead email name, company` to add more leads!"
                    })

        return jsonify({"ok": True})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/slack/events", methods=["POST"])
def slack_events():
    """
    Handle Slack Events API.
    
    Supported events:
    - file_shared: Automatically process CSV file attachments
    - message: Trigger lead processing from "add lead:" messages
    """
    print(f"\n[DEBUG] Incoming request to /slack/events at {datetime.now().isoformat()}", flush=True)
    
    from src.tools.slack_file_handler import (
        verify_slack_signature,
        get_file_info,
        is_csv_file,
        download_slack_file,
        post_message_to_channel,
        format_processing_result_message
    )
    
    # Get raw body FIRST (before any parsing that consumes it)
    raw_body = request.get_data()
    print(f"[DEBUG] Raw body size: {len(raw_body)} bytes", flush=True)
    
    # Parse JSON from raw body
    try:
        data = json.loads(raw_body.decode('utf-8'))
        print(f"[DEBUG] Request type: {data.get('type')}", flush=True)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        print(f"[DEBUG] JSON Parse Error: {e}", flush=True)
        return jsonify({"error": "Invalid JSON"}), 400
    
    # Handle Slack URL verification challenge FIRST (before signature check)
    if data and data.get("type") == "url_verification":
        print("[DEBUG] Handling URL verification challenge", flush=True)
        return jsonify({"challenge": data.get("challenge")})
    
    # Signature verification for all other events
    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")
    print(f"[DEBUG] Timestamp: {timestamp}, Signature: {signature[:10]}...", flush=True)
    
    # Verify request signature (skipped if SLACK_SIGNING_SECRET not configured)
    if not verify_slack_signature(raw_body, timestamp, signature):
        print("[DEBUG] Signature verification FAILED", flush=True)
        return jsonify({"error": "Invalid signature"}), 401
    
    print("[DEBUG] Signature verification PASSED", flush=True)
    
    # Handle events
    event = data.get("event", {})
    event_type = event.get("type", "")
    print(f"[DEBUG] Event type: {event_type}, full event keys: {list(event.keys())}", flush=True)
    if event_type == "message":
        print(f"[DEBUG] Message event details - text: '{event.get('text', '')}', has_files: {'files' in event}, files_count: {len(event.get('files', []))}, subtype: {event.get('subtype', 'none')}", flush=True)
    
    # Handle file_shared events - auto-process CSV attachments
    if event_type == "file_shared":
        file_id = event.get("file_id")
        channel_id = event.get("channel_id")
        message_ts = event.get("message_ts")  # Check if this file was attached to a message
        print(f"[DEBUG] file_shared: file_id={file_id}, channel_id={channel_id}, message_ts={message_ts}", flush=True)
        
        # If this file was attached to a message, check if that message had "add leads:" text
        should_process = True
        user_id = "unknown"
        thread_ts = None
        
        if message_ts:
            from src.tools.slack_file_handler import get_message_by_timestamp
            message = get_message_by_timestamp(channel_id, message_ts)
            if message:
                text = message.get("text", "")
                user_id = message.get("user", "unknown")
                thread_ts = message_ts
                print(f"[DEBUG] Associated message text: '{text}'", flush=True)
                # Only process if message contains "add leads:" trigger
                if "add leads:" in text.lower():
                    print(f"[DEBUG] 'add leads:' trigger found in associated message", flush=True)
                else:
                    print(f"[DEBUG] No 'add leads:' trigger - processing as standalone file", flush=True)
        
        if file_id:
            # Get file info from Slack
            file_info = get_file_info(file_id)
            print(f"[DEBUG] File info retrieved: {file_info.get('ok')}", flush=True)
            
            # Check if it's a CSV file
            if is_csv_file(file_info):
                filename = file_info.get("file", {}).get("name", "leads.csv")
                print(f"[DEBUG] Detected CSV file: {filename}", flush=True)
                
                # Acknowledge quickly (Slack requires response within 3s)
                import threading
                
                def process_in_background():
                    try:
                        print(f"[DEBUG] Background task started for {filename}")
                        # Download the file
                        temp_path, error = download_slack_file(file_info)
                        
                        if error:
                            print(f"[DEBUG] Download error: {error}")
                            post_message_to_channel(
                                channel_id,
                                f"❌ Failed to download `{filename}`: {error}"
                            )
                            return
                        
                        print(f"[DEBUG] File downloaded to: {temp_path}")
                        
                        # Process through agent
                        agent = get_agent()
                        print("[DEBUG] Agent initialized, starting processing...")
                        results = agent.process_leads(temp_path)
                        print(f"[DEBUG] Processing complete. Status: {results.get('status')}")
                        
                        # Clean up temp file
                        from pathlib import Path
                        Path(temp_path).unlink(missing_ok=True)
                        
                        # Post results to channel
                        message = format_processing_result_message(filename, results)
                        if thread_ts:
                            # If this was triggered by "add leads:", reply in thread
                            message += f"\n\n_Uploaded by <@{user_id}>_"
                            post_message_to_channel(channel_id, message, thread_ts=thread_ts)
                        else:
                            # Standalone file upload
                            post_message_to_channel(channel_id, message)
                        print("[DEBUG] Results posted to Slack")
                        
                    except Exception as e:
                        print(f"[DEBUG] Exception in background processing: {e}")
                        post_message_to_channel(
                            channel_id,
                            f"❌ Error processing `{filename}`: {str(e)}"
                        )
                
                # Start background processing
                thread = threading.Thread(target=process_in_background)
                thread.start()
                
                return jsonify({"ok": True, "message": "Processing CSV file..."})
            else:
                print(f"[DEBUG] File {file_id} is not a CSV")
    
    # Handle message events
    if event_type == "message" and not event.get("bot_id"):
        text = event.get("text", "")
        files = event.get("files", [])
        subtype = event.get("subtype", "none")
        files_info = [{"id": f.get("id"), "name": f.get("name")} for f in files]
        print(f"[DEBUG] Message event - text: '{text}', subtype: {subtype}, "
              f"files_count: {len(files)}, files: {files_info}", flush=True)

        # Check for "add leads:" trigger (plural) - expects CSV attachment
        if text.lower().startswith("add leads:"):
            channel_id = event.get("channel")
            user_id = event.get("user", "unknown")
            thread_ts = event.get("ts")
            files = event.get("files", [])
            subtype = event.get("subtype")
            print(f"[DEBUG] add leads (plural) detected, files: {len(files)}, subtype: {subtype}", flush=True)

            # Check BOTH files array AND message subtype
            if files or subtype == "file_share":
                # Process CSV attachment
                if _process_csv_from_message_files(files, channel_id, user_id, thread_ts, thread_ts):
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
            # Parse: "add lead: email name, company"
            lead_text = text[9:].strip()
            channel_id = event.get("channel")
            user_id = event.get("user", "unknown")
            thread_ts = event.get("ts")
            print(f"[DEBUG] add lead command detected: {lead_text}")

            # Use helper function to parse the message
            lead, error = _parse_add_lead_message(lead_text, user_id)

            if error:
                post_message_to_channel(channel_id, error, thread_ts=thread_ts)
                return jsonify({"ok": True})

            import threading

            def process_message_lead():
                try:
                    import tempfile
                    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
                        writer = csv.DictWriter(f, fieldnames=lead.keys())
                        writer.writeheader()
                        writer.writerow(lead)
                        temp_path = f.name

                    agent = get_agent()
                    results = agent.process_leads(temp_path)
                    Path(temp_path).unlink(missing_ok=True)

                    if results.get("status") == "complete" and len(results.get("valid_leads", [])) > 0:
                        score_stats = results.get("score_stats", {})
                        category = (
                            score_stats.get("hot", 0) > 0 and "🔥 HOT" or
                            score_stats.get("warm", 0) > 0 and "🌡️ WARM" or
                            "❄️ COLD"
                        )
                        message = (
                            "✅ *Lead Processed Successfully*\n\n"
                            f"*Name:* {lead['name']}\n"
                            f"*Email:* {lead['email']}\n"
                            f"*Company:* {lead['company'] or 'N/A'}\n"
                            f"*Category:* {category}\n"
                            f"*Score:* {score_stats.get('avg_score', 0):.0f}\n\n"
                            f"_Added by <@{user_id}>_"
                        )
                    else:
                        errors = results.get("validation_errors", ["Invalid email format"])
                        message = (
                            "❌ *Lead Rejected*\n\n"
                            f"Email `{lead['email']}` failed validation:\n"
                            f"• {errors[0] if errors else 'Unknown error'}"
                        )

                    post_message_to_channel(channel_id, message, thread_ts=thread_ts)

                except Exception as e:
                    print(f"[DEBUG] Error processing add lead message: {e}")
                    post_message_to_channel(
                        channel_id,
                        f"❌ Error processing lead: {str(e)}",
                        thread_ts=thread_ts
                    )

            threading.Thread(target=process_message_lead).start()
            return jsonify({"ok": True, "message": "Processing lead..."})

    return jsonify({"ok": True})



def main():
    agent = get_agent()
    
    parser = argparse.ArgumentParser(
        description="Run lead processor webhook server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python server.py
    python server.py --port 8080
    python server.py --host 0.0.0.0 --port 5000

Test with curl:
    curl http://localhost:8080/health
    curl -X POST http://localhost:8080/process \\
         -H "Content-Type: application/json" \\
         -d '{"leads": [{"name": "Test", "email": "test@example.com"}]}'
        """
    )
    
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host to bind to (default: 127.0.0.1)"
    )
    
    parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="Port to run on (default: 8080)"
    )
    
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Run in debug mode"
    )
    
    parser.add_argument(
        "--no-slack",
        action="store_true",
        help="Disable Slack notifications"
    )
    
    args = parser.parse_args()
    
    # Set up agent with CLI options (also used by get_agent() for lazy init)
    global _agent
    _agent = create_agent(
        verbose=args.debug,
        notify_slack=not args.no_slack
    )
    
    print(f"""
╔══════════════════════════════════════════════════════════╗
║           🌐 LEAD PROCESSOR API SERVER                   ║
╠══════════════════════════════════════════════════════════╣
║  Endpoints:                                              ║
║    GET  /health          - Health check                  ║
║    POST /process         - Process JSON leads            ║
║    POST /process/csv     - Process CSV file upload       ║
║    POST /slack/command   - Slack slash command           ║
║    POST /slack/events    - Slack Events API              ║
╠══════════════════════════════════════════════════════════╣
║  Running on: http://{args.host}:{args.port:<24}          ║
║  Slack: {'Enabled' if not args.no_slack else 'Disabled':<49} ║
╠══════════════════════════════════════════════════════════╣
║  Press Ctrl+C to stop                                    ║
╚══════════════════════════════════════════════════════════╝
""")
    
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
