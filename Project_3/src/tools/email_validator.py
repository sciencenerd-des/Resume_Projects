"""Email Validation Tool for Lead Processing Agent.

Provides comprehensive email validation including:
- Format validation via regex
- DNS MX record verification
- Disposable email domain detection
- Role-based email flagging
"""
import re
import os
from typing import Tuple, List, Dict, Any, Optional
from pathlib import Path

# RFC 5322 simplified pattern for practical email validation
EMAIL_PATTERN = re.compile(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
)

# More strict pattern from project constitution
STRICT_EMAIL_PATTERN = re.compile(
    r'^[\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4}$'
)

# Role-based email prefixes that indicate non-personal addresses
ROLE_BASED_PREFIXES = [
    'info', 'support', 'admin', 'webmaster', 'postmaster',
    'sales', 'marketing', 'contact', 'hello', 'help',
    'noreply', 'no-reply', 'donotreply', 'do-not-reply',
    'abuse', 'spam', 'hostmaster', 'billing', 'accounts',
    'feedback', 'mail', 'office', 'team', 'jobs', 'careers',
    'hr', 'press', 'media', 'legal', 'privacy', 'security'
]

# Cache for disposable domains
_disposable_domains_cache: Optional[set] = None


def _load_disposable_domains() -> set:
    """Load disposable email domains from file."""
    global _disposable_domains_cache
    
    if _disposable_domains_cache is not None:
        return _disposable_domains_cache
    
    domains = set()
    
    # Try to load from file
    domains_file = Path(__file__).parent.parent.parent / 'data' / 'disposable_domains.txt'
    
    if domains_file.exists():
        with open(domains_file, 'r') as f:
            for line in f:
                line = line.strip().lower()
                if line and not line.startswith('#'):
                    domains.add(line)
    
    _disposable_domains_cache = domains
    return domains


def check_mx_record(domain: str, timeout: float = 3.0) -> Tuple[bool, str]:
    """
    Check if domain has valid MX records.
    
    Args:
        domain: Domain to check
        timeout: DNS query timeout in seconds
        
    Returns:
        Tuple of (has_mx_record, message)
    """
    try:
        import dns.resolver
        
        resolver = dns.resolver.Resolver()
        resolver.lifetime = timeout
        
        try:
            mx_records = resolver.resolve(domain, 'MX')
            if mx_records:
                return True, f"Valid MX records found: {len(mx_records)}"
        except dns.resolver.NoAnswer:
            # No MX record, try A record as fallback
            try:
                a_records = resolver.resolve(domain, 'A')
                if a_records:
                    return True, "No MX but A record exists"
            except:
                pass
        except dns.resolver.NXDOMAIN:
            return False, f"Domain does not exist: {domain}"
        except dns.resolver.Timeout:
            return True, "DNS timeout - assuming valid"  # Fail open
        except Exception as e:
            return True, f"DNS check inconclusive: {str(e)}"
            
    except ImportError:
        # dnspython not installed, skip MX check
        return True, "MX check skipped (dnspython not installed)"
    
    return False, f"No valid mail records for: {domain}"


def is_disposable_email(email: str) -> Tuple[bool, str]:
    """
    Check if email is from a disposable email provider.
    
    Args:
        email: Email address to check
        
    Returns:
        Tuple of (is_disposable, message)
    """
    if '@' not in email:
        return False, "Invalid email format"
    
    domain = email.split('@')[1].lower()
    disposable_domains = _load_disposable_domains()
    
    if domain in disposable_domains:
        return True, f"Disposable email domain: {domain}"
    
    return False, "Not a known disposable domain"


def is_role_based_email(email: str) -> Tuple[bool, str]:
    """
    Check if email is a role-based address (info@, support@, etc.)
    
    Args:
        email: Email address to check
        
    Returns:
        Tuple of (is_role_based, message)
    """
    if '@' not in email:
        return False, "Invalid email format"
    
    local_part = email.split('@')[0].lower()
    
    for prefix in ROLE_BASED_PREFIXES:
        if local_part == prefix or local_part.startswith(f"{prefix}.") or local_part.startswith(f"{prefix}_"):
            return True, f"Role-based email: {prefix}@"
    
    return False, "Personal email address"


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


def validate_email_advanced(
    email: str,
    check_mx: bool = True,
    check_disposable: bool = True,
    flag_role_based: bool = True
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Comprehensive email validation with multiple checks.
    
    Args:
        email: Email address to validate
        check_mx: Whether to verify MX records (requires dnspython)
        check_disposable: Whether to check for disposable domains
        flag_role_based: Whether to flag role-based emails
        
    Returns:
        Tuple of (is_valid, reason, metadata)
    """
    metadata = {
        'email': email,
        'format_valid': False,
        'mx_valid': None,
        'is_disposable': None,
        'is_role_based': None,
        'warnings': []
    }
    
    # Step 1: Format validation
    is_valid, reason = validate_email(email)
    metadata['format_valid'] = is_valid
    
    if not is_valid:
        return False, reason, metadata
    
    email = email.strip().lower()
    domain = email.split('@')[1]
    
    # Step 2: Disposable email check
    if check_disposable:
        is_disposable, disp_msg = is_disposable_email(email)
        metadata['is_disposable'] = is_disposable
        if is_disposable:
            return False, disp_msg, metadata
    
    # Step 3: MX record check
    if check_mx:
        has_mx, mx_msg = check_mx_record(domain)
        metadata['mx_valid'] = has_mx
        if not has_mx:
            return False, mx_msg, metadata
    
    # Step 4: Role-based check (warning only)
    if flag_role_based:
        is_role, role_msg = is_role_based_email(email)
        metadata['is_role_based'] = is_role
        if is_role:
            metadata['warnings'].append(role_msg)
    
    return True, "Email validation passed", metadata


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


def validate_leads_advanced(
    leads: List[Dict[str, Any]],
    email_field: str = "email",
    check_mx: bool = False,  # Default off for performance
    check_disposable: bool = True,
    flag_role_based: bool = True
) -> Dict[str, Any]:
    """
    Validate leads with comprehensive email checks.
    
    Args:
        leads: List of lead dictionaries
        email_field: Name of the email field
        check_mx: Whether to verify MX records
        check_disposable: Whether to check for disposable domains
        flag_role_based: Whether to flag role-based emails
        
    Returns:
        Dict with categorized leads and detailed metadata
    """
    valid_leads = []
    invalid_leads = []
    role_based_leads = []
    errors = []
    
    for i, lead in enumerate(leads):
        email = lead.get(email_field, "")
        is_valid, reason, metadata = validate_email_advanced(
            email, check_mx, check_disposable, flag_role_based
        )
        
        # Add validation metadata to lead
        lead_with_meta = lead.copy()
        lead_with_meta['_email_validation'] = metadata
        
        if is_valid:
            if metadata.get('is_role_based'):
                role_based_leads.append(lead_with_meta)
            else:
                valid_leads.append(lead_with_meta)
        else:
            invalid_leads.append(lead_with_meta)
            errors.append(f"Lead {i+1} ({email}): {reason}")
    
    return {
        "valid_leads": valid_leads,
        "invalid_leads": invalid_leads,
        "role_based_leads": role_based_leads,
        "valid_count": len(valid_leads),
        "invalid_count": len(invalid_leads),
        "role_based_count": len(role_based_leads),
        "errors": errors
    }

