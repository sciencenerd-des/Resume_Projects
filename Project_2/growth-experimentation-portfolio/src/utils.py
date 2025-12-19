"""
Utility functions for the experimentation portfolio.
Provides common data loading, formatting, and validation helpers.
"""

import pandas as pd
import numpy as np
from typing import Tuple, Optional
from pathlib import Path


def load_campaign_data(filepath: str, delimiter: str = ';') -> pd.DataFrame:
    """
    Load campaign data from CSV file.
    
    Args:
        filepath: Path to the CSV file
        delimiter: CSV delimiter (default semicolon for European format)
    
    Returns:
        DataFrame with parsed data
    """
    df = pd.read_csv(filepath, delimiter=delimiter)
    
    # Parse European date format (1.08.2019)
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'], format='%d.%m.%Y')
    
    # Clean column names (remove # and special chars)
    df.columns = df.columns.str.replace('# of ', '', regex=False)
    df.columns = df.columns.str.replace(' ', '_')
    df.columns = df.columns.str.replace('[USD]', 'USD', regex=False)
    
    return df


def format_percent(value: float, decimals: int = 2) -> str:
    """Format a decimal as a percentage string."""
    return f"{value * 100:.{decimals}f}%"


def format_currency(value: float, symbol: str = '$') -> str:
    """Format a number as currency."""
    return f"{symbol}{value:,.2f}"


def validate_ab_data(df: pd.DataFrame) -> bool:
    """
    Validate that DataFrame contains required A/B test columns.
    
    Args:
        df: DataFrame to validate
    
    Returns:
        True if valid, raises ValueError otherwise
    """
    required_cols = ['group', 'converted']
    missing = [col for col in required_cols if col not in df.columns]
    
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    
    if df['group'].nunique() != 2:
        raise ValueError("DataFrame must contain exactly 2 groups")
    
    return True


def calculate_sample_stats(series: pd.Series) -> dict:
    """Calculate summary statistics for a series."""
    return {
        'mean': series.mean(),
        'std': series.std(),
        'median': series.median(),
        'min': series.min(),
        'max': series.max(),
        'count': len(series)
    }
