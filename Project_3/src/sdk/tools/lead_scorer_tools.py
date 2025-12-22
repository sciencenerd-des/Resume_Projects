"""Lead Scorer Tools for OpenAI Agents SDK.

Wraps existing lead scoring functions as @function_tool decorated tools
that can be used by SDK agents.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict
from agents import function_tool

# Import shared models
from ._models import LeadDict

# Import existing lead scoring logic
import sys
from pathlib import Path

# Add parent directory to path to import from src.tools
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.tools.lead_scorer import LeadScorer, ScoringRule


# === Global Scorer Instance ===
# Use a singleton for consistent scoring across agent calls
_scorer_instance: Optional[LeadScorer] = None


def _get_scorer() -> LeadScorer:
    """Get or create the global LeadScorer instance."""
    global _scorer_instance
    if _scorer_instance is None:
        _scorer_instance = LeadScorer()  # Uses default rules
    return _scorer_instance


# === Pydantic Models for Input/Output ===

class LeadScoringInput(BaseModel):
    """Input for scoring a single lead."""
    model_config = ConfigDict(extra="forbid")

    lead: LeadDict = Field(
        ...,
        description="Lead dictionary with attributes like email, company, title, tags"
    )


class ScoringBreakdownItem(BaseModel):
    """Breakdown of a single scoring rule application."""
    model_config = ConfigDict(extra="forbid")

    rule: str = Field(..., description="Description of the rule that applied")
    points: int = Field(..., description="Points added or subtracted")
    field: str = Field(..., description="Field that was evaluated")


class LeadScoringOutput(BaseModel):
    """Output from scoring a single lead."""
    model_config = ConfigDict(extra="forbid")

    score: int = Field(..., description="Total score (0-100)")
    category: str = Field(..., description="Score category: 'hot', 'warm', or 'cold'")
    normalized_score: float = Field(..., description="Normalized score (0-100)")
    breakdown: List[ScoringBreakdownItem] = Field(
        ...,
        description="Detailed breakdown of how the score was calculated"
    )


class BatchScoringInput(BaseModel):
    """Input for batch lead scoring."""
    model_config = ConfigDict(extra="forbid")

    leads: List[LeadDict] = Field(
        ...,
        description="List of lead dictionaries to score"
    )


class BatchScoringOutput(BaseModel):
    """Output from batch lead scoring."""
    model_config = ConfigDict(extra="forbid")

    scored_leads: List[LeadDict] = Field(
        ...,
        description="List of leads with added score, score_category, and score_breakdown fields"
    )
    count: int = Field(..., description="Number of leads scored")


class SummaryStatsInput(BaseModel):
    """Input for calculating summary statistics."""
    model_config = ConfigDict(extra="forbid")

    scored_leads: List[LeadDict] = Field(
        ...,
        description="List of leads that have been scored (must have 'score' and 'score_category' fields)"
    )


class SummaryStatsOutput(BaseModel):
    """Output containing summary statistics for scored leads."""
    model_config = ConfigDict(extra="forbid")

    total: int = Field(..., description="Total number of leads")
    hot: int = Field(..., description="Number of HOT leads (score >= 70)")
    warm: int = Field(..., description="Number of WARM leads (40 <= score < 70)")
    cold: int = Field(..., description="Number of COLD leads (score < 40)")
    avg_score: float = Field(..., description="Average score across all leads")
    max_score: int = Field(..., description="Highest score")
    min_score: int = Field(..., description="Lowest score")


class ScoreThresholds(BaseModel):
    """Score thresholds for lead categories."""
    model_config = ConfigDict(extra="forbid")

    hot: int = Field(..., description="Minimum score for HOT category")
    warm: int = Field(..., description="Minimum score for WARM category")
    cold: int = Field(..., description="Minimum score for COLD category")


class ScoringRulesOutput(BaseModel):
    """Output containing current scoring rules configuration."""
    model_config = ConfigDict(extra="forbid")

    rules_count: int = Field(..., description="Total number of scoring rules")
    thresholds: ScoreThresholds = Field(
        ...,
        description="Score thresholds for categories (hot, warm, cold)"
    )
    max_score: int = Field(..., description="Maximum possible score")
    sample_rules: List[str] = Field(
        ...,
        description="Sample of rule descriptions for reference"
    )


class CategoryInput(BaseModel):
    """Input for determining category from a score."""
    model_config = ConfigDict(extra="forbid")

    score: int = Field(..., description="Score value to categorize")


class CategoryOutput(BaseModel):
    """Output containing the category for a score."""
    model_config = ConfigDict(extra="forbid")

    category: str = Field(..., description="Category: 'hot', 'warm', or 'cold'")
    threshold: int = Field(..., description="Minimum score for this category")


# === SDK Function Tools ===

@function_tool
def score_single_lead(input_data: LeadScoringInput) -> LeadScoringOutput:
    """Score a single lead based on configured scoring rules.

    Evaluates the lead against multiple criteria including:
    - Company presence and quality
    - Job title seniority (VP, Director, Manager)
    - Email domain (business vs consumer)
    - Tags and intent signals (enterprise, demo_requested, pricing)
    - Negative signals (test emails, unsubscribed)

    Returns a score from 0-100 and categorizes as HOT (>=70), WARM (40-69), or COLD (<40).

    Args:
        input_data: LeadScoringInput with lead dictionary

    Returns:
        LeadScoringOutput with score, category, normalized score, and detailed breakdown

    Example:
        >>> score_single_lead(LeadScoringInput(lead={
        ...     "email": "john@acme.com",
        ...     "company": "Acme Corp",
        ...     "title": "VP of Sales",
        ...     "tags": "enterprise,demo_requested"
        ... }))
        LeadScoringOutput(
            score=95,
            category="hot",
            normalized_score=95.0,
            breakdown=[
                {"rule": "Has company information", "points": 20, "field": "company"},
                {"rule": "VP-level title", "points": 30, "field": "title"},
                ...
            ]
        )
    """
    scorer = _get_scorer()
    result = scorer.score_lead(input_data.lead)

    # Convert breakdown items to Pydantic models
    breakdown_models = [
        ScoringBreakdownItem(**item)
        for item in result.breakdown
    ]

    return LeadScoringOutput(
        score=result.score,
        category=result.category.value,
        normalized_score=result.normalized_score,
        breakdown=breakdown_models
    )


@function_tool
def score_leads_batch(input_data: BatchScoringInput) -> BatchScoringOutput:
    """Score multiple leads in batch and add scoring data to each.

    Efficiently scores a list of leads and adds the following fields to each:
    - `score`: Total score (0-100)
    - `score_category`: Category ('hot', 'warm', or 'cold')
    - `normalized_score`: Normalized score (0-100)
    - `score_breakdown`: List of rules that applied with their point values

    This is the recommended method for processing multiple leads as it applies
    consistent scoring rules across all leads.

    Args:
        input_data: BatchScoringInput with list of leads

    Returns:
        BatchScoringOutput with scored leads and count

    Example:
        >>> score_leads_batch(BatchScoringInput(leads=[
        ...     {"email": "john@acme.com", "title": "VP of Sales"},
        ...     {"email": "jane@gmail.com", "title": "Developer"}
        ... ]))
        BatchScoringOutput(
            scored_leads=[
                {
                    "email": "john@acme.com",
                    "title": "VP of Sales",
                    "score": 40,
                    "score_category": "warm",
                    "normalized_score": 40.0,
                    "score_breakdown": [...]
                },
                ...
            ],
            count=2
        )
    """
    scorer = _get_scorer()
    scored_leads = scorer.score_leads_batch(input_data.leads)

    return BatchScoringOutput(
        scored_leads=scored_leads,
        count=len(scored_leads)
    )


@function_tool
def get_scoring_summary_stats(input_data: SummaryStatsInput) -> SummaryStatsOutput:
    """Calculate summary statistics for a batch of scored leads.

    Provides key metrics including:
    - Category distribution (hot/warm/cold counts)
    - Score statistics (avg, min, max)
    - Total lead count

    Useful for reporting and understanding the quality distribution of a lead batch.

    Args:
        input_data: SummaryStatsInput with scored leads
            (must have 'score' and 'score_category' fields)

    Returns:
        SummaryStatsOutput with comprehensive statistics

    Example:
        >>> get_scoring_summary_stats(SummaryStatsInput(scored_leads=[
        ...     {"score": 85, "score_category": "hot"},
        ...     {"score": 55, "score_category": "warm"},
        ...     {"score": 25, "score_category": "cold"}
        ... ]))
        SummaryStatsOutput(
            total=3,
            hot=1,
            warm=1,
            cold=1,
            avg_score=55.0,
            max_score=85,
            min_score=25
        )
    """
    scorer = _get_scorer()
    stats = scorer.get_summary_stats(input_data.scored_leads)

    return SummaryStatsOutput(**stats)


@function_tool
def get_scoring_rules_info() -> ScoringRulesOutput:
    """Get information about the current scoring rules configuration.

    Returns details about the scoring system including:
    - Number of active scoring rules
    - Category thresholds (hot, warm, cold)
    - Maximum possible score
    - Sample rule descriptions

    Useful for understanding how leads are scored and what criteria matter most.

    Returns:
        ScoringRulesOutput with rules configuration details

    Example:
        >>> get_scoring_rules_info()
        ScoringRulesOutput(
            rules_count=13,
            thresholds={"hot": 70, "warm": 40, "cold": 0},
            max_score=100,
            sample_rules=[
                "Has company information (+20 points)",
                "VP-level title (+30 points)",
                ...
            ]
        )
    """
    scorer = _get_scorer()

    # Get sample rule descriptions (first 10)
    sample_rules = [
        f"{rule.description} ({'+' if rule.points > 0 else ''}{rule.points} points)"
        for rule in scorer.rules[:10]
    ]

    return ScoringRulesOutput(
        rules_count=len(scorer.rules),
        thresholds=ScoreThresholds(**scorer.thresholds),
        max_score=scorer.max_score,
        sample_rules=sample_rules
    )


@function_tool
def calculate_score_category(input_data: CategoryInput) -> CategoryOutput:
    """Determine the category (hot/warm/cold) for a given score.

    Uses the configured thresholds to categorize a score:
    - HOT: score >= 70
    - WARM: 40 <= score < 70
    - COLD: score < 40

    Args:
        input_data: CategoryInput with score value

    Returns:
        CategoryOutput with category and threshold

    Example:
        >>> calculate_score_category(CategoryInput(score=75))
        CategoryOutput(category="hot", threshold=70)
    """
    scorer = _get_scorer()
    category = scorer._get_category(input_data.score)

    return CategoryOutput(
        category=category.value,
        threshold=scorer.thresholds.get(category.value, 0)
    )


# Export all function tools
__all__ = [
    "score_single_lead",
    "score_leads_batch",
    "get_scoring_summary_stats",
    "get_scoring_rules_info",
    "calculate_score_category",
]
