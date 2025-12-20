"""
Guardrail Metrics Module for A/B Testing

Provides automated checking of guardrail metrics to ensure
experiments don't negatively impact critical business metrics.

Guardrails are secondary metrics that must not degrade beyond
acceptable thresholds, even if the primary metric improves.
"""

import numpy as np
import pandas as pd
from scipy import stats
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum


class Direction(Enum):
    """Direction constraint for guardrail metrics."""
    INCREASE = "increase"  # Metric should not increase (e.g., bounce rate)
    DECREASE = "decrease"  # Metric should not decrease (e.g., retention)
    EITHER = "either"      # Metric should not change significantly


class GuardrailStatus(Enum):
    """Status of a guardrail check."""
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"


@dataclass
class GuardrailConfig:
    """Configuration for a single guardrail metric."""
    metric_name: str
    direction: Direction
    max_degradation_pct: float = 5.0  # Maximum acceptable degradation in %
    warning_threshold_pct: float = 3.0  # Warning threshold
    alpha: float = 0.05  # Significance level for statistical test
    
    def __post_init__(self):
        if isinstance(self.direction, str):
            self.direction = Direction(self.direction)


@dataclass
class GuardrailResult:
    """Result of a single guardrail check."""
    metric_name: str
    status: GuardrailStatus
    control_value: float
    variant_value: float
    change_pct: float
    p_value: float
    threshold_pct: float
    message: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'metric_name': self.metric_name,
            'status': self.status.value,
            'control_value': self.control_value,
            'variant_value': self.variant_value,
            'change_pct': self.change_pct,
            'p_value': self.p_value,
            'threshold_pct': self.threshold_pct,
            'message': self.message
        }


@dataclass
class GuardrailReport:
    """Complete guardrail check report."""
    results: List[GuardrailResult] = field(default_factory=list)
    all_passed: bool = True
    has_warnings: bool = False
    
    def add_result(self, result: GuardrailResult):
        self.results.append(result)
        if result.status == GuardrailStatus.FAIL:
            self.all_passed = False
        if result.status == GuardrailStatus.WARNING:
            self.has_warnings = True
    
    def __repr__(self) -> str:
        lines = ["GuardrailReport("]
        for r in self.results:
            status_icon = "✅" if r.status == GuardrailStatus.PASS else (
                "⚠️" if r.status == GuardrailStatus.WARNING else "❌"
            )
            lines.append(f"  {status_icon} {r.metric_name}: {r.change_pct:+.2f}% ({r.status.value})")
        lines.append(f"  Overall: {'PASS' if self.all_passed else 'FAIL'}")
        lines.append(")")
        return "\n".join(lines)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'all_passed': self.all_passed,
            'has_warnings': self.has_warnings,
            'results': [r.to_dict() for r in self.results]
        }


