"""AI Analyzer Tools for OpenAI Agents SDK.

Wraps existing AI lead analysis functions as @function_tool decorated tools
that can be used by SDK agents.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from agents import function_tool

# Import shared models
from ._models import LeadDict

# Import existing AI analyzer logic
import sys
from pathlib import Path

# Add parent directory to path to import from src.tools
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.tools.ai_analyzer import AILeadAnalyzer


# === Global Analyzer Instance ===
_analyzer_instance: AILeadAnalyzer = None


def _get_analyzer() -> AILeadAnalyzer:
    """Get or create the global AILeadAnalyzer instance."""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = AILeadAnalyzer()  # Uses default model
    return _analyzer_instance


# === Pydantic Models for Input/Output ===

class LeadClassificationInput(BaseModel):
    """Input for AI lead classification."""
    model_config = ConfigDict(extra="forbid")

    lead: LeadDict = Field(
        ...,
        description="Lead dictionary with fields: name, email, company, title, tags, etc."
    )


class AIAnalysisOutput(BaseModel):
    """Output from AI lead classification."""
    model_config = ConfigDict(extra="forbid")

    quality: str = Field(..., description="Lead quality: 'hot', 'warm', 'cold', or 'unknown'")
    confidence: float = Field(..., description="Confidence score from 0.0 to 1.0")
    intent_signals: List[str] = Field(..., description="List of detected buying intent signals")
    suggested_action: str = Field(..., description="Recommended next step for sales team")
    reasoning: str = Field(..., description="Explanation of the classification")


class BatchClassificationInput(BaseModel):
    """Input for batch AI lead classification."""
    model_config = ConfigDict(extra="forbid")

    leads: List[LeadDict] = Field(
        ...,
        description="List of lead dictionaries to analyze"
    )
    max_concurrent: int = Field(
        default=5,
        description="Maximum concurrent API calls (for future async implementation)"
    )


class BatchClassificationOutput(BaseModel):
    """Output from batch AI lead classification."""
    model_config = ConfigDict(extra="forbid")

    analyzed_leads: List[LeadDict] = Field(
        ...,
        description="Leads with ai_analysis, ai_quality, and ai_confidence fields added"
    )
    count: int = Field(..., description="Number of leads analyzed")


class OutreachSuggestionInput(BaseModel):
    """Input for generating personalized outreach suggestion."""
    model_config = ConfigDict(extra="forbid")

    lead: LeadDict = Field(..., description="Lead dictionary")
    tone: str = Field(
        default="professional",
        description="Tone for the suggestion: 'professional', 'friendly', or 'urgent'"
    )


class OutreachSuggestionOutput(BaseModel):
    """Output containing personalized outreach suggestion."""
    model_config = ConfigDict(extra="forbid")

    suggestion: str = Field(..., description="Personalized outreach approach and messaging")


# === SDK Function Tools ===

@function_tool
def classify_lead_with_ai(input_data: LeadClassificationInput) -> AIAnalysisOutput:
    """Use AI to classify a lead's quality and extract intent signals.

    Leverages advanced AI to analyze leads beyond rule-based scoring:
    - Understands context and nuance in job titles and company names
    - Detects subtle buying intent signals
    - Provides confidence scores for classification
    - Suggests specific next steps for sales team

    This tool uses GPT-4o-mini for cost-effective yet intelligent analysis.

    Args:
        input_data: LeadClassificationInput with lead dictionary

    Returns:
        AIAnalysisOutput with quality, confidence, signals, action, and reasoning

    Example:
        >>> classify_lead_with_ai(LeadClassificationInput(lead={
        ...     "name": "Sarah Johnson",
        ...     "email": "sarah@techcorp.com",
        ...     "company": "TechCorp",
        ...     "title": "VP of Product",
        ...     "tags": "demo_requested,pricing"
        ... }))
        AIAnalysisOutput(
            quality="hot",
            confidence=0.9,
            intent_signals=["demo_requested", "pricing_interest", "vp_decision_maker"],
            suggested_action="Schedule demo within 24 hours",
            reasoning="VP-level contact showing strong buying intent with demo request and pricing interest"
        )

    Note:
        Requires OPENAI_API_KEY environment variable to be set.
        Returns 'unknown' quality if API is unavailable.
    """
    analyzer = _get_analyzer()

    if not analyzer.is_available:
        return AIAnalysisOutput(
            quality="unknown",
            confidence=0.0,
            intent_signals=[],
            suggested_action="AI analysis unavailable - check OPENAI_API_KEY",
            reasoning="OpenAI API key not configured"
        )

    result = analyzer.classify_lead(input_data.lead)

    return AIAnalysisOutput(
        quality=result.quality,
        confidence=result.confidence,
        intent_signals=result.intent_signals,
        suggested_action=result.suggested_action,
        reasoning=result.reasoning
    )


@function_tool
def classify_leads_batch_with_ai(input_data: BatchClassificationInput) -> BatchClassificationOutput:
    """Classify multiple leads using AI in batch.

    Analyzes each lead and adds AI-powered insights:
    - `ai_analysis`: Full analysis dict with all fields
    - `ai_quality`: Quality classification (hot/warm/cold)
    - `ai_confidence`: Confidence score (0.0-1.0)

    Processes leads sequentially to avoid rate limits. Each lead
    receives individual AI analysis.

    Args:
        input_data: BatchClassificationInput with leads list

    Returns:
        BatchClassificationOutput with analyzed leads and count

    Example:
        >>> classify_leads_batch_with_ai(BatchClassificationInput(leads=[
        ...     {"name": "John", "title": "CEO", "company": "Acme"},
        ...     {"name": "Jane", "title": "Developer", "email": "jane@gmail.com"}
        ... ]))
        BatchClassificationOutput(
            analyzed_leads=[
                {
                    "name": "John",
                    "title": "CEO",
                    "company": "Acme",
                    "ai_quality": "hot",
                    "ai_confidence": 0.85,
                    "ai_analysis": {...}
                },
                ...
            ],
            count=2
        )

    Note:
        This operation can be slow for large batches due to API calls.
        Consider using only for high-value leads or when AI insights
        are critical for the use case.
    """
    analyzer = _get_analyzer()

    if not analyzer.is_available:
        # Return leads unchanged with unknown quality
        leads_with_analysis = []
        for lead in input_data.leads:
            lead_copy = lead.copy()
            lead_copy['ai_analysis'] = {
                'quality': 'unknown',
                'confidence': 0.0,
                'intent_signals': [],
                'suggested_action': 'AI unavailable',
                'reasoning': 'OpenAI API key not configured'
            }
            lead_copy['ai_quality'] = 'unknown'
            lead_copy['ai_confidence'] = 0.0
            leads_with_analysis.append(lead_copy)

        return BatchClassificationOutput(
            analyzed_leads=leads_with_analysis,
            count=len(leads_with_analysis)
        )

    analyzed_leads = analyzer.classify_leads_batch(
        input_data.leads,
        input_data.max_concurrent
    )

    return BatchClassificationOutput(
        analyzed_leads=analyzed_leads,
        count=len(analyzed_leads)
    )


@function_tool
def generate_personalized_outreach(input_data: OutreachSuggestionInput) -> OutreachSuggestionOutput:
    """Generate AI-powered personalized outreach suggestions for a lead.

    Creates tailored outreach approach based on lead context:
    - Identifies hooks that would resonate with the lead
    - Emphasizes relevant value propositions
    - Suggests specific next steps
    - Adapts tone based on seniority and context

    Args:
        input_data: OutreachSuggestionInput with lead and tone preference

    Returns:
        OutreachSuggestionOutput with personalized suggestion

    Example:
        >>> generate_personalized_outreach(OutreachSuggestionInput(
        ...     lead={"name": "Mike", "title": "CTO", "company": "StartupXYZ"},
        ...     tone="professional"
        ... ))
        OutreachSuggestionOutput(
            suggestion="Approach Mike as a technical decision-maker interested in scalability.
                       Emphasize how your solution reduces infrastructure complexity and costs.
                       Suggest a technical deep-dive call with your solution architect."
        )

    Note:
        Requires OPENAI_API_KEY. Returns fallback message if unavailable.
    """
    analyzer = _get_analyzer()

    if not analyzer.is_available:
        return OutreachSuggestionOutput(
            suggestion="AI outreach suggestions unavailable - check OPENAI_API_KEY configuration"
        )

    suggestion = analyzer.generate_outreach_suggestion(
        input_data.lead,
        input_data.tone
    )

    return OutreachSuggestionOutput(suggestion=suggestion)


# Export all function tools
__all__ = [
    "classify_lead_with_ai",
    "classify_leads_batch_with_ai",
    "generate_personalized_outreach",
]
