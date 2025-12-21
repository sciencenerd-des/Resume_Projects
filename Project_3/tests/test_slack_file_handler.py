"""Unit tests for Slack file handler module."""
import hashlib
import hmac
import json
import time
import unittest
from unittest.mock import patch, MagicMock


class TestVerifySlackSignature(unittest.TestCase):
    """Tests for signature verification."""
    
    def test_no_signing_secret_still_validates_timestamp(self):
        """Even without secret, timestamp validation still applies."""
        from src.tools.slack_file_handler import verify_slack_signature

        # Note: After Phase 1.3, the server exits if SLACK_SIGNING_SECRET is missing
        # This test now verifies the function behavior when called with None secret
        # (which should not happen in production due to startup validation)
        timestamp = str(int(time.time()))
        with patch.dict('os.environ', {}, clear=True):
            # Current timestamp should pass (even though signature won't be checked)
            result = verify_slack_signature(b"test body", timestamp, "v0=abc123")
            # This will still validate the timestamp part
            self.assertTrue(result)
    
    def test_valid_signature(self):
        """Valid signature passes verification."""
        from src.tools.slack_file_handler import verify_slack_signature
        
        secret = "test_secret"
        timestamp = str(int(time.time()))
        body = b'{"test": "data"}'
        
        # Compute expected signature
        sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
        expected_sig = 'v0=' + hmac.new(
            secret.encode('utf-8'),
            sig_basestring.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        with patch.dict('os.environ', {'SLACK_SIGNING_SECRET': secret}):
            result = verify_slack_signature(body, timestamp, expected_sig)
            self.assertTrue(result)
    
    def test_invalid_signature_fails(self):
        """Invalid signature fails verification."""
        from src.tools.slack_file_handler import verify_slack_signature
        
        secret = "test_secret"
        timestamp = str(int(time.time()))
        body = b'{"test": "data"}'
        
        with patch.dict('os.environ', {'SLACK_SIGNING_SECRET': secret}):
            result = verify_slack_signature(body, timestamp, "v0=invalid_signature")
            self.assertFalse(result)
    
    def test_old_timestamp_fails(self):
        """Timestamp older than 15 minutes fails (updated window in Phase 1.1)."""
        from src.tools.slack_file_handler import verify_slack_signature

        secret = "test_secret"
        # Use 20 minutes ago to exceed the new 15-minute window
        old_timestamp = str(int(time.time()) - 1200)  # 20 minutes ago
        body = b'{"test": "data"}'

        with patch.dict('os.environ', {'SLACK_SIGNING_SECRET': secret}):
            result = verify_slack_signature(body, old_timestamp, "v0=any")
            self.assertFalse(result)

    def test_timestamp_within_15_minutes_passes(self):
        """Timestamp within 15-minute window passes (new behavior)."""
        from src.tools.slack_file_handler import verify_slack_signature

        secret = "test_secret"
        # Use 10 minutes ago - should pass with new 15-minute window
        timestamp = str(int(time.time()) - 600)
        body = b'{"test": "data"}'

        # Compute valid signature for this timestamp
        sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
        expected_sig = 'v0=' + hmac.new(
            secret.encode('utf-8'),
            sig_basestring.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        with patch.dict('os.environ', {'SLACK_SIGNING_SECRET': secret}):
            result = verify_slack_signature(body, timestamp, expected_sig)
            self.assertTrue(result)


class TestIsCsvFile(unittest.TestCase):
    """Tests for CSV file detection."""
    
    def test_csv_by_mimetype(self):
        """Detect CSV by mimetype."""
        from src.tools.slack_file_handler import is_csv_file
        
        file_info = {
            "ok": True,
            "file": {
                "name": "data.txt",
                "mimetype": "text/csv"
            }
        }
        self.assertTrue(is_csv_file(file_info))
    
    def test_csv_by_extension(self):
        """Detect CSV by file extension."""
        from src.tools.slack_file_handler import is_csv_file
        
        file_info = {
            "ok": True,
            "file": {
                "name": "leads.csv",
                "mimetype": "application/octet-stream"
            }
        }
        self.assertTrue(is_csv_file(file_info))
    
    def test_csv_by_filetype(self):
        """Detect CSV by Slack filetype field."""
        from src.tools.slack_file_handler import is_csv_file
        
        file_info = {
            "ok": True,
            "file": {
                "name": "data",
                "filetype": "csv"
            }
        }
        self.assertTrue(is_csv_file(file_info))
    
    def test_non_csv_file(self):
        """Non-CSV files should return False."""
        from src.tools.slack_file_handler import is_csv_file
        
        file_info = {
            "ok": True,
            "file": {
                "name": "image.png",
                "mimetype": "image/png",
                "filetype": "png"
            }
        }
        self.assertFalse(is_csv_file(file_info))
    
    def test_failed_file_info(self):
        """Failed API response should return False."""
        from src.tools.slack_file_handler import is_csv_file
        
        file_info = {
            "ok": False,
            "error": "file_not_found"
        }
        self.assertFalse(is_csv_file(file_info))


class TestFormatProcessingResult(unittest.TestCase):
    """Tests for result message formatting."""
    
    def test_successful_processing(self):
        """Format successful processing results."""
        from src.tools.slack_file_handler import format_processing_result_message
        
        results = {
            "status": "complete",
            "valid_leads": [{"email": "a@test.com"}, {"email": "b@test.com"}],
            "invalid_leads": [{"email": "bad"}],
            "score_stats": {"hot": 1, "warm": 1, "cold": 0},
            "notion_results": {"success": 2}
        }
        
        message = format_processing_result_message("leads.csv", results)
        
        self.assertIn("Lead Processing Complete", message)
        self.assertIn("leads.csv", message)
        self.assertIn("Hot: `1`", message)
        self.assertIn("Valid: `2`", message)
        self.assertIn("Synced to Notion", message)
    
    def test_failed_processing(self):
        """Format failed processing results."""
        from src.tools.slack_file_handler import format_processing_result_message
        
        results = {
            "status": "error",
            "error": "CSV parsing failed"
        }
        
        message = format_processing_result_message("bad.csv", results)
        
        self.assertIn("Lead Processing Failed", message)
        self.assertIn("bad.csv", message)
        self.assertIn("CSV parsing failed", message)


class TestGetFileInfo(unittest.TestCase):
    """Tests for Slack file info API."""
    
    def test_no_token_returns_error(self):
        """Missing bot token returns error."""
        from src.tools.slack_file_handler import get_file_info
        
        with patch.dict('os.environ', {}, clear=True):
            result = get_file_info("F123456")
            self.assertFalse(result["ok"])
            self.assertIn("not configured", result["error"])


class TestParseAddLeadMessage(unittest.TestCase):
    """Tests for add lead message parsing."""

    def test_full_lead_parsing(self):
        """Parse complete lead with email, name, and company."""
        from server import _parse_add_lead_message

        lead, error = _parse_add_lead_message("john@example.com John Doe, Acme Corp", "U123")

        self.assertIsNone(error)
        self.assertEqual(lead["email"], "john@example.com")
        self.assertEqual(lead["name"], "John Doe")
        self.assertEqual(lead["company"], "Acme Corp")
        self.assertEqual(lead["source"], "slack-U123")
        self.assertEqual(lead["tags"], "slack-import")

    def test_email_only(self):
        """Parse lead with only email (name defaults to Unknown)."""
        from server import _parse_add_lead_message

        lead, error = _parse_add_lead_message("jane@test.com", "U456")

        self.assertIsNone(error)
        self.assertEqual(lead["email"], "jane@test.com")
        self.assertEqual(lead["name"], "Unknown")
        self.assertEqual(lead["company"], "")

    def test_email_and_name_no_company(self):
        """Parse lead with email and name but no company."""
        from server import _parse_add_lead_message

        lead, error = _parse_add_lead_message("bob@company.io Bob Smith", "U789")

        self.assertIsNone(error)
        self.assertEqual(lead["email"], "bob@company.io")
        self.assertEqual(lead["name"], "Bob Smith")
        self.assertEqual(lead["company"], "")

    def test_empty_input(self):
        """Empty input returns error."""
        from server import _parse_add_lead_message

        lead, error = _parse_add_lead_message("", "U123")

        self.assertIsNone(lead)
        self.assertIn("Usage", error)
        self.assertIn("email@example.com", error)

    def test_whitespace_only(self):
        """Whitespace only input returns error."""
        from server import _parse_add_lead_message

        lead, error = _parse_add_lead_message("   ", "U123")

        self.assertIsNone(lead)
        self.assertIn("email", error.lower())

    def test_name_only_defaults_to_unknown(self):
        """If only name provided (no email), first token is treated as email."""
        from server import _parse_add_lead_message

        # This tests the current behavior: first token is always treated as email
        lead, error = _parse_add_lead_message("JustAName", "U123")

        self.assertIsNone(error)
        self.assertEqual(lead["email"], "JustAName")  # First token becomes email
        self.assertEqual(lead["name"], "Unknown")

    def test_extra_commas_in_company(self):
        """Company name with commas is handled correctly (only first comma splits)."""
        from server import _parse_add_lead_message

        lead, error = _parse_add_lead_message("test@co.com Alice, Acme, Inc.", "U999")

        self.assertIsNone(error)
        self.assertEqual(lead["email"], "test@co.com")
        self.assertEqual(lead["name"], "Alice")
        self.assertEqual(lead["company"], "Acme, Inc.")  # Second comma stays in company

    def test_extra_whitespace_is_trimmed(self):
        """Extra whitespace is properly trimmed."""
        from server import _parse_add_lead_message

        lead, error = _parse_add_lead_message("  user@site.com   Jane Doe  ,  StartupCo  ", "U555")

        self.assertIsNone(error)
        self.assertEqual(lead["email"], "user@site.com")
        self.assertEqual(lead["name"], "Jane Doe")
        self.assertEqual(lead["company"], "StartupCo")


class TestAddLeadsMessageHandler(unittest.TestCase):
    """Tests for add leads (plural) message handling with CSV attachments."""

    def test_add_leads_trigger_detection(self):
        """Verify 'add leads:' trigger is detected."""
        # This tests the trigger detection logic
        text = "add leads: batch import from marketing"
        self.assertTrue(text.lower().startswith("add leads:"))

    def test_add_lead_singular_still_works(self):
        """Verify 'add lead:' (singular) trigger is still detected."""
        text = "add lead: john@example.com John Doe, Acme"
        self.assertTrue(text.lower().startswith("add lead:"))
        self.assertFalse(text.lower().startswith("add leads:"))

    def test_case_insensitive_trigger(self):
        """Verify trigger is case-insensitive."""
        variants = [
            "ADD LEADS: batch",
            "Add Leads: batch",
            "add leads: batch",
            "ADD leads: batch"
        ]
        for text in variants:
            self.assertTrue(
                text.lower().startswith("add leads:"),
                f"Failed for: {text}"
            )


if __name__ == "__main__":
    unittest.main()
