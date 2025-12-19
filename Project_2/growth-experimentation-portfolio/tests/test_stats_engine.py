"""Tests for the statistical analysis engine."""
import pytest
import pandas as pd
import numpy as np
from src.stats_engine import ABTestAnalyzer, ABTestResult


class TestABTestAnalyzer:
    
    @pytest.fixture
    def sample_data(self):
        """Create sample test data."""
        np.random.seed(42)
        n = 1000
        return pd.DataFrame({
            'user_id': range(n * 2),
            'group': ['A_control'] * n + ['B_variant'] * n,
            'converted': np.concatenate([
                np.random.binomial(1, 0.08, n),
                np.random.binomial(1, 0.10, n)
            ])
        })
    
    def test_analyze_returns_result(self, sample_data):
        """Analyzer should return ABTestResult."""
        analyzer = ABTestAnalyzer()
        result = analyzer.analyze(sample_data)
        
        assert isinstance(result, ABTestResult)
    
    def test_p_value_is_valid(self, sample_data):
        """P-value should be between 0 and 1."""
        analyzer = ABTestAnalyzer()
        result = analyzer.analyze(sample_data)
        
        assert 0 <= result.p_value <= 1
    
    def test_confidence_interval_ordering(self, sample_data):
        """CI lower bound should be less than upper bound."""
        analyzer = ABTestAnalyzer()
        result = analyzer.analyze(sample_data)
        
        assert result.confidence_interval[0] < result.confidence_interval[1]
    
    def test_recommendation_values(self, sample_data):
        """Recommendation should be one of valid options."""
        analyzer = ABTestAnalyzer()
        result = analyzer.analyze(sample_data)
        recommendation = analyzer.generate_recommendation(result)
        
        assert recommendation in ['SHIP', 'ITERATE', 'ROLLBACK']
