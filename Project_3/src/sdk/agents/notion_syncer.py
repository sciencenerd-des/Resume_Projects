"""Notion Syncer Agent for OpenAI Agents SDK.

Specialized agent for syncing leads to Notion CRM:
- Create new lead records
- Batch operations
- Track sync status and errors
"""

from typing import Optional
from agents import Agent, ModelSettings

# Import SDK configuration
from ..sdk_config import SDKConfig

# Import Notion syncer tools
from ..tools.notion_syncer_tools import (
    sync_lead_to_notion,
    sync_leads_batch_to_notion,
)


def create_notion_syncer_agent(
    verbose: bool = False,
    custom_config: Optional[dict] = None
) -> Agent:
    """Create and configure the Notion Syncer agent.

    This agent specializes in syncing validated and scored leads to Notion CRM.
    Handles both individual and batch operations efficiently.

    Args:
        verbose: Enable verbose logging for debugging
        custom_config: Optional custom configuration to override defaults

    Returns:
        Configured Agent instance ready for use

    Example:
        >>> agent = create_notion_syncer_agent()
        >>> result = agent.run("Sync these leads to Notion CRM")
    """
    # Get agent preset configuration
    config = SDKConfig.get_agent_preset("notion_syncer")

    # Override with custom config if provided
    if custom_config:
        config.update(custom_config)

    # Create the agent with Notion syncer tools
    agent = Agent(
        name="Notion Syncer",

        instructions=config.get("instructions", """You are the Notion Syncer agent, a specialist in CRM data synchronization.

Your role is to sync validated leads to the Notion CRM database efficiently and reliably.

**Core Responsibilities:**

1. **Create Lead Records**: Add new leads to Notion database with all relevant fields
2. **Batch Processing**: Handle multiple leads efficiently with batch operations
3. **Data Integrity**: Ensure all required fields are present and correctly formatted
4. **Error Handling**: Track sync failures and provide clear error messages
5. **Status Reporting**: Provide clear sync status for each lead

**Available Tools:**
- `sync_lead_to_notion`: Sync a single lead to Notion CRM
- `sync_leads_batch_to_notion`: Batch sync multiple leads efficiently

**Notion Record Fields:**
- **Name** (required): Lead's full name
- **Email** (required): Validated email address
- **Company**: Company name
- **Tags**: Multi-select tags for categorization
- **Source**: Lead source tracking
- **Score**: Numerical score (0-100)
- **Category**: HOT/WARM/COLD classification
- **Created**: Auto-timestamp

**Guidelines:**
- Always use batch operations for multiple leads (more efficient)
- Validate that required fields (name, email) are present
- Handle Notion API errors gracefully
- Track success/failure counts for reporting
- Default source to 'csv_import' if not specified
- Preserve all available lead metadata

**Output Format:**
For single leads:
- Notion page ID
- Sync status (created/simulated/error)
- URL to the Notion page (if created)

For batches:
- Total leads processed
- Success count
- Error count
- Detailed results for each lead

**Error Handling:**
- Missing required fields: Report clearly which field is missing
- API failures: Provide the error message
- Demo mode: Indicate when running in simulated mode (no credentials)

Note: System runs in demo/simulated mode when NOTION_API_KEY or NOTION_DATABASE_ID are not configured."""),

        tools=[
            sync_lead_to_notion,
            sync_leads_batch_to_notion,
        ],

        model=config.get("model", SDKConfig.FAST_MODEL),
        model_settings=ModelSettings(
            temperature=config.get("temperature", 0.1)  # Deterministic operations
        ),
    )

    if verbose:
        print(f"[Notion Syncer Agent] Created with model: {config.get('model')}")
        print(f"[Notion Syncer Agent] Temperature: {config.get('temperature')}")
        print(f"[Notion Syncer Agent] Tools: {len(agent.tools)}")

    return agent


# Export the factory function
__all__ = ["create_notion_syncer_agent"]
