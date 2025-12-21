"""Email Validator Tools for OpenAI Agents SDK.

Wraps existing email validation functions as @function_tool decorated tools
that can be used by SDK agents.
"""

from typing import List, Dict, Any, Tuple
from pydantic import BaseModel, Field, ConfigDict
from agents import function_tool

# Import shared models
from ._models import LeadDict, EmailMetadata

# Import existing email validation logic
import sys
from pathlib import Path

# Add parent directory to path to import from src.tools
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.tools.email_validator import (
    validate_email as _validate_email,
    validate_email_advanced as _validate_email_advanced,
    validate_leads_advanced as _validate_leads_advanced,
    check_mx_record as _check_mx_record,
    is_disposable_email as _is_disposable_email,
    is_role_based_email as _is_role_based_email
)


# === Pydantic Models for Input/Output ===

class EmailValidationInput(BaseModel):
    """Input for basic email validation."""
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., description="Email address to validate")
    strict: bool = Field(
        default=False,
        description="Use strict validation pattern (2-4 char TLD requirement)"
    )


class EmailValidationOutput(BaseModel):
    """Output from basic email validation."""
    model_config = ConfigDict(extra="forbid")

    is_valid: bool = Field(..., description="Whether the email is valid")
    reason: str = Field(..., description="Validation result message")


class EmailAdvancedInput(BaseModel):
    """Input for advanced email validation."""
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., description="Email address to validate")
    check_mx: bool = Field(
        default=True,
        description="Verify MX records for deliverability"
    )
    check_disposable: bool = Field(
        default=True,
        description="Check if email is from disposable provider"
    )
    flag_role_based: bool = Field(
        default=True,
        description="Flag role-based emails (info@, support@, etc.)"
    )


class EmailAdvancedOutput(BaseModel):
    """Output from advanced email validation."""
    model_config = ConfigDict(extra="forbid")

    is_valid: bool = Field(..., description="Whether the email is valid")
    reason: str = Field(..., description="Validation result message")
    metadata: EmailMetadata = Field(
        ...,
        description="Detailed validation metadata including MX, disposable, and role checks"
    )


class LeadValidationInput(BaseModel):
    """Input for batch lead validation."""
    model_config = ConfigDict(extra="forbid")

    leads: List[LeadDict] = Field(
        ...,
        description="List of lead dictionaries to validate"
    )
    email_field: str = Field(
        default="email",
        description="Name of the email field in each lead dict"
    )
    check_mx: bool = Field(
        default=False,
        description="Verify MX records (slower, default off for performance)"
    )
    check_disposable: bool = Field(
        default=True,
        description="Check for disposable email providers"
    )
    flag_role_based: bool = Field(
        default=True,
        description="Flag role-based emails"
    )


class LeadValidationOutput(BaseModel):
    """Output from batch lead validation."""
    model_config = ConfigDict(extra="forbid")

    valid_leads: List[LeadDict] = Field(
        ...,
        description="List of leads with valid emails"
    )
    invalid_leads: List[LeadDict] = Field(
        ...,
        description="List of leads with invalid emails"
    )
    role_based_leads: List[LeadDict] = Field(
        ...,
        description="List of leads with role-based emails (valid but flagged)"
    )
    valid_count: int = Field(..., description="Count of valid leads")
    invalid_count: int = Field(..., description="Count of invalid leads")
    role_based_count: int = Field(..., description="Count of role-based leads")
    errors: List[str] = Field(..., description="List of error messages for invalid leads")


class MXCheckInput(BaseModel):
    """Input for MX record check."""
    model_config = ConfigDict(extra="forbid")

    domain: str = Field(..., description="Domain to check for MX records")
    timeout: float = Field(
        default=3.0,
        description="DNS query timeout in seconds"
    )


class MXCheckOutput(BaseModel):
    """Output from MX record check."""
    model_config = ConfigDict(extra="forbid")

    has_mx: bool = Field(..., description="Whether domain has valid MX records")
    message: str = Field(..., description="Result message with details")


# === SDK Function Tools ===

@function_tool
def validate_email_format(input_data: EmailValidationInput) -> EmailValidationOutput:
    """Validate email address format using regex patterns.

    Performs basic email format validation according to RFC 5322 standards.
    Use strict mode to enforce 2-4 character TLD requirement.

    Args:
        input_data: EmailValidationInput with email and strict flag

    Returns:
        EmailValidationOutput with validation result and reason

    Example:
        >>> validate_email_format(EmailValidationInput(email="john@acme.com"))
        EmailValidationOutput(is_valid=True, reason="Valid email format")
    """
    is_valid, reason = _validate_email(input_data.email, input_data.strict)
    return EmailValidationOutput(is_valid=is_valid, reason=reason)


