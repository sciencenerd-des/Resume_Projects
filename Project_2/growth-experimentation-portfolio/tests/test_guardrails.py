"""
Tests for the Guardrail Metrics Module.
"""

import pytest
import numpy as np
import pandas as pd
from src.guardrails import (
    GuardrailChecker,
    GuardrailConfig,
    GuardrailReport,
    GuardrailResult,
    GuardrailStatus,
    Direction
)


class TestGuardrailConfig:
    """Test GuardrailConfig dataclass."""
    
    def test_default_values(self):
        """Test default configuration values."""
        config = GuardrailConfig(
            metric_name="bounce_rate",
            direction=Direction.INCREASE
        )
        assert config.max_degradation_pct == 5.0
        assert config.warning_threshold_pct == 3.0
        assert config.alpha == 0.05
    
    def test_custom_values(self):
        """Test custom configuration values."""
        config = GuardrailConfig(
            metric_name="error_rate",
            direction=Direction.INCREASE,
            max_degradation_pct=2.0,
            warning_threshold_pct=1.0
        )
        assert config.max_degradation_pct == 2.0
        assert config.warning_threshold_pct == 1.0
    
    def test_direction_from_string(self):
        """Test direction conversion from string."""
        config = GuardrailConfig(
            metric_name="retention",
            direction="decrease"
        )
        assert config.direction == Direction.DECREASE


class TestGuardrailChecker:
    """Test GuardrailChecker class."""
    
    @pytest.fixture
    def checker(self):
        """Create checker with custom guardrails."""
        guardrails = [
            GuardrailConfig(
                metric_name="bounce_rate",
                direction=Direction.INCREASE,
                max_degradation_pct=5.0
            ),
            GuardrailConfig(
                metric_name="error_rate",
                direction=Direction.INCREASE,
                max_degradation_pct=1.0
            )
        ]
        return GuardrailChecker(guardrails)
    
    @pytest.fixture
    def passing_data(self):
        """Create data where all guardrails pass."""
        np.random.seed(42)
        n = 500
        
        control_df = pd.DataFrame({
            'bounce_rate': np.random.binomial(1, 0.30, n),
            'error_rate': np.random.binomial(1, 0.02, n)
        })
        
        variant_df = pd.DataFrame({
            'bounce_rate': np.random.binomial(1, 0.30, n),  # Same
            'error_rate': np.random.binomial(1, 0.02, n)    # Same
        })
        
        return control_df, variant_df
    
    @pytest.fixture
    def failing_data(self):
        """Create data where guardrails fail."""
        np.random.seed(42)
        n = 500
        
        control_df = pd.DataFrame({
            'bounce_rate': np.random.binomial(1, 0.30, n),
            'error_rate': np.random.binomial(1, 0.02, n)
        })
        
        variant_df = pd.DataFrame({
            'bounce_rate': np.random.binomial(1, 0.40, n),  # 33% increase
            'error_rate': np.random.binomial(1, 0.05, n)    # 150% increase
        })
        
        return control_df, variant_df
    
    def test_default_guardrails(self):
        """Test default guardrails are created."""
        checker = GuardrailChecker()
        assert len(checker.guardrails) > 0
    
    def test_check_all_returns_report(self, checker, passing_data):
        """Test check_all returns a GuardrailReport."""
        control_df, variant_df = passing_data
        report = checker.check_all(
            control_df, variant_df,
            metric_configs={
                'bounce_rate': {'is_proportion': True},
                'error_rate': {'is_proportion': True}
            }
        )
        assert isinstance(report, GuardrailReport)
    
    def test_passing_guardrails(self, checker, passing_data):
        """Test guardrails pass when metrics are similar."""
        control_df, variant_df = passing_data
        report = checker.check_all(
            control_df, variant_df,
            metric_configs={
                'bounce_rate': {'is_proportion': True},
                'error_rate': {'is_proportion': True}
            }
        )
        assert report.all_passed
    
    def test_failing_guardrails(self, checker, failing_data):
        """Test guardrails fail when metrics degrade significantly."""
        control_df, variant_df = failing_data
        report = checker.check_all(
            control_df, variant_df,
            metric_configs={
                'bounce_rate': {'is_proportion': True},
                'error_rate': {'is_proportion': True}
            }
        )
        assert not report.all_passed
    
    def test_result_contains_metrics(self, checker, passing_data):
        """Test results contain expected metrics."""
        control_df, variant_df = passing_data
        report = checker.check_all(
            control_df, variant_df,
            metric_configs={
                'bounce_rate': {'is_proportion': True},
                'error_rate': {'is_proportion': True}
            }
        )
        
        metric_names = [r.metric_name for r in report.results]
        assert 'bounce_rate' in metric_names
        assert 'error_rate' in metric_names
    
    def test_missing_column_warning(self, checker):
        """Test warning for missing columns."""
        control_df = pd.DataFrame({'other_metric': [1, 2, 3]})
        variant_df = pd.DataFrame({'other_metric': [1, 2, 3]})
        
        report = checker.check_all(control_df, variant_df)
        
        # Should have warnings for missing columns
        has_warning = any(r.status == GuardrailStatus.WARNING for r in report.results)
        assert has_warning


