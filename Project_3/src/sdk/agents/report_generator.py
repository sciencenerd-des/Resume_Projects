"""Report Generator Agent for OpenAI Agents SDK.

Specialized agent for generating formatted reports:
- Terminal-friendly formatted reports
- Email-friendly plain text reports
- Summary statistics and metrics
"""

from typing import Optional
from agents import Agent, ModelSettings

# Import SDK configuration
from ..sdk_config import SDKConfig

# Import report generator tools
from ..tools.report_generator_tools import (
    generate_processing_report,
    generate_email_summary,
)


def create_report_generator_agent(
    verbose: bool = False,
    custom_config: Optional[dict] = None
) -> Agent:
    """Create and configure the Report Generator agent.

    This agent specializes in creating formatted reports of lead processing results.
    Supports both terminal-friendly and email-friendly formats.

    Args:
        verbose: Enable verbose logging for debugging
        custom_config: Optional custom configuration to override defaults

    Returns:
        Configured Agent instance ready for use

    Example:
        >>> agent = create_report_generator_agent()
        >>> result = agent.run("Generate a report for 47 valid and 3 invalid leads")
    """
    # Get agent preset configuration
    config = SDKConfig.get_agent_preset("report_generator")

    # Override with custom config if provided
    if custom_config:
        config.update(custom_config)

    # Create the agent with report generator tools
    agent = Agent(
        name="Report Generator",

        instructions=config.get("instructions", """You are the Report Generator agent, a specialist in creating clear and informative reports.

Your role is to generate professional reports summarizing lead processing results.

**Report Types:**

1. **Terminal Report** (Formatted)
   - Uses box-drawing characters for visual appeal
   - Includes emojis for clarity
   - Sections: Summary, Categories, Notion Sync, Errors
   - Best for: CLI output, logs, terminal display

2. **Email Report** (Plain Text)
   - Simple text format
   - Concise subject line
   - Plain text body
   - Best for: Email notifications, alerts

**Available Tools:**
- `generate_processing_report`: Create formatted terminal report
- `generate_email_summary`: Create plain text email report

**Report Sections:**

**Processing Summary:**
- Total leads processed
- Valid leads count ✅
- Invalid leads count ❌
- Success rate percentage

**Lead Categories** (if scoring was done):
- 🔥 HOT leads (score 70-100)
- 🌡️ WARM leads (score 40-69)
- ❄️ COLD leads (score 0-39)
- Average score

**Notion Sync** (if applicable):
- Successfully synced count 📝
- Sync errors

**AI Analysis** (if applicable):
- Number of leads analyzed with AI 🤖

**Errors:**
- Up to 10 validation errors listed
- Indication if more errors exist

**Guidelines:**
- Include all available data in reports
- Format numbers clearly (no decimals for counts)
- Success rate should be percentage with 1 decimal
- Show timestamps for reports
- Be concise but complete
- Use emojis appropriately in terminal reports
- Keep email reports plain and simple

**Output Format:**
Terminal report: Full formatted text with box characters
Email report: Subject line + plain text body

Provide reports that are immediately actionable and easy to understand at a glance."""),

        tools=[
            generate_processing_report,
            generate_email_summary,
        ],

        model=config.get("model", SDKConfig.FAST_MODEL),
        model_settings=ModelSettings(
            temperature=config.get("temperature", 0.2)  # Slightly creative for formatting
        ),
    )

    if verbose:
        print(f"[Report Generator Agent] Created with model: {config.get('model')}")
        print(f"[Report Generator Agent] Temperature: {config.get('temperature')}")
        print(f"[Report Generator Agent] Tools: {len(agent.tools)}")

    return agent


# Export the factory function
__all__ = ["create_report_generator_agent"]