class GuardrailChecker:
    """
    Automated guardrail metric checker for A/B tests.
    
    Ensures that while optimizing a primary metric, we don't
    negatively impact other important business metrics.
    
    Common guardrail metrics:
    - Bounce rate (should not increase)
    - Page load time (should not increase)
    - Error rate (should not increase)
    - Revenue per user (should not decrease)
    - Retention rate (should not decrease)
    """
    
    def __init__(self, guardrails: Optional[List[GuardrailConfig]] = None):
        """
        Initialize with a list of guardrail configurations.
        
        Args:
            guardrails: List of GuardrailConfig objects defining metrics to check
        """
        self.guardrails = guardrails or self._default_guardrails()
    
    @staticmethod
    def _default_guardrails() -> List[GuardrailConfig]:
        """Return sensible default guardrails for conversion experiments."""
        return [
            GuardrailConfig(
                metric_name="bounce_rate",
                direction=Direction.INCREASE,
                max_degradation_pct=5.0,
                warning_threshold_pct=3.0
            ),
            GuardrailConfig(
                metric_name="error_rate",
                direction=Direction.INCREASE,
                max_degradation_pct=1.0,
                warning_threshold_pct=0.5
            ),
            GuardrailConfig(
                metric_name="time_to_convert",
                direction=Direction.INCREASE,
                max_degradation_pct=10.0,
                warning_threshold_pct=5.0
            ),
        ]
    
    def _statistical_test(
        self,
        control_values: pd.Series,
        variant_values: pd.Series,
        is_proportion: bool = False
    ) -> Tuple[float, float]:
        """
        Perform appropriate statistical test for the metric.
        
        Args:
            control_values: Values from control group
            variant_values: Values from variant group
            is_proportion: Whether the metric is a proportion (0/1)
        
        Returns:
            Tuple of (test_statistic, p_value)
        """
        if is_proportion:
            # Two-proportion z-test
            from statsmodels.stats.proportion import proportions_ztest
            count = np.array([variant_values.sum(), control_values.sum()])
            nobs = np.array([len(variant_values), len(control_values)])
            stat, p_value = proportions_ztest(count, nobs, alternative='two-sided')
        else:
            # Welch's t-test for continuous metrics
            stat, p_value = stats.ttest_ind(
                variant_values, control_values, equal_var=False
            )
        
        return stat, p_value
    
    def check_metric(
        self,
        control_values: pd.Series,
        variant_values: pd.Series,
        config: GuardrailConfig,
        is_proportion: bool = False
    ) -> GuardrailResult:
        """
        Check a single guardrail metric.
        
        Args:
            control_values: Values from control group
            variant_values: Values from variant group
            config: Guardrail configuration
            is_proportion: Whether the metric is a proportion
        
        Returns:
            GuardrailResult with check outcome
        """
        control_mean = control_values.mean()
        variant_mean = variant_values.mean()
        
        # Calculate percentage change
        if control_mean != 0:
            change_pct = ((variant_mean - control_mean) / abs(control_mean)) * 100
        else:
            change_pct = 0.0 if variant_mean == 0 else float('inf')
        
        # Statistical test
        _, p_value = self._statistical_test(control_values, variant_values, is_proportion)
        
        # Determine status based on direction and thresholds
        is_significant = p_value < config.alpha
        
        if config.direction == Direction.INCREASE:
            # Metric should NOT increase (e.g., bounce rate)
            degraded = change_pct > 0
            change_magnitude = change_pct
        elif config.direction == Direction.DECREASE:
            # Metric should NOT decrease (e.g., retention)
            degraded = change_pct < 0
            change_magnitude = -change_pct
        else:  # EITHER
            degraded = abs(change_pct) > 0
            change_magnitude = abs(change_pct)
        
        # Determine status
        if not is_significant or not degraded:
            status = GuardrailStatus.PASS
            message = f"{config.metric_name} is within acceptable bounds"
        elif change_magnitude > config.max_degradation_pct:
            status = GuardrailStatus.FAIL
            message = f"{config.metric_name} degraded by {change_pct:+.2f}%, exceeds {config.max_degradation_pct}% threshold"
        elif change_magnitude > config.warning_threshold_pct:
            status = GuardrailStatus.WARNING
            message = f"{config.metric_name} changed by {change_pct:+.2f}%, approaching threshold"
        else:
            status = GuardrailStatus.PASS
            message = f"{config.metric_name} change ({change_pct:+.2f}%) is acceptable"
        
        return GuardrailResult(
            metric_name=config.metric_name,
            status=status,
            control_value=control_mean,
            variant_value=variant_mean,
            change_pct=change_pct,
            p_value=p_value,
            threshold_pct=config.max_degradation_pct,
            message=message
        )
    
    def check_all(
        self,
        control_df: pd.DataFrame,
        variant_df: pd.DataFrame,
        metric_configs: Optional[Dict[str, Dict]] = None
    ) -> GuardrailReport:
        """
        Check all configured guardrail metrics.
        
        Args:
            control_df: DataFrame with control group data
            variant_df: DataFrame with variant group data
            metric_configs: Optional dict mapping metric names to {'column': col_name, 'is_proportion': bool}
        
        Returns:
            GuardrailReport with all results
        """
        report = GuardrailReport()
        metric_configs = metric_configs or {}
        
        for guardrail in self.guardrails:
            config = metric_configs.get(guardrail.metric_name, {})
            column = config.get('column', guardrail.metric_name)
            is_proportion = config.get('is_proportion', False)
            
            # Check if column exists in both DataFrames
            if column in control_df.columns and column in variant_df.columns:
                result = self.check_metric(
                    control_df[column],
                    variant_df[column],
                    guardrail,
                    is_proportion
                )
                report.add_result(result)
            else:
                # Column not found, skip with warning
                report.add_result(GuardrailResult(
                    metric_name=guardrail.metric_name,
                    status=GuardrailStatus.WARNING,
                    control_value=0,
                    variant_value=0,
                    change_pct=0,
                    p_value=1.0,
                    threshold_pct=guardrail.max_degradation_pct,
                    message=f"Column '{column}' not found in data"
                ))
        
        return report
    
    def check_from_summary(
        self,
        control_metrics: Dict[str, float],
        variant_metrics: Dict[str, float],
        sample_sizes: Tuple[int, int]
    ) -> GuardrailReport:
        """
        Check guardrails from summary statistics.
        
        Args:
            control_metrics: Dict of metric_name -> control_value
            variant_metrics: Dict of metric_name -> variant_value
            sample_sizes: Tuple of (control_n, variant_n)
        
        Returns:
            GuardrailReport with simplified checks (no statistical tests)
        """
        report = GuardrailReport()
        
        for guardrail in self.guardrails:
            metric_name = guardrail.metric_name
            
            if metric_name in control_metrics and metric_name in variant_metrics:
                control_val = control_metrics[metric_name]
                variant_val = variant_metrics[metric_name]
                
                if control_val != 0:
                    change_pct = ((variant_val - control_val) / abs(control_val)) * 100
                else:
                    change_pct = 0.0
                
                # Simplified check without full statistical test
                if guardrail.direction == Direction.INCREASE:
                    degraded = change_pct > guardrail.max_degradation_pct
                elif guardrail.direction == Direction.DECREASE:
                    degraded = change_pct < -guardrail.max_degradation_pct
                else:
                    degraded = abs(change_pct) > guardrail.max_degradation_pct
                
                status = GuardrailStatus.FAIL if degraded else GuardrailStatus.PASS
                
                report.add_result(GuardrailResult(
                    metric_name=metric_name,
                    status=status,
                    control_value=control_val,
                    variant_value=variant_val,
                    change_pct=change_pct,
                    p_value=-1.0,  # Not calculated
                    threshold_pct=guardrail.max_degradation_pct,
                    message=f"{metric_name}: {change_pct:+.2f}%"
                ))
        
        return report


