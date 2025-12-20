"""
Tests for the Bayesian A/B Testing Engine.
"""

import pytest
import numpy as np
import pandas as pd
from src.bayesian_engine import BayesianAnalyzer, BayesianResult


class TestBayesianAnalyzer:
    """Test suite for BayesianAnalyzer class."""
    
    @pytest.fixture
    def sample_data(self):
        """Generate sample A/B test data."""
        np.random.seed(42)
        n = 1000
        
        control_conversions = np.random.binomial(1, 0.08, n)
        variant_conversions = np.random.binomial(1, 0.092, n)
        
        df = pd.DataFrame({
            'user_id': range(n * 2),
            'group': ['A_control'] * n + ['B_variant'] * n,
            'converted': np.concatenate([control_conversions, variant_conversions])
        })
        return df
    
    @pytest.fixture
    def analyzer(self):
        """Create default analyzer instance."""
        return BayesianAnalyzer()
    
    def test_initialization(self, analyzer):
        """Test analyzer initializes with correct defaults."""
        assert analyzer.prior_alpha == 1.0
        assert analyzer.prior_beta == 1.0
        assert analyzer.n_simulations == 100000
    
    def test_initialization_custom_prior(self):
        """Test analyzer with custom prior."""
        analyzer = BayesianAnalyzer(prior_alpha=2.0, prior_beta=10.0)
        assert analyzer.prior_alpha == 2.0
        assert analyzer.prior_beta == 10.0
    
    def test_analyze_returns_result(self, analyzer, sample_data):
        """Test that analyze returns a BayesianResult."""
        result = analyzer.analyze(sample_data)
        assert isinstance(result, BayesianResult)
    
    def test_analyze_sample_sizes(self, analyzer, sample_data):
        """Test that sample sizes are correctly extracted."""
        result = analyzer.analyze(sample_data)
        assert result.control_sample_size == 1000
        assert result.variant_sample_size == 1000
    
    def test_analyze_conversion_rates(self, analyzer, sample_data):
        """Test that conversion rates are reasonable."""
        result = analyzer.analyze(sample_data)
        # Should be close to 0.08 and 0.092 but with sampling variance
        assert 0.05 < result.control_conversion < 0.12
        assert 0.05 < result.variant_conversion < 0.15
    
    def test_probability_variant_better_range(self, analyzer, sample_data):
        """Test probability is in valid range [0, 1]."""
        result = analyzer.analyze(sample_data)
        assert 0.0 <= result.probability_variant_better <= 1.0
    
    def test_probability_variant_better_with_clear_winner(self, analyzer):
        """Test probability with very clear winner."""
        # Create data where variant is clearly better
        n = 1000
        df = pd.DataFrame({
            'group': ['A_control'] * n + ['B_variant'] * n,
            'converted': [0] * n + [1] * (n // 2) + [0] * (n // 2)  # 0% vs 50%
        })
        result = analyzer.analyze(df)
        assert result.probability_variant_better > 0.99
    
    def test_credible_interval_range(self, analyzer, sample_data):
        """Test credible interval is valid."""
        result = analyzer.analyze(sample_data)
        ci_low, ci_high = result.credible_interval
        
        # Lower bound should be less than upper bound
        assert ci_low < ci_high
        
        # Bounds should be reasonable (between -1 and 1 for conversion rate difference)
        assert -1.0 <= ci_low <= 1.0
        assert -1.0 <= ci_high <= 1.0
    
    def test_expected_loss_non_negative(self, analyzer, sample_data):
        """Test expected losses are non-negative."""
        result = analyzer.analyze(sample_data)
        assert result.expected_loss_choosing_variant >= 0
        assert result.expected_loss_choosing_control >= 0
    
    def test_posterior_parameters_positive(self, analyzer, sample_data):
        """Test posterior parameters are positive."""
        result = analyzer.analyze(sample_data)
        
        assert result.control_posterior[0] > 0
        assert result.control_posterior[1] > 0
        assert result.variant_posterior[0] > 0
        assert result.variant_posterior[1] > 0
    
    def test_to_dict(self, analyzer, sample_data):
        """Test result serialization to dict."""
        result = analyzer.analyze(sample_data)
        result_dict = result.to_dict()
        
        assert isinstance(result_dict, dict)
        assert 'probability_variant_better' in result_dict
        assert 'expected_lift' in result_dict
        assert 'credible_interval_lower' in result_dict
    
    def test_recommendation_ship(self, analyzer):
        """Test SHIP recommendation with high probability."""
        result = BayesianResult(
            control_posterior=(10, 90),
            variant_posterior=(20, 80),
            control_conversion=0.10,
            variant_conversion=0.20,
            control_sample_size=100,
            variant_sample_size=100,
            probability_variant_better=0.97,
            credible_interval=(0.05, 0.15),
            expected_lift=0.10,
            expected_loss_choosing_variant=0.001,
            expected_loss_choosing_control=0.05
        )
        assert result.get_recommendation() == 'SHIP'
    
    def test_recommendation_continue(self, analyzer):
        """Test CONTINUE_TESTING recommendation with uncertain results."""
        result = BayesianResult(
            control_posterior=(10, 90),
            variant_posterior=(11, 89),
            control_conversion=0.10,
            variant_conversion=0.11,
            control_sample_size=100,
            variant_sample_size=100,
            probability_variant_better=0.55,
            credible_interval=(-0.02, 0.04),
            expected_lift=0.01,
            expected_loss_choosing_variant=0.01,
            expected_loss_choosing_control=0.01
        )
        assert result.get_recommendation() == 'CONTINUE_TESTING'
    
    def test_recommendation_rollback(self, analyzer):
        """Test ROLLBACK recommendation with low probability."""
        result = BayesianResult(
            control_posterior=(20, 80),
            variant_posterior=(10, 90),
            control_conversion=0.20,
            variant_conversion=0.10,
            control_sample_size=100,
            variant_sample_size=100,
            probability_variant_better=0.02,
            credible_interval=(-0.15, -0.05),
            expected_lift=-0.10,
            expected_loss_choosing_variant=0.05,
            expected_loss_choosing_control=0.001
        )
        assert result.get_recommendation() == 'ROLLBACK'
    
    def test_analyze_from_counts(self, analyzer):
        """Test analysis from aggregate counts."""
        result = analyzer.analyze_from_counts(
            control_successes=80,
            control_trials=1000,
            variant_successes=95,
            variant_trials=1000
        )
        
        assert result.control_sample_size == 1000
        assert result.variant_sample_size == 1000
        assert result.control_conversion == 0.08
        assert result.variant_conversion == 0.095


class TestBayesianResultRepr:
    """Test string representation of results."""
    
    def test_repr_contains_key_info(self):
        """Test __repr__ contains key information."""
        result = BayesianResult(
            control_posterior=(10, 90),
            variant_posterior=(15, 85),
            control_conversion=0.10,
            variant_conversion=0.15,
            control_sample_size=100,
            variant_sample_size=100,
            probability_variant_better=0.85,
            credible_interval=(0.01, 0.09),
            expected_lift=0.05,
            expected_loss_choosing_variant=0.01,
            expected_loss_choosing_control=0.02
        )
        
        repr_str = repr(result)
        assert 'Control' in repr_str
        assert 'Variant' in repr_str
        assert '85.0%' in repr_str  # Probability


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