@function_tool
def validate_email_comprehensive(input_data: EmailAdvancedInput) -> EmailAdvancedOutput:
    """Perform comprehensive email validation with multiple checks.

    Validates email using:
    - Format validation (RFC 5322)
    - MX record verification (if check_mx=True)
    - Disposable email domain detection (if check_disposable=True)
    - Role-based email flagging (if flag_role_based=True)

    Args:
        input_data: EmailAdvancedInput with email and check options

    Returns:
        EmailAdvancedOutput with validation result, reason, and detailed metadata

    Example:
        >>> validate_email_comprehensive(EmailAdvancedInput(
        ...     email="info@company.com",
        ...     check_mx=True
        ... ))
        EmailAdvancedOutput(
            is_valid=True,
            reason="Email validation passed",
            metadata={
                "format_valid": True,
                "mx_valid": True,
                "is_disposable": False,
                "is_role_based": True,
                "warnings": ["Role-based email: info@"]
            }
        )
    """
    is_valid, reason, metadata = _validate_email_advanced(
        input_data.email,
        input_data.check_mx,
        input_data.check_disposable,
        input_data.flag_role_based
    )
    return EmailAdvancedOutput(is_valid=is_valid, reason=reason, metadata=EmailMetadata(**metadata))


@function_tool
def validate_leads_batch(input_data: LeadValidationInput) -> LeadValidationOutput:
    """Validate emails for a batch of leads with comprehensive checks.

    Processes multiple leads and categorizes them based on email validation:
    - Valid leads: Passed all checks, not role-based
    - Invalid leads: Failed format, MX, or disposable checks
    - Role-based leads: Valid but flagged as role-based (info@, support@, etc.)

    Each lead in the output includes `_email_validation` metadata with detailed check results.

    Args:
        input_data: LeadValidationInput with leads list and validation options

    Returns:
        LeadValidationOutput with categorized leads and statistics

    Example:
        >>> validate_leads_batch(LeadValidationInput(
        ...     leads=[
        ...         {"email": "john@acme.com", "name": "John Doe"},
        ...         {"email": "info@company.com", "name": "Info"}
        ...     ],
        ...     check_mx=False
        ... ))
        LeadValidationOutput(
            valid_leads=[{"email": "john@acme.com", ...}],
            invalid_leads=[],
            role_based_leads=[{"email": "info@company.com", ...}],
            valid_count=1,
            invalid_count=0,
            role_based_count=1,
            errors=[]
        )
    """
    # Convert input leads to dicts for the legacy function
    leads_dicts = [lead.model_dump() if isinstance(lead, LeadDict) else lead for lead in input_data.leads]

    result = _validate_leads_advanced(
        leads_dicts,
        input_data.email_field,
        input_data.check_mx,
        input_data.check_disposable,
        input_data.flag_role_based
    )

    # Convert result dict lists to LeadDict lists
    return LeadValidationOutput(
        valid_leads=[LeadDict(**lead) for lead in result["valid_leads"]],
        invalid_leads=[LeadDict(**lead) for lead in result["invalid_leads"]],
        role_based_leads=[LeadDict(**lead) for lead in result["role_based_leads"]],
        valid_count=result["valid_count"],
        invalid_count=result["invalid_count"],
        role_based_count=result["role_based_count"],
        errors=result["errors"]
    )


@function_tool
def check_domain_mx_records(input_data: MXCheckInput) -> MXCheckOutput:
    """Check if a domain has valid MX (mail exchange) records for email deliverability.

    Queries DNS for MX records. Falls back to A record if no MX found.
    Requires dnspython package to be installed.

    Args:
        input_data: MXCheckInput with domain and timeout

    Returns:
        MXCheckOutput with MX validation result

    Example:
        >>> check_domain_mx_records(MXCheckInput(domain="gmail.com"))
        MXCheckOutput(has_mx=True, message="Valid MX records found: 5")
    """
    has_mx, message = _check_mx_record(input_data.domain, input_data.timeout)
    return MXCheckOutput(has_mx=has_mx, message=message)


# Export all function tools
__all__ = [
    "validate_email_format",
    "validate_email_comprehensive",
    "validate_leads_batch",
    "check_domain_mx_records",
]