class TestGuardrailResult:
    """Test GuardrailResult dataclass."""
    
    def test_to_dict(self):
        """Test serialization to dictionary."""
        result = GuardrailResult(
            metric_name="bounce_rate",
            status=GuardrailStatus.PASS,
            control_value=0.30,
            variant_value=0.31,
            change_pct=3.33,
            p_value=0.25,
            threshold_pct=5.0,
            message="Bounce rate is within bounds"
        )
        
        result_dict = result.to_dict()
        
        assert result_dict['metric_name'] == 'bounce_rate'
        assert result_dict['status'] == 'pass'
        assert result_dict['change_pct'] == 3.33


class TestGuardrailReport:
    """Test GuardrailReport class."""
    
    def test_empty_report(self):
        """Test empty report defaults."""
        report = GuardrailReport()
        assert report.all_passed
        assert not report.has_warnings
        assert len(report.results) == 0
    
    def test_add_passing_result(self):
        """Test adding passing result."""
        report = GuardrailReport()
        result = GuardrailResult(
            metric_name="test",
            status=GuardrailStatus.PASS,
            control_value=0.1,
            variant_value=0.1,
            change_pct=0.0,
            p_value=0.5,
            threshold_pct=5.0,
            message="OK"
        )
        report.add_result(result)
        
        assert report.all_passed
        assert len(report.results) == 1
    
    def test_add_failing_result(self):
        """Test adding failing result updates all_passed."""
        report = GuardrailReport()
        result = GuardrailResult(
            metric_name="test",
            status=GuardrailStatus.FAIL,
            control_value=0.1,
            variant_value=0.2,
            change_pct=100.0,
            p_value=0.001,
            threshold_pct=5.0,
            message="Failed"
        )
        report.add_result(result)
        
        assert not report.all_passed
    
    def test_add_warning_result(self):
        """Test adding warning result updates has_warnings."""
        report = GuardrailReport()
        result = GuardrailResult(
            metric_name="test",
            status=GuardrailStatus.WARNING,
            control_value=0.1,
            variant_value=0.13,
            change_pct=30.0,
            p_value=0.1,
            threshold_pct=5.0,
            message="Warning"
        )
        report.add_result(result)
        
        assert report.all_passed  # Warnings don't fail
        assert report.has_warnings
    
    def test_to_dict(self):
        """Test report serialization."""
        report = GuardrailReport()
        result_dict = report.to_dict()
        
        assert 'all_passed' in result_dict
        assert 'has_warnings' in result_dict
        assert 'results' in result_dict
    
    def test_repr(self):
        """Test string representation."""
        report = GuardrailReport()
        result = GuardrailResult(
            metric_name="bounce_rate",
            status=GuardrailStatus.PASS,
            control_value=0.30,
            variant_value=0.31,
            change_pct=3.33,
            p_value=0.25,
            threshold_pct=5.0,
            message="OK"
        )
        report.add_result(result)
        
        repr_str = repr(report)
        assert 'bounce_rate' in repr_str
        assert 'PASS' in repr_str


class TestCheckFromSummary:
    """Test check_from_summary method."""
    
    def test_summary_check_pass(self):
        """Test summary check with passing metrics."""
        checker = GuardrailChecker([
            GuardrailConfig(
                metric_name="bounce_rate",
                direction=Direction.INCREASE,
                max_degradation_pct=5.0
            )
        ])
        
        report = checker.check_from_summary(
            control_metrics={'bounce_rate': 0.30},
            variant_metrics={'bounce_rate': 0.31},  # 3.3% increase
            sample_sizes=(1000, 1000)
        )
        
        assert report.all_passed
    
    def test_summary_check_fail(self):
        """Test summary check with failing metrics."""
        checker = GuardrailChecker([
            GuardrailConfig(
                metric_name="bounce_rate",
                direction=Direction.INCREASE,
                max_degradation_pct=5.0
            )
        ])
        
        report = checker.check_from_summary(
            control_metrics={'bounce_rate': 0.30},
            variant_metrics={'bounce_rate': 0.40},  # 33% increase
            sample_sizes=(1000, 1000)
        )
        
        assert not report.all_passed


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