def main():
    """Demo the guardrail checker."""
    print("=" * 60)
    print("GUARDRAIL METRICS CHECK")
    print("=" * 60)
    
    # Create sample data with some guardrail metrics
    np.random.seed(42)
    n = 1000
    
    # Control group
    control_df = pd.DataFrame({
        'bounce_rate': np.random.binomial(1, 0.30, n),  # 30% bounce
        'error_rate': np.random.binomial(1, 0.02, n),   # 2% errors
        'time_to_convert': np.random.exponential(60, n), # mean 60 seconds
    })
    
    # Variant group - slight degradation in bounce rate
    variant_df = pd.DataFrame({
        'bounce_rate': np.random.binomial(1, 0.32, n),  # 32% bounce (6.7% increase)
        'error_rate': np.random.binomial(1, 0.021, n),  # 2.1% errors (5% increase)
        'time_to_convert': np.random.exponential(62, n), # mean 62 seconds
    })
    
    # Run guardrail checks
    checker = GuardrailChecker()
    report = checker.check_all(
        control_df, 
        variant_df,
        metric_configs={
            'bounce_rate': {'is_proportion': True},
            'error_rate': {'is_proportion': True},
            'time_to_convert': {'is_proportion': False}
        }
    )
    
    print("\n" + str(report))
    
    print("\n" + "-" * 60)
    print("DETAILED RESULTS")
    print("-" * 60)
    
    for result in report.results:
        print(f"\n📊 {result.metric_name}")
        print(f"   Control: {result.control_value:.4f}")
        print(f"   Variant: {result.variant_value:.4f}")
        print(f"   Change: {result.change_pct:+.2f}%")
        print(f"   P-value: {result.p_value:.4f}")
        print(f"   {result.message}")
    
    print("\n" + "=" * 60)
    if report.all_passed:
        print("✅ ALL GUARDRAILS PASSED - Safe to proceed")
    else:
        print("❌ GUARDRAIL VIOLATION - Review before proceeding")
    print("=" * 60)


if __name__ == '__main__':
    main()
