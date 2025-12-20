#!/usr/bin/env python3
"""Webhook server for lead processing.

Expose an HTTP endpoint to receive leads via POST request.

Usage:
    python server.py
    python server.py --port 8080
"""
import sys
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
        import os
        _agent = create_agent(
            verbose=os.getenv("DEBUG", "false").lower() == "true",
            notify_slack=os.getenv("DISABLE_SLACK", "false").lower() != "true"
        )
    return _agent


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
    
    Can be used to trigger lead processing from channel messages
    or DMs containing lead information.
    """
    data = request.get_json()
    
    # Handle Slack URL verification challenge
    if data.get("type") == "url_verification":
        return jsonify({"challenge": data.get("challenge")})
    
    # Handle events
    event = data.get("event", {})
    event_type = event.get("type", "")
    
    if event_type == "message" and not event.get("bot_id"):
        text = event.get("text", "")
        # Check if message starts with a trigger word
        if text.lower().startswith("add lead:"):
            # Parse: "add lead: email name, company"
            lead_text = text[9:].strip()
            # Could trigger processing here...
            pass
    
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
