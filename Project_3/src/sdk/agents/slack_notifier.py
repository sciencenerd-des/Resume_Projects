"""Slack Notifier Agent for OpenAI Agents SDK.

Specialized agent for sending Slack notifications:
- Processing summaries
- Error alerts
- Custom messages
- Rich formatting with emojis
"""

from typing import Optional
from agents import Agent, ModelSettings

# Import SDK configuration
from ..sdk_config import SDKConfig
from ..utils.feature_flags import FeatureFlags

# Import Slack notifier tools
from ..tools.slack_notifier_tools import (
    send_slack_message,
    send_lead_processing_summary,
    send_error_notification,
)


def create_slack_notifier_agent(
    verbose: bool = False,
    custom_config: Optional[dict] = None
) -> Optional[Agent]:
    """Create and configure the Slack Notifier agent.

    This agent specializes in sending notifications to Slack channels.
    Handles formatted messages, error alerts, and processing summaries.

    IMPORTANT: Only creates agent when DISABLE_SLACK feature flag is NOT set.

    Args:
        verbose: Enable verbose logging for debugging
        custom_config: Optional custom configuration to override defaults

    Returns:
        Configured Agent instance or None if Slack is disabled

    Example:
        >>> if FeatureFlags.is_slack_enabled():
        ...     agent = create_slack_notifier_agent()
        ...     result = agent.run("Send a summary of 47 processed leads")
    """
    # Check feature flag - return None if Slack is disabled
    if not FeatureFlags.is_slack_enabled():
        if verbose:
            print("[Slack Notifier Agent] Skipped (DISABLE_SLACK=true)")
        return None

    # Get agent preset configuration
    config = SDKConfig.get_agent_preset("slack_notifier")

    # Override with custom config if provided
    if custom_config:
        config.update(custom_config)

    # Create the agent with Slack notifier tools
    agent = Agent(
        name="Slack Notifier",

        instructions=config.get("instructions", """You are the Slack Notifier agent, a specialist in Slack communication and notifications.

Your role is to send clear, informative, and well-formatted notifications to Slack channels.

**Notification Types:**

1. **Custom Messages**
   - Flexible messaging with markdown support
   - Custom colors and emojis
   - Channel overrides
   - Use for: Alerts, updates, announcements

2. **Lead Processing Summaries**
   - Formatted report notifications
   - Auto-color based on success rate:
     * Green (80%+): Excellent results
     * Yellow (50-79%): Some issues
     * Red (<50%): Many failures
   - Includes: Total, valid, invalid, success %, errors
   - Use for: End-of-processing notifications

3. **Error Alerts**
   - High-priority error notifications
   - Red color coding
   - Warning icon (🚨)
   - Context information
   - Use for: Critical failures, immediate attention needed

**Available Tools:**
- `send_slack_message`: Send custom formatted message
- `send_lead_processing_summary`: Send processing results summary
- `send_error_notification`: Send critical error alert

**Slack Markdown Support:**
- `*bold*` for emphasis
- `_italic_` for subtle emphasis
- \`code\` for data values
- Emojis: :emoji_name: or Unicode
- Line breaks: \\n

**Message Formatting Best Practices:**
- Use emojis for visual scanning (✅ ❌ 🔥 ☀️ ❄️ 📝 🤖)
- Bold section headers (*Header:*)
- Backticks for numbers and data (`47 leads`)
- Bullet points for lists (• or -)
- Keep messages concise but informative
- Use color coding to signal urgency/status

**Guidelines:**
- Choose appropriate notification type for the message
- Use emojis meaningfully (status indicators, not decoration)
- Keep messages scannable (headers, bullets, spacing)
- Include key metrics prominently
- Limit error lists to 3-5 items (with "...and X more" if needed)
- Color code based on severity/success
- Respect DISABLE_SLACK feature flag

**Output Format:**
- Return notification status (sent/simulated/error)
- Include any error messages if send failed
- Provide Slack API response if available

**Error Handling:**
- Missing webhook URL: Run in simulated mode
- API failures: Return error status with message
- Network issues: Provide clear error description

Note: System runs in demo/simulated mode when SLACK_WEBHOOK_URL is not configured.
      All messages respect the DISABLE_SLACK feature flag."""),

        tools=[
            send_slack_message,
            send_lead_processing_summary,
            send_error_notification,
        ],

        model=config.get("model", SDKConfig.FAST_MODEL),
        model_settings=ModelSettings(
            temperature=config.get("temperature", 0.1)  # Deterministic messaging
        ),
    )

    if verbose:
        print(f"[Slack Notifier Agent] Created with model: {config.get('model')}")
        print(f"[Slack Notifier Agent] Temperature: {config.get('temperature')}")
        print(f"[Slack Notifier Agent] Tools: {len(agent.tools)}")

    return agent


# Export the factory function
__all__ = ["create_slack_notifier_agent"]
