"""Feature flag management for SDK configuration."""
import os
from typing import Optional


class FeatureFlags:
    """Centralized feature flag management."""
    
    @staticmethod
    def is_ai_analysis_enabled() -> bool:
        """Check if AI analysis is enabled."""
        return os.getenv("ENABLE_AI_ANALYSIS", "false").lower() == "true"
    
    @staticmethod
    def is_debug_enabled() -> bool:
        """Check if debug mode is enabled."""
        return os.getenv("DEBUG", "false").lower() == "true"
    
    @staticmethod
    def is_slack_enabled() -> bool:
        """Check if Slack notifications are enabled."""
        return os.getenv("DISABLE_SLACK", "false").lower() != "true"
    
    @staticmethod
    def is_tracing_enabled() -> bool:
        """Check if agent tracing is enabled."""
        return os.getenv("ENABLE_AGENT_TRACING", "false").lower() == "true"
    
    @staticmethod
    def get_max_handoffs() -> int:
        """Get maximum number of agent handoffs allowed."""
        return int(os.getenv("MAX_AGENT_HANDOFFS", "10"))
    
    @staticmethod
    def get_max_tool_calls() -> int:
        """Get maximum number of tool calls allowed."""
        return int(os.getenv("MAX_TOOL_CALLS", "50"))
    
    @staticmethod
    def get_agent_timeout() -> int:
        """Get agent timeout in seconds."""
        return int(os.getenv("AGENT_TIMEOUT_SECONDS", "120"))
    
    @staticmethod
    def get_openai_model() -> str:
        """Get OpenAI model to use."""
        return os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    @staticmethod
    def get_tracing_provider() -> str:
        """Get tracing provider (console, langsmith, wandb)."""
        return os.getenv("TRACING_PROVIDER", "console")
    
    @staticmethod
    def is_sdk_enabled() -> bool:
        """Check if SDK agent should be used (for rollback capability)."""
        return os.getenv("USE_SDK_AGENT", "true").lower() == "true"


# Export the class
__all__ = ["FeatureFlags"]
