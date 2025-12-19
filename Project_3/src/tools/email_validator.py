"""Email Validation Tool for Lead Processing Agent.

Validates email addresses using regex patterns.
"""
import re
from typing import Tuple, List, Dict, Any

# RFC 5322 simplified pattern for practical email validation
EMAIL_PATTERN = re.compile(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
)

# More strict pattern from project constitution
STRICT_EMAIL_PATTERN = re.compile(
    r'^[\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4}$'
)


def validate_email(email: str, strict: bool = False) -> Tuple[bool, str]:
    """
    Validate an email address format.
    
    Args:
        email: Email address to validate
        strict: Use strict validation pattern (2-4 char TLD)
        
    Returns:
        Tuple of (is_valid: bool, reason: str)
    """
    if not email:
        return False, "Email is empty"
    
    email = email.strip().lower()
    
    if len(email) > 254:
        return False, "Email exceeds maximum length (254 characters)"
    
    pattern = STRICT_EMAIL_PATTERN if strict else EMAIL_PATTERN
    
    if pattern.match(email):
        return True, "Valid email format"
    else:
        return False, f"Invalid email format: {email}"


def validate_leads(leads: List[Dict[str, Any]], email_field: str = "email") -> Dict[str, Any]:
    """
    Validate emails in a list of leads.
    
    Args:
        leads: List of lead dictionaries
        email_field: Name of the email field in each lead dict
        
    Returns:
        Dict with valid_leads, invalid_leads, and error_messages
    """
    valid_leads = []
    invalid_leads = []
    errors = []
    
    for i, lead in enumerate(leads):
        email = lead.get(email_field, "")
        is_valid, reason = validate_email(email)
        
        if is_valid:
            valid_leads.append(lead)
        else:
            invalid_leads.append(lead)
            errors.append(f"Lead {i+1}: {reason}")
    
    return {
        "valid_leads": valid_leads,
        "invalid_leads": invalid_leads,
        "valid_count": len(valid_leads),
        "invalid_count": len(invalid_leads),
        "errors": errors
    }
