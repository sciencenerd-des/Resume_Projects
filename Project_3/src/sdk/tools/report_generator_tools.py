"""Report Generator Tools for OpenAI Agents SDK.

Wraps existing report generation functions as @function_tool decorated tools
that can be used by SDK agents.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict
from agents import function_tool

# Import shared models
from ._models import LeadDict

# Import existing report generator logic
import sys
from pathlib import Path

# Add parent directory to path to import from src.tools
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.tools.report_generator import (
    generate_report as _generate_report,
    generate_email_report as _generate_email_report,
)


# === Pydantic Models for Input/Output ===

class ReportGenerationInput(BaseModel):
    """Input for generating a lead processing report."""
    model_config = ConfigDict(extra="forbid")

    valid_count: int = Field(..., description="Number of valid leads processed")
    invalid_count: int = Field(..., description="Number of invalid leads rejected")
    errors: List[str] = Field(default_factory=list, description="List of error messages")
    notion_synced: int = Field(default=0, description="Number of leads synced to Notion")
    hot_leads: int = Field(default=0, description="Number of HOT leads")
    warm_leads: int = Field(default=0, description="Number of WARM leads")
    cold_leads: int = Field(default=0, description="Number of COLD leads")
    avg_score: float = Field(default=0.0, description="Average lead score")
    ai_analyzed: int = Field(default=0, description="Number of leads analyzed with AI")


class ReportOutput(BaseModel):
    """Output containing formatted report."""
    model_config = ConfigDict(extra="forbid")

    report: str = Field(..., description="Formatted report text with box drawing characters")


class EmailReportInput(BaseModel):
    """Input for generating an email-friendly report."""
    model_config = ConfigDict(extra="forbid")

    valid_count: int = Field(..., description="Number of valid leads")
    invalid_count: int = Field(..., description="Number of invalid leads")
    errors: List[str] = Field(default_factory=list, description="List of error messages")


class EmailReportOutput(BaseModel):
    """Output containing email report."""
    model_config = ConfigDict(extra="forbid")

    subject: str = Field(..., description="Email subject line")
    body: str = Field(..., description="Plain text email body")


# === SDK Function Tools ===

@function_tool
def generate_processing_report(input_data: ReportGenerationInput) -> ReportOutput:
    """Generate a comprehensive formatted report of lead processing results.

    Creates a visually formatted report with box-drawing characters showing:
    - Processing summary (total, valid, invalid, success rate)
    - Lead categories (HOT/WARM/COLD) if scoring was done
    - Notion sync results if applicable
    - AI analysis count if AI was used
    - Validation errors (up to 10 shown)

    The report is terminal-friendly with proper formatting.

    Args:
        input_data: ReportGenerationInput with processing statistics

    Returns:
        ReportOutput with formatted report text

    Example:
        >>> generate_processing_report(ReportGenerationInput(
        ...     valid_count=47,
        ...     invalid_count=3,
        ...     score_stats={"hot": 12, "warm": 20, "cold": 15, "avg_score": 62.5},
        ...     notion_results={"success": 47, "errors": 0},
        ...     ai_analyzed=5
        ... ))
        ReportOutput(report=\"\"\"
        ╔══════════════════════════════════════════════════════════╗
        ║           LEAD PROCESSING REPORT                         ║
        ╠══════════════════════════════════════════════════════════╣
        ║  Total Processed:       50                               ║
        ║  Valid Leads:           47  ✅                           ║
        ...
        \"\"\")
    """
    report_text = _generate_report(
        valid_count=input_data.valid_count,
        invalid_count=input_data.invalid_count,
        errors=input_data.errors,
        notion_results=input_data.notion_results,
        score_stats=input_data.score_stats,
        ai_analyzed=input_data.ai_analyzed
    )

    return ReportOutput(report=report_text)


@function_tool
def generate_email_summary(input_data: EmailReportInput) -> EmailReportOutput:
    """Generate an email-friendly plain text summary report.

    Creates a simple text report suitable for email notifications:
    - Subject line with key stats
    - Plain text body with summary
    - Top errors listed (up to 5)

    No special formatting characters - just plain text.

    Args:
        input_data: EmailReportInput with basic statistics

    Returns:
        EmailReportOutput with subject and body

    Example:
        >>> generate_email_summary(EmailReportInput(
        ...     valid_count=47,
        ...     invalid_count=3,
        ...     errors=["Invalid email: test@", "Missing company: row 25"]
        ... ))
        EmailReportOutput(
            subject="Lead Processing Complete: 47 leads added, 3 rejected",
            body=\"\"\"Lead Processing Report - 2025-12-21 15:30

            Total Processed: 50
            ✅ Valid Leads: 47
            ❌ Invalid Leads: 3

            Errors:
            - Invalid email: test@
            - Missing company: row 25
            \"\"\"
        )
    """
    result = _generate_email_report(
        valid_count=input_data.valid_count,
        invalid_count=input_data.invalid_count,
        errors=input_data.errors
    )

    return EmailReportOutput(
        subject=result["subject"],
        body=result["body"]
    )


# Export all function tools
__all__ = [
    "generate_processing_report",
    "generate_email_summary",
]
