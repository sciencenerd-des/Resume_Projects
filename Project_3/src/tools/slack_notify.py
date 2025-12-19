"""Slack Notification Tool for Lead Processing Agent.

Sends real-time notifications to Slack channels.
"""
import os
import json
from typing import Dict, Any, Optional
from urllib.request import Request, urlopen
from urllib.error import URLError


def _get_slack_webhook_url() -> Optional[str]:
    """Get Slack webhook URL from environment."""
    return os.getenv("SLACK_WEBHOOK_URL")


def send_slack_notification(
    message: str,
    channel: Optional[str] = None,
    username: str = "Lead Processor Bot",
    icon_emoji: str = ":robot_face:",
    color: str = "#36a64f"
) -> Dict[str, Any]:
    """
    Send a notification to Slack via webhook.
    
    Args:
        message: Main message text
        channel: Override default channel (optional)
        username: Bot username to display
        icon_emoji: Emoji icon for the bot
        color: Attachment color (hex)
        
    Returns:
        Dict with status and details
    """
    webhook_url = _get_slack_webhook_url()
    
    if not webhook_url:
        # Demo mode - simulate success
        return {
            "status": "simulated",
            "message": "Demo mode: Slack webhook not configured",
            "data": {"text": message}
        }
    
    payload = {
        "username": username,
        "icon_emoji": icon_emoji,
        "attachments": [
            {
                "color": color,
                "text": message,
                "footer": "Lead Processing Agent",
                "ts": int(__import__("time").time())
            }
        ]
    }
    
    if channel:
        payload["channel"] = channel
    
    try:
        data = json.dumps(payload).encode("utf-8")
        request = Request(
            webhook_url,
            data=data,
            headers={"Content-Type": "application/json"}
        )
        
        with urlopen(request, timeout=10) as response:
            return {
                "status": "sent",
                "response": response.read().decode("utf-8")
            }
    except URLError as e:
        return {
            "status": "error",
            "message": str(e)
        }


def send_lead_report_notification(
    valid_count: int,
    invalid_count: int,
    notion_synced: int = 0,
    errors: list = None
) -> Dict[str, Any]:
    """
    Send a formatted lead processing report to Slack.
    
    Args:
        valid_count: Number of valid leads processed
        invalid_count: Number of invalid leads rejected
        notion_synced: Number of leads synced to Notion
        errors: List of error messages
        
    Returns:
        Dict with notification status
    """
    total = valid_count + invalid_count
    success_rate = (valid_count / total * 100) if total > 0 else 0
    
    # Choose color based on success rate
    if success_rate >= 80:
        color = "#36a64f"  # Green
        emoji = "✅"
    elif success_rate >= 50:
        color = "#f2c744"  # Yellow
        emoji = "⚠️"
    else:
        color = "#dc3545"  # Red
        emoji = "❌"
    
    message_lines = [
        f"{emoji} *Lead Processing Complete*",
        "",
        f"📊 *Summary:*",
        f"• Total Processed: `{total}`",
        f"• Valid Leads: `{valid_count}` ✅",
        f"• Invalid Leads: `{invalid_count}` ❌",
        f"• Success Rate: `{success_rate:.1f}%`",
    ]
    
    if notion_synced > 0:
        message_lines.append(f"• Synced to Notion: `{notion_synced}` 📝")
    
    if errors and len(errors) > 0:
        message_lines.append("")
        message_lines.append(f"⚠️ *Errors ({len(errors)}):*")
        for error in errors[:3]:
            message_lines.append(f"• {error}")
        if len(errors) > 3:
            message_lines.append(f"_...and {len(errors) - 3} more_")
    
    return send_slack_notification(
        message="\n".join(message_lines),
        color=color
    )


def send_error_alert(error_message: str, context: str = "") -> Dict[str, Any]:
    """
    Send an error alert to Slack.
    
    Args:
        error_message: The error message
        context: Additional context about where the error occurred
        
    Returns:
        Dict with notification status
    """
    message = f"🚨 *Error in Lead Processing*\n\n"
    if context:
        message += f"*Context:* {context}\n"
    message += f"*Error:* `{error_message}`"
    
    return send_slack_notification(
        message=message,
        color="#dc3545",
        icon_emoji=":warning:"
    )
