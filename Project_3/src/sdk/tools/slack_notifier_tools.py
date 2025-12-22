"""Slack Notifier Tools for OpenAI Agents SDK.

Wraps existing Slack notification functions as @function_tool decorated tools
that can be used by SDK agents.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict
from agents import function_tool

# Import existing Slack notify logic
import sys
from pathlib import Path

# Add parent directory to path to import from src.tools
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.tools.slack_notify import (
    send_slack_notification as _send_slack_notification,
    send_lead_report_notification as _send_lead_report_notification,
    send_error_alert as _send_error_alert,
)


# === Pydantic Models for Input/Output ===

class SlackMessageInput(BaseModel):
    """Input for sending a Slack message."""
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., description="Main message text (supports Slack markdown)")
    channel: str = Field(default=None, description="Override default channel (e.g., '#marketing')")
    username: str = Field(default="Lead Processor Bot", description="Bot username to display")
    icon_emoji: str = Field(default=":robot_face:", description="Emoji icon for the bot")
    color: str = Field(default="#36a64f", description="Attachment color (hex code)")


class SlackNotificationOutput(BaseModel):
    """Output from Slack notification."""
    model_config = ConfigDict(extra="forbid")

    status: str = Field(..., description="Status: 'sent', 'simulated', or 'error'")
    message: str = Field(default=None, description="Additional message or error details")
    response: str = Field(default=None, description="Slack API response")


class LeadReportNotificationInput(BaseModel):
    """Input for sending a formatted lead report to Slack."""
    model_config = ConfigDict(extra="forbid")

    valid_count: int = Field(..., description="Number of valid leads")
    invalid_count: int = Field(..., description="Number of invalid leads")
    notion_synced: int = Field(default=0, description="Number of leads synced to Notion")
    errors: List[str] = Field(default_factory=list, description="List of error messages")


class ErrorAlertInput(BaseModel):
    """Input for sending an error alert to Slack."""
    model_config = ConfigDict(extra="forbid")

    error_message: str = Field(..., description="The error message to alert")
    context: str = Field(default="", description="Additional context about where the error occurred")


# === SDK Function Tools ===

@function_tool
def send_slack_message(input_data: SlackMessageInput) -> SlackNotificationOutput:
    """Send a custom notification message to Slack via webhook.

    Sends a formatted message with customizable appearance:
    - Message text (supports Slack markdown)
    - Custom channel override
    - Bot username and icon
    - Color-coded attachments

    Args:
        input_data: SlackMessageInput with message and formatting options

    Returns:
        SlackNotificationOutput with send status

    Example:
        >>> send_slack_message(SlackMessageInput(
        ...     message="*New hot lead detected!*\\n\\nJohn Smith from Acme Corp",
        ...     color="#ff4444",
        ...     icon_emoji=":fire:"
        ... ))
        SlackNotificationOutput(
            status="sent",
            response="ok"
        )

    Note:
        Requires SLACK_WEBHOOK_URL environment variable.
        Runs in demo mode (simulated) if not configured.
    """
    result = _send_slack_notification(
        message=input_data.message,
        channel=input_data.channel,
        username=input_data.username,
        icon_emoji=input_data.icon_emoji,
        color=input_data.color
    )

    return SlackNotificationOutput(
        status=result.get("status", "error"),
        message=result.get("message"),
        response=result.get("response")
    )


@function_tool
def send_lead_processing_summary(input_data: LeadReportNotificationInput) -> SlackNotificationOutput:
    """Send a formatted lead processing summary report to Slack.

    Creates a professional, emoji-rich summary notification:
    - Total leads processed
    - Valid/invalid breakdown
    - Success rate percentage
    - Notion sync count (if applicable)
    - Top errors listed (up to 3)
    - Color-coded based on success rate:
      * Green (80%+): Excellent
      * Yellow (50-79%): Warning
      * Red (<50%): Critical

    Args:
        input_data: LeadReportNotificationInput with processing statistics

    Returns:
        SlackNotificationOutput with send status

    Example:
        >>> send_lead_processing_summary(LeadReportNotificationInput(
        ...     valid_count=47,
        ...     invalid_count=3,
        ...     notion_synced=47,
        ...     errors=["Invalid email: test@example"]
        ... ))
        SlackNotificationOutput(
            status="sent",
            response="ok"
        )

    Note:
        Automatically chooses appropriate emoji and color based on results.
        Respects DISABLE_SLACK feature flag.
    """
    result = _send_lead_report_notification(
        valid_count=input_data.valid_count,
        invalid_count=input_data.invalid_count,
        notion_synced=input_data.notion_synced,
        errors=input_data.errors
    )

    return SlackNotificationOutput(
        status=result.get("status", "error"),
        message=result.get("message"),
        response=result.get("response")
    )


@function_tool
def send_error_notification(input_data: ErrorAlertInput) -> SlackNotificationOutput:
    """Send a critical error alert to Slack.

    Sends a high-priority error notification with:
    - 🚨 Alert emoji
    - Red color coding
    - Error message
    - Contextual information
    - Warning icon

    Use for critical failures that need immediate attention.

    Args:
        input_data: ErrorAlertInput with error details

    Returns:
        SlackNotificationOutput with send status

    Example:
        >>> send_error_notification(ErrorAlertInput(
        ...     error_message="Database connection failed",
        ...     context="Notion CRM sync operation"
        ... ))
        SlackNotificationOutput(
            status="sent",
            response="ok"
        )

    Note:
        Always uses red color and warning icon for visibility.
    """
    result = _send_error_alert(
        error_message=input_data.error_message,
        context=input_data.context
    )

    return SlackNotificationOutput(
        status=result.get("status", "error"),
        message=result.get("message"),
        response=result.get("response")
    )


# Export all function tools
__all__ = [
    "send_slack_message",
    "send_lead_processing_summary",
    "send_error_notification",
]
