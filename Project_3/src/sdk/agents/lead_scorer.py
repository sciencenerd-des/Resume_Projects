"""Lead Scorer Agent for OpenAI Agents SDK.

Specialized agent for scoring leads based on multiple criteria:
- Company presence and quality
- Job title seniority
- Email domain type (business vs consumer)
- Intent signals and tags
- Negative signals (test emails, unsubscribed)
"""

from typing import Optional
from agents import Agent, ModelSettings

# Import SDK configuration
from ..sdk_config import SDKConfig

# Import lead scorer tools
from ..tools.lead_scorer_tools import (
    score_single_lead,
    score_leads_batch,
    get_scoring_summary_stats,
    get_scoring_rules_info,
    calculate_score_category,
)


def create_lead_scorer_agent(
    verbose: bool = False,
    custom_config: Optional[dict] = None
) -> Agent:
    """Create and configure the Lead Scorer agent.

    This agent specializes in scoring leads based on configurable rules.
    Scores range from 0-100 and leads are categorized as HOT, WARM, or COLD.

    Args:
        verbose: Enable verbose logging for debugging
        custom_config: Optional custom configuration to override defaults

    Returns:
        Configured Agent instance ready for use

    Example:
        >>> agent = create_lead_scorer_agent()
        >>> result = agent.run("Score this lead: VP of Sales at Acme Corp")
    """
    # Get agent preset configuration
    config = SDKConfig.get_agent_preset("lead_scorer")

    # Override with custom config if provided
    if custom_config:
        config.update(custom_config)

    # Create the agent with lead scoring tools
    agent = Agent(
        name="Lead Scorer",

        instructions=config.get("instructions", """You are the Lead Scorer agent, a specialist in evaluating lead quality.

Your role is to score leads based on multiple criteria and categorize them for sales prioritization.

**Scoring Criteria:**

1. **Company Signals** (+20 points)
   - Company information present
   - Quality indicators

2. **Title/Seniority** (+15 to +30 points)
   - VP level: +30 points
   - Director level: +25 points
   - Manager level: +15 points

3. **Email Quality** (+10 points each)
   - Corporate domain (not Gmail/Yahoo/Hotmail)
   - Professional email pattern

4. **Intent Signals** (+20 to +30 points)
   - Enterprise tag: +30 points
   - Demo requested: +25 points
   - Pricing interest: +20 points

5. **Negative Signals** (penalties)
   - Test emails: -50 points
   - Test company: -20 points
   - Unsubscribed: -100 points

**Score Categories:**
- 🔥 **HOT** (70-100): High-quality leads, immediate outreach
- ☀️ **WARM** (40-69): Good leads, scheduled follow-up
- ❄️ **COLD** (0-39): Low-priority leads, nurture campaigns

**Available Tools:**
- `score_single_lead`: Score individual lead with detailed breakdown
- `score_leads_batch`: Efficiently score multiple leads
- `get_scoring_summary_stats`: Calculate statistics (hot/warm/cold counts, averages)
- `get_scoring_rules_info`: View current scoring rules and thresholds
- `calculate_score_category`: Determine category for a given score

**Guidelines:**
- Always provide detailed score breakdown showing which rules applied
- Explain why a lead received its score (transparency)
- For batch operations, include summary statistics
- Highlight HOT leads for immediate action
- Be consistent - same lead attributes should yield same score

**Output Format:**
For single leads:
- Score value (0-100)
- Category (HOT/WARM/COLD)
- Detailed breakdown of rules that applied
- Explanation of score drivers

For batches:
- All scored leads with categories
- Summary statistics (counts per category, avg score)
- Top HOT leads highlighted"""),

        tools=[
            score_single_lead,
            score_leads_batch,
            get_scoring_summary_stats,
            get_scoring_rules_info,
            calculate_score_category,
        ],

        model=config.get("model", SDKConfig.FAST_MODEL),
        model_settings=ModelSettings(
            temperature=config.get("temperature", 0.1)  # Deterministic scoring
        ),
    )

    if verbose:
        print(f"[Lead Scorer Agent] Created with model: {config.get('model')}")
        print(f"[Lead Scorer Agent] Temperature: {config.get('temperature')}")
        print(f"[Lead Scorer Agent] Tools: {len(agent.tools)}")

    return agent


# Export the factory function
__all__ = ["create_lead_scorer_agent"]
