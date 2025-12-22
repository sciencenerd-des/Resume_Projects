"""Notion Syncer Tools for OpenAI Agents SDK.

Wraps existing Notion CRM functions as @function_tool decorated tools
that can be used by SDK agents.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from agents import function_tool

# Import shared models
from ._models import LeadDict

# Import existing Notion CRM logic
import sys
from pathlib import Path

# Add parent directory to path to import from src.tools
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.tools.notion_crm import (
    add_lead_to_notion as _add_lead_to_notion,
    add_leads_batch as _add_leads_batch,
)


# === Pydantic Models for Input/Output ===

class LeadNotionInput(BaseModel):
    """Input for adding a single lead to Notion."""
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="Lead's full name")
    email: str = Field(..., description="Validated email address")
    company: str = Field(default=None, description="Company name")
    tags: str = Field(default=None, description="Comma-separated tags")
    source: str = Field(default=None, description="Lead source (e.g., 'csv_import', 'webform')")
    score: int = Field(default=None, description="Lead score (0-100)")
    score_category: str = Field(default=None, description="Score category: 'hot', 'warm', or 'cold'")


class LeadNotionOutput(BaseModel):
    """Output from adding a lead to Notion."""
    model_config = ConfigDict(extra="forbid")

    lead_id: str = Field(..., description="Notion page ID for the created lead")
    status: str = Field(..., description="Status: 'created', 'simulated', or 'error'")
    message: str = Field(default=None, description="Additional message or error details")
    url: str = Field(default=None, description="URL to the Notion page")


class BatchNotionInput(BaseModel):
    """Input for batch adding leads to Notion."""
    model_config = ConfigDict(extra="forbid")

    leads: List[LeadDict] = Field(
        ...,
        description="List of lead dictionaries with name, email, company, tags, score fields"
    )


class BatchNotionOutput(BaseModel):
    """Output from batch Notion operation."""
    model_config = ConfigDict(extra="forbid")

    total: int = Field(..., description="Total number of leads processed")
    success: int = Field(..., description="Number of successfully synced leads")
    errors: int = Field(..., description="Number of errors encountered")
    error_messages: List[str] = Field(default_factory=list, description="Error messages if any")


# === SDK Function Tools ===

@function_tool
def sync_lead_to_notion(input_data: LeadNotionInput) -> LeadNotionOutput:
    """Sync a single validated lead to Notion CRM database.

    Creates a new page in the configured Notion database with lead information.
    Supports custom properties including:
    - Basic info (name, email, company)
    - Tags for categorization
    - Lead score and category
    - Source tracking
    - Automatic timestamp

    Args:
        input_data: LeadNotionInput with lead details

    Returns:
        LeadNotionOutput with Notion page ID and status

    Example:
        >>> sync_lead_to_notion(LeadNotionInput(
        ...     name="John Smith",
        ...     email="john@acme.com",
        ...     company="Acme Corp",
        ...     tags="enterprise,demo_requested",
        ...     score=85,
        ...     score_category="hot"
        ... ))
        LeadNotionOutput(
            lead_id="abc123-notion-page-id",
            status="created",
            url="https://notion.so/abc123"
        )

    Note:
        Requires NOTION_API_KEY and NOTION_DATABASE_ID environment variables.
        Runs in demo mode (simulated) if not configured.
    """
    result = _add_lead_to_notion(
        name=input_data.name,
        email=input_data.email,
        company=input_data.company,
        tags=input_data.tags,
        source=input_data.source,
        score=input_data.score,
        score_category=input_data.score_category
    )

    return LeadNotionOutput(
        lead_id=result.get("lead_id", ""),
        status=result.get("status", "error"),
        message=result.get("message"),
        url=result.get("url")
    )


@function_tool
def sync_leads_batch_to_notion(input_data: BatchNotionInput) -> BatchNotionOutput:
    """Sync multiple leads to Notion CRM in batch.

    Efficiently processes a list of leads and creates Notion pages for each.
    Each lead should have: name, email, and optionally company, tags, score, etc.

    The source field defaults to 'csv_import' if not specified.

    Args:
        input_data: BatchNotionInput with list of leads

    Returns:
        BatchNotionOutput with summary statistics and detailed results

    Example:
        >>> sync_leads_batch_to_notion(BatchNotionInput(leads=[
        ...     {"name": "John", "email": "john@acme.com", "score": 85, "score_category": "hot"},
        ...     {"name": "Jane", "email": "jane@techco.com", "score": 60, "score_category": "warm"}
        ... ]))
        BatchNotionOutput(
            total=2,
            success=2,
            errors=0,
            results=[
                {"lead_id": "abc123", "status": "created"},
                {"lead_id": "def456", "status": "created"}
            ]
        )

    Note:
        Processing is sequential to respect API rate limits.
        Use for batches up to 100 leads at a time.
    """
    result = _add_leads_batch(input_data.leads)

    return BatchNotionOutput(
        total=result["total"],
        success=result["success"],
        errors=result["errors"],
        results=result["results"]
    )


# Export all function tools
__all__ = [
    "sync_lead_to_notion",
    "sync_leads_batch_to_notion",
]
