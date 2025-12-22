"""OpenAI Agents SDK Configuration.

This module provides centralized configuration for all SDK agents, including:
- Agent presets (model, temperature, guardrails)
- Tracing configuration
- Rate limits and cost controls
- Environment-based feature flags
"""

import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from .utils.feature_flags import FeatureFlags

# Load environment variables
load_dotenv()


class SDKConfig:
    """Centralized SDK configuration management."""

    # API Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Model Configuration
    DEFAULT_MODEL: str = FeatureFlags.get_openai_model()
    FAST_MODEL: str = "gpt-4o-mini"
    ADVANCED_MODEL: str = "gpt-4o"

    # Agent Timeout Configuration
    AGENT_TIMEOUT: int = FeatureFlags.get_agent_timeout()

    # Handoff and Tool Limits
    MAX_HANDOFFS: int = FeatureFlags.get_max_handoffs()
    MAX_TOOL_CALLS: int = FeatureFlags.get_max_tool_calls()

    # Tracing Configuration
    ENABLE_TRACING: bool = FeatureFlags.is_tracing_enabled()
    TRACING_PROVIDER: str = FeatureFlags.get_tracing_provider()

    # Session Storage (Redis)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    SESSION_TTL_SECONDS: int = int(os.getenv("SESSION_TTL_SECONDS", "86400"))

    # Rate Limiting (Calls per Minute)
    RATE_LIMIT_GPT4O: int = 30
    RATE_LIMIT_GPT4O_MINI: int = 60

    @classmethod
    def get_agent_preset(cls, agent_name: str) -> Dict[str, Any]:
        """Get configuration preset for a specific agent.

        Args:
            agent_name: Name of the agent (e.g., "email_validator", "lead_scorer")

        Returns:
            Dictionary containing model, temperature, and other agent settings
        """
        presets = {
            "orchestrator": {
                "model": cls.DEFAULT_MODEL,
                "temperature": 0.3,
                "max_handoffs": cls.MAX_HANDOFFS,
                "max_tool_calls": cls.MAX_TOOL_CALLS,
                "timeout": cls.AGENT_TIMEOUT,
                "instructions": """You are the Lead Processing Orchestrator agent.
Your role is to coordinate the entire lead processing pipeline by delegating tasks
to specialized agents. You manage the workflow, handle errors, and ensure all steps
complete successfully.

When processing leads:
1. Validate emails through the Email Validator agent
2. Score leads through the Lead Scorer agent
3. Optionally analyze with AI Analyzer agent (if enabled)
4. Sync to Notion CRM through the Notion Syncer agent
5. Generate reports through the Report Generator agent
6. Send notifications through the Slack Notifier agent

Maintain context across handoffs and provide clear status updates."""
            },

            "email_validator": {
                "model": cls.FAST_MODEL,
                "temperature": 0.1,  # Deterministic validation
                "max_tool_calls": 20,
                "timeout": 30,
                "instructions": """You are the Email Validator agent.
Your role is to validate email addresses using comprehensive checks:
- Email format validation (RFC 5322)
- MX record verification for deliverability
- Batch processing support

Use your tools to validate emails and return structured results with validation
status, error messages, and confidence scores."""
            },

            "lead_scorer": {
                "model": cls.FAST_MODEL,
                "temperature": 0.1,  # Deterministic scoring
                "max_tool_calls": 20,
                "timeout": 30,
                "instructions": """You are the Lead Scorer agent.
Your role is to score leads based on multiple criteria:
- Email quality (corporate domain, role-based patterns)
- Job title (seniority, relevance)
- Company attributes
- Custom scoring rules

Calculate scores from 0-100 and categorize leads as HOT (80+), WARM (50-79),
or COLD (<50). Provide detailed explanations for scores."""
            },

            "ai_analyzer": {
                "model": cls.ADVANCED_MODEL,  # Use GPT-4o for better quality
                "temperature": 0.7,  # More creative analysis
                "max_tool_calls": 10,
                "timeout": 60,
                "rate_limit": cls.RATE_LIMIT_GPT4O,
                "instructions": """You are the AI Analyzer agent.
Your role is to provide intelligent insights about leads using advanced analysis:
- Industry classification
- Buying intent signals
- Personalization recommendations
- Enrichment suggestions
- Risk assessment

Only activate when ENABLE_AI_ANALYSIS feature flag is enabled.
Provide actionable insights that help sales teams engage effectively."""
            },

            "notion_syncer": {
                "model": cls.FAST_MODEL,
                "temperature": 0.1,  # Deterministic CRM operations
                "max_tool_calls": 30,
                "timeout": 60,
                "instructions": """You are the Notion Syncer agent.
Your role is to sync lead data to Notion CRM:
- Create new lead records in Notion database
- Update existing records
- Handle batch operations efficiently
- Maintain data integrity

Use your tools to interact with the Notion API and return detailed sync results
including created/updated record IDs and any errors."""
            },

            "report_generator": {
                "model": cls.FAST_MODEL,
                "temperature": 0.2,
                "max_tool_calls": 10,
                "timeout": 45,
                "instructions": """You are the Report Generator agent.
Your role is to generate comprehensive lead processing reports:
- Text summaries with key metrics
- CSV exports for data analysis
- PDF reports with formatting
- Statistical summaries

Format reports clearly with headers, bullet points, and organized data.
Highlight important metrics like conversion rates, score distributions, and top leads."""
            },

            "slack_notifier": {
                "model": cls.FAST_MODEL,
                "temperature": 0.1,
                "max_tool_calls": 15,
                "timeout": 30,
                "instructions": """You are the Slack Notifier agent.
Your role is to send notifications and updates to Slack:
- Format processing results with emojis and structure
- Send to channels or threads
- Handle errors gracefully
- Respect DISABLE_SLACK feature flag

Only send notifications when DISABLE_SLACK is not set. Format messages to be
clear, concise, and actionable for the marketing team."""
            }
        }

        return presets.get(agent_name, {
            "model": cls.DEFAULT_MODEL,
            "temperature": 0.5,
            "max_tool_calls": 20,
            "timeout": cls.AGENT_TIMEOUT,
            "instructions": "You are a specialized agent in the lead processing system."
        })

    @classmethod
    def get_tracing_config(cls) -> Optional[Dict[str, Any]]:
        """Get tracing configuration if enabled.

        Returns:
            Tracing configuration dict or None if tracing disabled
        """
        if not cls.ENABLE_TRACING:
            return None

        config = {
            "enabled": True,
            "provider": cls.TRACING_PROVIDER,
        }

        # Provider-specific configuration
        if cls.TRACING_PROVIDER == "langsmith":
            config["api_key"] = os.getenv("LANGSMITH_API_KEY")
            config["project"] = os.getenv("LANGSMITH_PROJECT", "project-3-leads")
        elif cls.TRACING_PROVIDER == "wandb":
            config["api_key"] = os.getenv("WANDB_API_KEY")
            config["project"] = os.getenv("WANDB_PROJECT", "project-3-leads")
        elif cls.TRACING_PROVIDER == "console":
            config["verbose"] = FeatureFlags.is_debug_enabled()

        return config

    @classmethod
    def validate_config(cls) -> tuple[bool, list[str]]:
        """Validate that all required configuration is present.

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        if not cls.OPENAI_API_KEY:
            errors.append("OPENAI_API_KEY is not set")

        if cls.ENABLE_TRACING:
            if cls.TRACING_PROVIDER == "langsmith" and not os.getenv("LANGSMITH_API_KEY"):
                errors.append("LANGSMITH_API_KEY required when using langsmith tracing")
            elif cls.TRACING_PROVIDER == "wandb" and not os.getenv("WANDB_API_KEY"):
                errors.append("WANDB_API_KEY required when using wandb tracing")

        return (len(errors) == 0, errors)

    @classmethod
    def get_session_config(cls) -> Dict[str, Any]:
        """Get session storage configuration for Slack conversations.

        Returns:
            Session configuration dictionary
        """
        return {
            "redis_url": cls.REDIS_URL,
            "ttl_seconds": cls.SESSION_TTL_SECONDS,
            "key_prefix": "slack_session:",
        }

    @classmethod
    def print_startup_diagnostics(cls) -> None:
        """Print configuration diagnostics on startup."""
        is_valid, errors = cls.validate_config()

        print("=" * 60)
        print("OPENAI AGENTS SDK - CONFIGURATION")
        print("=" * 60)
        print(f"OpenAI Model: {cls.DEFAULT_MODEL}")
        print(f"Fast Model: {cls.FAST_MODEL}")
        print(f"Advanced Model: {cls.ADVANCED_MODEL}")
        print(f"Max Handoffs: {cls.MAX_HANDOFFS}")
        print(f"Max Tool Calls: {cls.MAX_TOOL_CALLS}")
        print(f"Agent Timeout: {cls.AGENT_TIMEOUT}s")
        print()
        print("FEATURE FLAGS:")
        print(f"  AI Analysis: {'✓' if FeatureFlags.is_ai_analysis_enabled() else '✗'}")
        print(f"  Debug Mode: {'✓' if FeatureFlags.is_debug_enabled() else '✗'}")
        print(f"  Slack Enabled: {'✓' if FeatureFlags.is_slack_enabled() else '✗'}")
        print(f"  Tracing: {'✓' if cls.ENABLE_TRACING else '✗'} ({cls.TRACING_PROVIDER})")
        print(f"  SDK Agent: {'✓' if FeatureFlags.is_sdk_enabled() else '✗'}")
        print()
        print("SESSION STORAGE:")
        print(f"  Redis URL: {cls.REDIS_URL}")
        print(f"  Session TTL: {cls.SESSION_TTL_SECONDS}s ({cls.SESSION_TTL_SECONDS // 3600}h)")
        print()

        if is_valid:
            print("✓ Configuration valid")
        else:
            print("✗ Configuration errors:")
            for error in errors:
                print(f"  - {error}")

        print("=" * 60)


# Export the config class
__all__ = ["SDKConfig"]
