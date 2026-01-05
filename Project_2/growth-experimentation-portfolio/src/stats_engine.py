"""
Statistical Analysis Engine for A/B Testing
Provides comprehensive hypothesis testing and result interpretation.
"""

import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.proportion import (
    proportions_ztest, 
    confint_proportions_2indep
)
from dataclasses import dataclass, field
from typing import Tuple, Optional, Dict, Any, List
from enum import Enum


class SRMSeverity(Enum):
    """Severity levels for Sample Ratio Mismatch detection."""
    OK = "ok"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class SRMResult:
    """Result of Sample Ratio Mismatch check."""
    control_n: int
    variant_n: int
    expected_ratio: float
    observed_ratio: float
    chi2_statistic: float
    p_value: float
    srm_detected: bool
    severity: SRMSeverity

    def __repr__(self) -> str:
        status = "⚠️ SRM DETECTED" if self.srm_detected else "✓ No SRM"
        return (
            f"SRMResult({status})\n"
            f"  Expected: {self.expected_ratio:.2%} | Observed: {self.observed_ratio:.2%}\n"
            f"  χ² = {self.chi2_statistic:.2f}, p = {self.p_value:.6f}\n"
            f"  Severity: {self.severity.value.upper()}"
        )


@dataclass
class ABTestResult:
    """Container for A/B test analysis results."""
    # Sample metrics
    control_conversion: float
    variant_conversion: float
    control_sample_size: int
    variant_sample_size: int
    
    # Effect metrics
    absolute_lift: float
    relative_lift: float
    
    # Statistical metrics
    z_statistic: float
    p_value: float
    confidence_interval: Tuple[float, float]
    
    # Decision metrics
    statistically_significant: bool
    confidence_level: float
    power: float

    # Data quality metrics
    srm_result: Optional[SRMResult] = None

    @property
    def srm_detected(self) -> bool:
        """Check if Sample Ratio Mismatch was detected."""
        return self.srm_result.srm_detected if self.srm_result else False

    def __repr__(self) -> str:
        sig = "✓ Significant" if self.statistically_significant else "✗ Not Significant"
        return (
            f"ABTestResult(\n"
            f"  Control: {self.control_conversion:.2%} (n={self.control_sample_size:,})\n"
            f"  Variant: {self.variant_conversion:.2%} (n={self.variant_sample_size:,})\n"
            f"  Lift: {self.relative_lift:+.2%} ({sig})\n"
            f"  P-Value: {self.p_value:.4f}\n"
            f"  95% CI: [{self.confidence_interval[0]:.4f}, {self.confidence_interval[1]:.4f}]\n"
            f")"
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary for serialization."""
        return {
            'control_conversion': self.control_conversion,
            'variant_conversion': self.variant_conversion,
            'control_sample_size': self.control_sample_size,
            'variant_sample_size': self.variant_sample_size,
            'absolute_lift': self.absolute_lift,
            'relative_lift': self.relative_lift,
            'z_statistic': self.z_statistic,
            'p_value': self.p_value,
            'ci_lower': self.confidence_interval[0],
            'ci_upper': self.confidence_interval[1],
            'statistically_significant': self.statistically_significant,
            'confidence_level': self.confidence_level
        }


class ABTestAnalyzer:
    """
    Comprehensive A/B test statistical analyzer.
    
    Performs:
    - Two-proportion Z-test
    - Confidence interval calculation
    - Effect size computation
    - Power analysis
    """
    
    def __init__(self, alpha: float = 0.05):
        """
        Initialize analyzer.
        
        Args:
            alpha: Significance level (default 0.05 for 95% confidence)
        """
        self.alpha = alpha
        self.confidence_level = 1 - alpha
    
    def analyze(
        self, 
        df: pd.DataFrame,
        group_col: str = 'group',
        outcome_col: str = 'converted',
        control_label: str = 'A_control',
        variant_label: str = 'B_variant'
    ) -> ABTestResult:
        """
        Perform complete A/B test analysis.
        
        Args:
            df: DataFrame with experimental data
            group_col: Column name for group assignment
            outcome_col: Column name for binary outcome
            control_label: Label for control group
            variant_label: Label for variant group
        
        Returns:
            ABTestResult with comprehensive analysis
        """
        # Split groups
        control = df[df[group_col] == control_label][outcome_col]
        variant = df[df[group_col] == variant_label][outcome_col]

        # Perform SRM check FIRST (data quality validation)
        srm_result = self.check_srm(
            control_n=len(control),
            variant_n=len(variant)
        )

        # Calculate conversion rates
        control_rate = control.mean()
        variant_rate = variant.mean()
        
        # Calculate lifts
        absolute_lift = variant_rate - control_rate
        relative_lift = absolute_lift / control_rate if control_rate > 0 else 0
        
        # Perform two-proportion z-test
        count = np.array([variant.sum(), control.sum()])
        nobs = np.array([len(variant), len(control)])
        
        z_stat, p_value = proportions_ztest(
            count, nobs, alternative='two-sided'
        )
        
        # Calculate confidence interval for the difference
        ci_low, ci_high = confint_proportions_2indep(
            count1=int(variant.sum()), 
            nobs1=len(variant),
            count2=int(control.sum()), 
            nobs2=len(control),
            method='newcomb',
            alpha=self.alpha
        )
        
        # Calculate achieved power
        from statsmodels.stats.power import NormalIndPower
        effect_size = 2 * (
            np.arcsin(np.sqrt(variant_rate)) - 
            np.arcsin(np.sqrt(control_rate))
        )
        power_analysis = NormalIndPower()
        achieved_power = power_analysis.solve_power(
            effect_size=abs(effect_size),
            nobs1=len(control),
            alpha=self.alpha,
            ratio=len(variant) / len(control),
            alternative='two-sided'
        )
        
        return ABTestResult(
            control_conversion=control_rate,
            variant_conversion=variant_rate,
            control_sample_size=len(control),
            variant_sample_size=len(variant),
            absolute_lift=absolute_lift,
            relative_lift=relative_lift,
            z_statistic=z_stat,
            p_value=p_value,
            confidence_interval=(ci_low, ci_high),
            statistically_significant=p_value < self.alpha,
            confidence_level=self.confidence_level,
            power=achieved_power,
            srm_result=srm_result
        )
    
    def check_srm(
        self,
        control_n: int,
        variant_n: int,
        expected_ratio: float = 0.5,
        threshold: float = 0.001
    ) -> SRMResult:
        """
        Check for Sample Ratio Mismatch using chi-square test.

        SRM indicates randomization failure - a critical data quality issue
        that invalidates the entire experiment. Uses stricter threshold (0.001)
        than effect tests (0.05) because SRM is a fundamental validity check.

        Args:
            control_n: Number of users in control group
            variant_n: Number of users in variant group
            expected_ratio: Expected ratio of control to total (default 0.5 for 50/50 split)
            threshold: P-value threshold for SRM detection (default 0.001)

        Returns:
            SRMResult with detection status and severity
        """
        total = control_n + variant_n
        expected_control = total * expected_ratio
        expected_variant = total * (1 - expected_ratio)

        chi2, p_value = stats.chisquare(
            [control_n, variant_n],
            [expected_control, expected_variant]
        )

        observed_ratio = control_n / total if total > 0 else 0

        # Determine severity based on p-value
        if p_value < 0.0001:
            severity = SRMSeverity.CRITICAL
        elif p_value < threshold:
            severity = SRMSeverity.WARNING
        else:
            severity = SRMSeverity.OK

        return SRMResult(
            control_n=control_n,
            variant_n=variant_n,
            expected_ratio=expected_ratio,
            observed_ratio=observed_ratio,
            chi2_statistic=chi2,
            p_value=p_value,
            srm_detected=p_value < threshold,
            severity=severity
        )

    def chi_square_test(
        self,
        df: pd.DataFrame,
        group_col: str = 'group',
        outcome_col: str = 'converted'
    ) -> Dict[str, Any]:
        """
        Perform chi-square test as alternative analysis.

        Returns:
            Dictionary with chi-square test results
        """
        contingency = pd.crosstab(df[group_col], df[outcome_col])
        chi2, p_value, dof, expected = stats.chi2_contingency(contingency)

        return {
            'chi2_statistic': chi2,
            'p_value': p_value,
            'degrees_of_freedom': dof,
            'expected_frequencies': expected,
            'statistically_significant': p_value < self.alpha
        }
    
    def generate_recommendation(self, result: ABTestResult) -> str:
        """
        Generate a recommendation based on test results.

        Args:
            result: ABTestResult from analysis

        Returns:
            Recommendation string: 'HALT_SRM', 'SHIP', 'ITERATE', or 'ROLLBACK'
        """
        # CRITICAL: Block on SRM - data quality must be valid first
        if result.srm_detected:
            return 'HALT_SRM'

        if not result.statistically_significant:
            return 'ITERATE'

        if result.relative_lift > 0.05:  # More than 5% improvement
            return 'SHIP'
        elif result.relative_lift > 0:
            return 'ITERATE'
        else:
            return 'ROLLBACK'


def main():
    """Demo the statistical analysis engine."""
    from pathlib import Path
    
    # Load simulation data
    project_root = Path(__file__).parent.parent
    data_path = project_root / 'data' / 'processed' / 'simulation_clean.csv'
    
    if not data_path.exists():
        print(f"No simulation data found at {data_path}. Run simulator.py first.")
        return
    
    df = pd.read_csv(data_path)
    
    # Analyze
    analyzer = ABTestAnalyzer(alpha=0.05)
    result = analyzer.analyze(df)
    
    print("=" * 60)
    print("A/B TEST ANALYSIS RESULTS")
    print("=" * 60)
    print(result)
    print()

    # SRM Check - Data Quality Validation
    print("─" * 40)
    print("DATA QUALITY: Sample Ratio Mismatch Check")
    print("─" * 40)
    print(result.srm_result)
    print()

    # Chi-square as secondary test
    chi_result = analyzer.chi_square_test(df)
    print(f"Chi-Square Validation: χ² = {chi_result['chi2_statistic']:.2f}, p = {chi_result['p_value']:.4f}")
    print()

    # Generate recommendation
    recommendation = analyzer.generate_recommendation(result)
    print(f"RECOMMENDATION: {recommendation}")

    if recommendation == 'HALT_SRM':
        print("  ⛔ HALT: Sample Ratio Mismatch detected!")
        print("  → Investigate randomization before analyzing results")
    elif recommendation == 'SHIP':
        print("  → Roll out variant to 100% of users")
    elif recommendation == 'ITERATE':
        print("  → Continue testing or refine hypothesis")
    else:
        print("  → Revert to control, investigate negative impact")


if __name__ == '__main__':
    main()
