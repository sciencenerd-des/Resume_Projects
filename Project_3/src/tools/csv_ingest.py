"""CSV Ingestion Tool for Lead Processing Agent.

Reads lead data from CSV files and returns structured data.
"""
import csv
from pathlib import Path
from typing import List, Dict, Any


def ingest_csv(file_path: str) -> List[Dict[str, Any]]:
    """
    Read a CSV file and return leads as a list of dictionaries.
    
    Args:
        file_path: Path to the CSV file containing leads
        
    Returns:
        List of lead dictionaries with keys from CSV headers
        
    Raises:
        FileNotFoundError: If the CSV file doesn't exist
        ValueError: If the CSV file is empty or malformed
    """
    path = Path(file_path)
    
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {file_path}")
    
    if not path.suffix.lower() == '.csv':
        raise ValueError(f"Expected .csv file, got: {path.suffix}")
    
    leads = []
    
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Validate headers exist
        if reader.fieldnames is None:
            raise ValueError("CSV file has no headers")
        
        for row in reader:
            # Clean up whitespace in values
            cleaned_row = {k: v.strip() if isinstance(v, str) else v 
                          for k, v in row.items()}
            leads.append(cleaned_row)
    
    if not leads:
        raise ValueError("CSV file is empty (no data rows)")
    
    return leads


def get_csv_summary(leads: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Get a summary of the ingested leads data.
    
    Args:
        leads: List of lead dictionaries
        
    Returns:
        Summary dict with count and field info
    """
    if not leads:
        return {"count": 0, "fields": []}
    
    return {
        "count": len(leads),
        "fields": list(leads[0].keys()),
        "sample": leads[0] if leads else None
    }
