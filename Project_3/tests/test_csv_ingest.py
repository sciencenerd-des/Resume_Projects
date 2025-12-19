"""Unit tests for CSV ingestion tool."""
import pytest
import tempfile
import os
from pathlib import Path
from src.tools.csv_ingest import ingest_csv, get_csv_summary


class TestIngestCSV:
    """Tests for the ingest_csv function."""
    
    def test_valid_csv_file(self, tmp_path):
        """Valid CSV should be parsed correctly."""
        csv_content = "name,email,company\nAlice,alice@test.com,TechCo\nBob,bob@test.com,StartUp"
        csv_file = tmp_path / "leads.csv"
        csv_file.write_text(csv_content)
        
        leads = ingest_csv(str(csv_file))
        
        assert len(leads) == 2
        assert leads[0]["name"] == "Alice"
        assert leads[0]["email"] == "alice@test.com"
        assert leads[1]["name"] == "Bob"
    
    def test_csv_with_extra_whitespace(self, tmp_path):
        """Whitespace in values should be trimmed."""
        csv_content = "name,email\n  Alice  ,  alice@test.com  "
        csv_file = tmp_path / "leads.csv"
        csv_file.write_text(csv_content)
        
        leads = ingest_csv(str(csv_file))
        
        assert leads[0]["name"] == "Alice"
        assert leads[0]["email"] == "alice@test.com"
    
    def test_file_not_found(self):
        """Missing file should raise FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            ingest_csv("/nonexistent/path/leads.csv")
    
    def test_non_csv_extension(self, tmp_path):
        """Non-CSV file should raise ValueError."""
        txt_file = tmp_path / "leads.txt"
        txt_file.write_text("name,email\nAlice,alice@test.com")
        
        with pytest.raises(ValueError) as excinfo:
            ingest_csv(str(txt_file))
        assert ".csv" in str(excinfo.value)
    
    def test_empty_csv_no_data(self, tmp_path):
        """CSV with headers but no data should raise ValueError."""
        csv_file = tmp_path / "empty.csv"
        csv_file.write_text("name,email,company\n")
        
        with pytest.raises(ValueError) as excinfo:
            ingest_csv(str(csv_file))
        assert "empty" in str(excinfo.value).lower()
    
    def test_csv_with_empty_headers(self, tmp_path):
        """CSV without headers should raise ValueError."""
        csv_file = tmp_path / "noheader.csv"
        csv_file.write_text("")
        
        with pytest.raises(ValueError):
            ingest_csv(str(csv_file))


class TestGetCSVSummary:
    """Tests for the get_csv_summary function."""
    
    def test_summary_with_leads(self):
        """Summary should return correct stats."""
        leads = [
            {"name": "Alice", "email": "alice@test.com"},
            {"name": "Bob", "email": "bob@test.com"},
        ]
        
        summary = get_csv_summary(leads)
        
        assert summary["count"] == 2
        assert "name" in summary["fields"]
        assert "email" in summary["fields"]
        assert summary["sample"] == leads[0]
    
    def test_summary_empty_list(self):
        """Empty list should return zero count."""
        summary = get_csv_summary([])
        
        assert summary["count"] == 0
        assert summary["fields"] == []
