"""Unit tests for email validation tool."""
import pytest
from src.tools.email_validator import validate_email, validate_leads


class TestValidateEmail:
    """Tests for the validate_email function."""
    
    def test_valid_standard_email(self):
        """Standard email format should be valid."""
        is_valid, reason = validate_email("test@example.com")
        assert is_valid is True
        assert "Valid" in reason
    
    def test_valid_email_with_subdomain(self):
        """Email with subdomain should be valid."""
        is_valid, reason = validate_email("user@mail.example.com")
        assert is_valid is True
    
    def test_valid_email_with_plus(self):
        """Email with plus sign should be valid."""
        is_valid, reason = validate_email("user+tag@example.com")
        assert is_valid is True
    
    def test_valid_email_with_dots(self):
        """Email with dots in local part should be valid."""
        is_valid, reason = validate_email("first.last@example.com")
        assert is_valid is True
    
    def test_invalid_email_no_at_symbol(self):
        """Email without @ symbol should be invalid."""
        is_valid, reason = validate_email("invalid-email")
        assert is_valid is False
        assert "Invalid" in reason
    
    def test_invalid_email_no_domain(self):
        """Email without domain should be invalid."""
        is_valid, reason = validate_email("user@")
        assert is_valid is False
    
    def test_invalid_email_no_tld(self):
        """Email without TLD should be invalid."""
        is_valid, reason = validate_email("user@domain")
        assert is_valid is False
    
    def test_invalid_email_empty(self):
        """Empty email should be invalid."""
        is_valid, reason = validate_email("")
        assert is_valid is False
        assert "empty" in reason.lower()
    
    def test_invalid_email_whitespace_only(self):
        """Whitespace-only email should be invalid."""
        is_valid, reason = validate_email("   ")
        assert is_valid is False
    
    def test_email_normalized_to_lowercase(self):
        """Email validation should handle uppercase."""
        is_valid, _ = validate_email("USER@EXAMPLE.COM")
        assert is_valid is True


class TestValidateLeads:
    """Tests for the validate_leads batch function."""
    
    def test_all_valid_leads(self):
        """All valid emails should pass."""
        leads = [
            {"name": "Alice", "email": "alice@example.com"},
            {"name": "Bob", "email": "bob@example.org"},
        ]
        result = validate_leads(leads)
        assert result["valid_count"] == 2
        assert result["invalid_count"] == 0
        assert len(result["errors"]) == 0
    
    def test_all_invalid_leads(self):
        """All invalid emails should fail."""
        leads = [
            {"name": "Invalid1", "email": "not-an-email"},
            {"name": "Invalid2", "email": ""},
        ]
        result = validate_leads(leads)
        assert result["valid_count"] == 0
        assert result["invalid_count"] == 2
        assert len(result["errors"]) == 2
    
    def test_mixed_leads(self):
        """Mix of valid and invalid should be separated."""
        leads = [
            {"name": "Valid", "email": "valid@example.com"},
            {"name": "Invalid", "email": "invalid"},
        ]
        result = validate_leads(leads)
        assert result["valid_count"] == 1
        assert result["invalid_count"] == 1
    
    def test_custom_email_field(self):
        """Should support custom email field names."""
        leads = [
            {"name": "Alice", "contact_email": "alice@example.com"},
        ]
        result = validate_leads(leads, email_field="contact_email")
        assert result["valid_count"] == 1
    
    def test_empty_leads_list(self):
        """Empty list should return zeros."""
        result = validate_leads([])
        assert result["valid_count"] == 0
        assert result["invalid_count"] == 0
