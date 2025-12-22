"""Test legacy adapter conversions."""
import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.sdk.utils.legacy_adapter import LegacyAdapter


def test_validates_legacy_format():
    """Test that adapter validates correct format."""
    legacy_result = {
        "status": "complete",
        "csv_path": "/tmp/test.csv",
        "steps": [],
    }
    assert LegacyAdapter.validate_legacy_format(legacy_result) is True


def test_validates_incomplete_format():
    """Test that adapter rejects incomplete format."""
    incomplete_result = {
        "status": "complete",
        # Missing csv_path and steps
    }
    assert LegacyAdapter.validate_legacy_format(incomplete_result) is False


def test_sdk_wrapped_result():
    """Test conversion of SDK wrapped result."""
    sdk_wrapped = {
        "mode": "batch",
        "status": "completed",
        "result": {
            "status": "complete",
            "csv_path": "/tmp/test.csv",
            "steps": [],
            "valid_leads": [],
            "invalid_leads": [],
            "validation_errors": [],
            "scored_leads": [],
            "score_stats": {},
            "notion_results": {},
            "report": "",
        }
    }

    result = LegacyAdapter.to_legacy_dict(sdk_wrapped)

    assert result["status"] == "complete"
    assert result["csv_path"] == "/tmp/test.csv"
    assert "steps" in result


def test_already_legacy_format():
    """Test that adapter returns legacy format unchanged."""
    legacy_result = {
        "status": "complete",
        "csv_path": "/tmp/test.csv",
        "steps": [],
        "valid_leads": [],
        "invalid_leads": [],
        "validation_errors": [],
        "scored_leads": [],
        "score_stats": {},
        "notion_results": {},
        "report": "",
    }

    result = LegacyAdapter.to_legacy_dict(legacy_result)

    assert result == legacy_result


def test_error_fallback():
    """Test that adapter provides error fallback for unknown formats."""
    unknown_format = {
        "some_field": "some_value"
    }

    result = LegacyAdapter.to_legacy_dict(unknown_format)

    assert result["status"] == "error"
    assert "error" in result
    assert result["error"] == "SDK result format not recognized"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
