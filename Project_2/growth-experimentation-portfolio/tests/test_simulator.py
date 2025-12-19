"""Tests for the A/B test simulator."""
import pytest
import pandas as pd
import numpy as np
from src.simulator import ABTestSimulator, ExperimentConfig


class TestABTestSimulator:
    
    def test_sample_size_calculation(self):
        """Sample size should be reasonable for given parameters."""
        simulator = ABTestSimulator()
        # For 8% baseline and 15% lift, sample size is roughly 8k-9k per variant
        assert 3000 < simulator.sample_size < 15000
    
    def test_generate_data_has_correct_columns(self):
        """Generated data should have required columns."""
        simulator = ABTestSimulator()
        df = simulator.generate_data(n_per_variant=100)
        
        assert 'user_id' in df.columns
        assert 'group' in df.columns
        assert 'converted' in df.columns
    
    def test_generate_data_has_two_groups(self):
        """Generated data should have exactly two groups."""
        simulator = ABTestSimulator()
        df = simulator.generate_data(n_per_variant=100)
        
        assert df['group'].nunique() == 2
        assert set(df['group'].unique()) == {'A_control', 'B_variant'}
    
    def test_conversion_rates_approximate_config(self):
        """Conversion rates should approximate configured values."""
        config = ExperimentConfig(
            baseline_conversion=0.10,
            relative_lift=0.20,
            random_seed=42
        )
        simulator = ABTestSimulator(config)
        df = simulator.generate_data(n_per_variant=10000)
        
        control_rate = df[df['group'] == 'A_control']['converted'].mean()
        variant_rate = df[df['group'] == 'B_variant']['converted'].mean()
        
        # Allow 2% absolute tolerance
        assert abs(control_rate - 0.10) < 0.02
        assert abs(variant_rate - 0.12) < 0.02
