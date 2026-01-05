"""
Segment Analysis Module for A/B Testing

Provides segment-level statistical analysis with multiple testing corrections:
- Bonferroni correction
- Benjamini-Hochberg FDR
- Holm-Bonferroni step-down
"""

import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.stats.proportion import proportions_ztest
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum


class CorrectionMethod(Enum):
    """Multiple testing correction methods."""
    NONE = "none"
    BONFERRONI = "bonferroni"
    HOLM = "holm"
    FDR = "fdr_bh"  # Benjamini-Hochberg


@dataclass
class InteractionTestResult:
    """Result of Treatment × Segment interaction test."""
    segment_dimension: str
    interaction_significant: bool
    joint_p_value: float
    individual_interactions: Dict[str, float]
    heterogeneity_warning: bool
    model_converged: bool = True

    def __repr__(self) -> str:
        status = "⚠️ HETEROGENEITY DETECTED" if self.heterogeneity_warning else "✓ No significant heterogeneity"
        return (
            f"InteractionTestResult({self.segment_dimension})\n"
            f"  Status: {status}\n"
            f"  Joint p-value: {self.joint_p_value:.4f}\n"
            f"  Significant interaction: {self.interaction_significant}"
        )


@dataclass
class SegmentResult:
    """Result for a single segment analysis."""
    segment_name: str
    segment_value: str
    control_n: int
    variant_n: int
    control_rate: float
    variant_rate: float
    lift_absolute: float
    lift_relative: float
    p_value_raw: float
    p_value_adjusted: float
    significant_raw: bool
    significant_adjusted: bool


@dataclass
class SegmentAnalysisReport:
    """Complete segment analysis report."""
    segment_dimension: str
    correction_method: CorrectionMethod
    alpha: float
    results: List[SegmentResult]
    simpsons_paradox_warning: bool
    overall_lift: float
    interaction_test: Optional[InteractionTestResult] = None

    def __repr__(self) -> str:
        lines = [f"SegmentAnalysisReport(dimension={self.segment_dimension})"]
        lines.append(f"  Correction: {self.correction_method.value}, Alpha: {self.alpha}")
        lines.append(f"  Overall Lift: {self.overall_lift:+.2%}")
        if self.simpsons_paradox_warning:
            lines.append("  ⚠️ WARNING: Possible Simpson's Paradox detected!")
        lines.append("  Results:")
        for r in self.results:
            sig = "✓" if r.significant_adjusted else "✗"
            lines.append(
                f"    {r.segment_value}: {r.lift_relative:+.2%} "
                f"(p_adj={r.p_value_adjusted:.4f}) [{sig}]"
            )
        return "\n".join(lines)


