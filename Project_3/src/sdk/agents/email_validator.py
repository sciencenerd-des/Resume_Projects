"""Email Validator Agent for OpenAI Agents SDK.

Specialized agent for comprehensive email validation including:
- Format validation (RFC 5322)
- MX record verification
- Disposable domain detection
- Role-based email flagging
- Batch processing support
"""

from typing import Optional
from agents import Agent, ModelSettings

# Import SDK configuration
from ..sdk_config import SDKConfig

# Import email validator tools
from ..tools.email_validator_tools import (
    validate_email_format,
    validate_email_comprehensive,
    validate_leads_batch,
    check_domain_mx_records,
)


def create_email_validator_agent(
    verbose: bool = False,
    custom_config: Optional[dict] = None
) -> Agent:
    """Create and configure the Email Validator agent.

    This agent specializes in validating email addresses using comprehensive checks.
    It can validate individual emails or batch process lists of leads.

    Args:
        verbose: Enable verbose logging for debugging
        custom_config: Optional custom configuration to override defaults

    Returns:
        Configured Agent instance ready for use

    Example:
        >>> agent = create_email_validator_agent()
        >>> result = agent.run("Validate this email: john@acme.com")
    """
    # Get agent preset configuration
    config = SDKConfig.get_agent_preset("email_validator")

    # Override with custom config if provided
    if custom_config:
        config.update(custom_config)

    # Create the agent with email validation tools
    agent = Agent(
        name="Email Validator",

        instructions=config.get("instructions", """You are the Email Validator agent, a specialist in comprehensive email validation.

Your role is to validate email addresses using multiple validation techniques:

1. **Format Validation**: Check if emails follow RFC 5322 standards
2. **MX Record Verification**: Verify domain has valid mail exchange records (deliverability check)
3. **Disposable Email Detection**: Identify temporary/disposable email providers
4. **Role-Based Detection**: Flag role-based emails (info@, support@, admin@, etc.)

**Available Tools:**
- `validate_email_format`: Basic format validation (fast)
- `validate_email_comprehensive`: Full validation with all checks (recommended)
- `validate_leads_batch`: Batch validation for multiple leads (efficient)
- `check_domain_mx_records`: Check if domain can receive emails

**Guidelines:**
- For single emails, use `validate_email_comprehensive` for thorough validation
- For batch operations, use `validate_leads_batch` for efficiency
- MX checks are slower but more accurate - use when deliverability matters
- Role-based emails are valid but flagged as they may not reach individuals
- Return clear, structured results with validation metadata

**Output Format:**
Always provide:
- Validation status (valid/invalid)
- Specific reason for invalid emails
- Warnings for role-based or flagged emails
- Categorized results for batch operations (valid/invalid/role-based)

Be thorough but efficient. Batch operations should use appropriate batch tools."""),

        tools=[
            validate_email_format,
            validate_email_comprehensive,
            validate_leads_batch,
            check_domain_mx_records,
        ],

        model=config.get("model", SDKConfig.FAST_MODEL),
        model_settings=ModelSettings(
            temperature=config.get("temperature", 0.1)  # Deterministic validation
        ),
    )

    if verbose:
        print(f"[Email Validator Agent] Created with model: {config.get('model')}")
        print(f"[Email Validator Agent] Temperature: {config.get('temperature')}")
        print(f"[Email Validator Agent] Tools: {len(agent.tools)}")

    return agent


# Export the factory function
__all__ = ["create_email_validator_agent"]
