"""AI Analyzer Agent for OpenAI Agents SDK.

Specialized agent for AI-powered lead analysis:
- Intent signal detection
- Quality classification beyond rule-based scoring
- Personalized outreach recommendations
- Confidence scoring

Note: This agent is OPTIONAL and only activates when ENABLE_AI_ANALYSIS=true
"""

from typing import Optional
from agents import Agent, ModelSettings

# Import SDK configuration
from ..sdk_config import SDKConfig
from ..utils.feature_flags import FeatureFlags

# Import AI analyzer tools
from ..tools.ai_analyzer_tools import (
    classify_lead_with_ai,
    classify_leads_batch_with_ai,
    generate_personalized_outreach,
)


def create_ai_analyzer_agent(
    verbose: bool = False,
    custom_config: Optional[dict] = None
) -> Optional[Agent]:
    """Create and configure the AI Analyzer agent.

    This agent uses advanced AI (GPT-4o) to provide intelligent lead insights
    that go beyond rule-based scoring. It detects subtle buying signals and
    provides personalized outreach recommendations.

    IMPORTANT: This agent is only created when ENABLE_AI_ANALYSIS feature flag is true.

    Args:
        verbose: Enable verbose logging for debugging
        custom_config: Optional custom configuration to override defaults

    Returns:
        Configured Agent instance or None if feature is disabled

    Example:
        >>> if FeatureFlags.is_ai_analysis_enabled():
        ...     agent = create_ai_analyzer_agent()
        ...     result = agent.run("Analyze this lead: VP of Sales at TechCorp")
    """
    # Check feature flag - return None if disabled
    if not FeatureFlags.is_ai_analysis_enabled():
        if verbose:
            print("[AI Analyzer Agent] Skipped (ENABLE_AI_ANALYSIS=false)")
        return None

    # Get agent preset configuration
    config = SDKConfig.get_agent_preset("ai_analyzer")

    # Override with custom config if provided
    if custom_config:
        config.update(custom_config)

    # Create the agent with AI analysis tools
    agent = Agent(
        name="AI Analyzer",

        instructions=config.get("instructions", """You are the AI Analyzer agent, a specialist in advanced lead intelligence.

Your role is to provide AI-powered insights that go beyond rule-based scoring:

**Core Capabilities:**

1. **Intelligent Quality Classification**
   - Analyze lead context holistically (not just keyword matching)
   - Detect subtle buying intent signals
   - Classify as HOT/WARM/COLD with confidence scores
   - Understand industry-specific patterns

2. **Intent Signal Detection**
   - Identify explicit signals (demo requested, pricing inquiries)
   - Detect implicit signals (seniority, company stage, domain patterns)
   - Recognize urgency indicators
   - Spot competitive displacement opportunities

3. **Personalized Outreach**
   - Generate tailored messaging suggestions
   - Adapt tone based on seniority and industry
   - Recommend specific value propositions to emphasize
   - Suggest optimal next steps for engagement

**Available Tools:**
- `classify_lead_with_ai`: Analyze single lead with AI for quality and intent
- `classify_leads_batch_with_ai`: Batch AI classification for multiple leads
- `generate_personalized_outreach`: Create personalized outreach recommendations

**When to Use AI Analysis:**
- ✅ When lead data is ambiguous or requires nuanced interpretation
- ✅ For high-value leads where personalization matters
- ✅ When rule-based scoring misses context
- ✅ To generate custom outreach for key accounts
- ❌ NOT needed for obvious hot/cold leads
- ❌ NOT for bulk processing (slow and costly)

**Guidelines:**
- Be transparent about confidence levels - don't overstate certainty
- Explain your reasoning clearly for sales team
- Consider broader context (industry, company stage, timing)
- Provide actionable recommendations, not just classifications
- Flag when AI analysis adds value vs. rule-based scoring

**Output Format:**
For single leads:
- Quality classification (hot/warm/cold)
- Confidence score (0.0-1.0)
- Detected intent signals with explanations
- Suggested action for sales team
- Clear reasoning for classification

For batch operations:
- All leads with AI insights added
- Highlight leads where AI provides unique value
- Summary of intent signals across batch

Remember: You complement rule-based scoring, not replace it. Use AI where context and nuance matter most."""),

        tools=[
            classify_lead_with_ai,
            classify_leads_batch_with_ai,
            generate_personalized_outreach,
        ],

        model=config.get("model", SDKConfig.ADVANCED_MODEL),  # Use GPT-4o for better quality
        model_settings=ModelSettings(
            temperature=config.get("temperature", 0.7)  # Higher for creative analysis
        ),
    )

    if verbose:
        print(f"[AI Analyzer Agent] Created with model: {config.get('model')}")
        print(f"[AI Analyzer Agent] Temperature: {config.get('temperature')}")
        print(f"[AI Analyzer Agent] Tools: {len(agent.tools)}")
        print(f"[AI Analyzer Agent] Rate limit: {config.get('rate_limit', 'default')} calls/min")

    return agent


# Export the factory function
__all__ = ["create_ai_analyzer_agent"]