class SegmentAnalyzer:
    """
    Analyzes A/B test results by segment with multiple testing correction.

    Addresses Simpson's Paradox by comparing overall vs segment-level results.
    """

    def __init__(
        self,
        alpha: float = 0.05,
        correction: CorrectionMethod = CorrectionMethod.HOLM
    ):
        self.alpha = alpha
        self.correction = correction

    def _apply_correction(
        self,
        p_values: List[float]
    ) -> List[float]:
        """
        Apply multiple testing correction to p-values.

        Args:
            p_values: List of raw p-values

        Returns:
            List of adjusted p-values
        """
        n = len(p_values)

        if self.correction == CorrectionMethod.NONE:
            return p_values

        elif self.correction == CorrectionMethod.BONFERRONI:
            return [min(p * n, 1.0) for p in p_values]

        elif self.correction == CorrectionMethod.HOLM:
            # Holm-Bonferroni step-down procedure
            indexed = list(enumerate(p_values))
            indexed.sort(key=lambda x: x[1])

            adjusted = [0.0] * n
            cummax = 0.0
            for rank, (orig_idx, p) in enumerate(indexed):
                adj_p = p * (n - rank)
                cummax = max(cummax, adj_p)
                adjusted[orig_idx] = min(cummax, 1.0)
            return adjusted

        elif self.correction == CorrectionMethod.FDR:
            # Benjamini-Hochberg procedure
            indexed = list(enumerate(p_values))
            indexed.sort(key=lambda x: x[1])

            adjusted = [0.0] * n
            cummin = 1.0
            for rank in range(n - 1, -1, -1):
                orig_idx, p = indexed[rank]
                adj_p = p * n / (rank + 1)
                cummin = min(cummin, adj_p)
                adjusted[orig_idx] = min(cummin, 1.0)
            return adjusted

        return p_values

    def analyze_segment(
        self,
        df: pd.DataFrame,
        segment_col: str,
        group_col: str = 'group',
        outcome_col: str = 'converted',
        control_label: str = 'A_control',
        variant_label: str = 'B_variant'
    ) -> SegmentAnalysisReport:
        """
        Analyze A/B test results by segment.

        Args:
            df: DataFrame with experimental data
            segment_col: Column name for segment dimension
            group_col: Column name for group assignment
            outcome_col: Column name for binary outcome
            control_label: Label for control group
            variant_label: Label for variant group

        Returns:
            SegmentAnalysisReport with all segment results
        """
        # Calculate overall lift first
        overall_control = df[df[group_col] == control_label][outcome_col]
        overall_variant = df[df[group_col] == variant_label][outcome_col]
        overall_lift = overall_variant.mean() - overall_control.mean()

        # Analyze each segment
        segment_values = df[segment_col].unique()
        raw_results = []

        for seg_val in segment_values:
            seg_df = df[df[segment_col] == seg_val]

            control = seg_df[seg_df[group_col] == control_label][outcome_col]
            variant = seg_df[seg_df[group_col] == variant_label][outcome_col]

            if len(control) < 10 or len(variant) < 10:
                continue  # Skip segments with insufficient data

            control_rate = control.mean()
            variant_rate = variant.mean()

            lift_abs = variant_rate - control_rate
            lift_rel = lift_abs / control_rate if control_rate > 0 else 0

            # Two-proportion z-test
            count = np.array([variant.sum(), control.sum()])
            nobs = np.array([len(variant), len(control)])
            _, p_value = proportions_ztest(count, nobs, alternative='two-sided')

            raw_results.append({
                'segment_value': seg_val,
                'control_n': len(control),
                'variant_n': len(variant),
                'control_rate': control_rate,
                'variant_rate': variant_rate,
                'lift_absolute': lift_abs,
                'lift_relative': lift_rel,
                'p_value_raw': p_value
            })

        # Apply multiple testing correction
        raw_p_values = [r['p_value_raw'] for r in raw_results]
        adjusted_p_values = self._apply_correction(raw_p_values)

        # Check for Simpson's Paradox
        # (overall effect direction differs from majority of segment effects)
        segment_directions = [r['lift_relative'] > 0 for r in raw_results]
        overall_direction = overall_lift > 0
        paradox_warning = (
            sum(segment_directions) > len(segment_directions) / 2 and not overall_direction
        ) or (
            sum(segment_directions) < len(segment_directions) / 2 and overall_direction
        )

        # Build final results
        final_results = []
        for i, r in enumerate(raw_results):
            final_results.append(SegmentResult(
                segment_name=segment_col,
                segment_value=r['segment_value'],
                control_n=r['control_n'],
                variant_n=r['variant_n'],
                control_rate=r['control_rate'],
                variant_rate=r['variant_rate'],
                lift_absolute=r['lift_absolute'],
                lift_relative=r['lift_relative'],
                p_value_raw=r['p_value_raw'],
                p_value_adjusted=adjusted_p_values[i],
                significant_raw=r['p_value_raw'] < self.alpha,
                significant_adjusted=adjusted_p_values[i] < self.alpha
            ))

        # Perform interaction test
        interaction_result = self.test_interaction(df, segment_col, group_col, outcome_col)

        return SegmentAnalysisReport(
            segment_dimension=segment_col,
            correction_method=self.correction,
            alpha=self.alpha,
            results=final_results,
            simpsons_paradox_warning=paradox_warning,
            overall_lift=overall_lift,
            interaction_test=interaction_result
        )

    def test_interaction(
        self,
        df: pd.DataFrame,
        segment_col: str,
        group_col: str = 'group',
        outcome_col: str = 'converted',
        control_label: str = 'A_control',
        variant_label: str = 'B_variant'
    ) -> InteractionTestResult:
        """
        Test if treatment effect varies significantly across segments.

        Uses logistic regression: outcome ~ treatment + segment + treatment:segment
        A significant interaction term indicates heterogeneous treatment effects
        (i.e., the treatment works differently for different segments).

        Args:
            df: DataFrame with experimental data
            segment_col: Column name for segment dimension
            group_col: Column name for group assignment
            outcome_col: Column name for binary outcome
            control_label: Label for control group
            variant_label: Label for variant group

        Returns:
            InteractionTestResult with heterogeneity assessment
        """
        try:
            import statsmodels.api as sm
            from statsmodels.formula.api import logit

            # Prepare data
            df_model = df.copy()
            df_model['treatment'] = (df_model[group_col] == variant_label).astype(int)

            # Fit logistic regression with interaction
            formula = f"{outcome_col} ~ treatment * C({segment_col})"

            try:
                model = logit(formula, data=df_model).fit(disp=0, maxiter=100)
                converged = model.mle_retvals.get('converged', True)
            except Exception:
                # Model fitting failed - return non-significant result
                return InteractionTestResult(
                    segment_dimension=segment_col,
                    interaction_significant=False,
                    joint_p_value=1.0,
                    individual_interactions={},
                    heterogeneity_warning=False,
                    model_converged=False
                )

            # Extract interaction p-values (terms with ':')
            interaction_terms = [t for t in model.pvalues.index if ':' in t]
            individual_interactions = {
                term: float(model.pvalues[term])
                for term in interaction_terms
            }

            # Joint test for all interaction terms using Fisher's method
            if interaction_terms:
                interaction_pvalues = [model.pvalues[t] for t in interaction_terms]
                # Fisher's combined probability test
                chi2_stat = -2 * sum(np.log(p) for p in interaction_pvalues if p > 0)
                joint_p = 1 - stats.chi2.cdf(chi2_stat, df=2*len(interaction_pvalues))
            else:
                joint_p = 1.0

            return InteractionTestResult(
                segment_dimension=segment_col,
                interaction_significant=joint_p < self.alpha,
                joint_p_value=joint_p,
                individual_interactions=individual_interactions,
                heterogeneity_warning=joint_p < 0.10,  # Warn at 10% level
                model_converged=converged
            )

        except ImportError:
            # statsmodels not available
            return InteractionTestResult(
                segment_dimension=segment_col,
                interaction_significant=False,
                joint_p_value=1.0,
                individual_interactions={},
                heterogeneity_warning=False,
                model_converged=False
            )

    def analyze_all_segments(
        self,
        df: pd.DataFrame,
        segment_cols: List[str] = ['device', 'channel', 'geography'],
        **kwargs
    ) -> Dict[str, SegmentAnalysisReport]:
        """
        Analyze all segment dimensions.

        Returns:
            Dictionary mapping segment column name to its analysis report
        """
        reports = {}
        for col in segment_cols:
            if col in df.columns:
                reports[col] = self.analyze_segment(df, col, **kwargs)
        return reports


def main():
    """Demo segment analysis."""
    from simulator import ABTestSimulator, ExperimentConfig

    print("=" * 60)
    print("SEGMENT ANALYSIS DEMO")
    print("=" * 60)

    # Generate data with segments
    config = ExperimentConfig()
    simulator = ABTestSimulator(config)
    df = simulator.generate_data()

    # Analyze segments
    analyzer = SegmentAnalyzer(correction=CorrectionMethod.HOLM)
    reports = analyzer.analyze_all_segments(df)

    for name, report in reports.items():
        print(f"\n{report}")
        if report.interaction_test:
            print(f"\n  Interaction Test:")
            print(f"    {report.interaction_test}")


if __name__ == '__main__':
    main()
