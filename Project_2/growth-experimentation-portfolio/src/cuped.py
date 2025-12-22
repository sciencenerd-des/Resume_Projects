"""
CUPED (Controlled-experiment Using Pre-Experiment Data) Module

Variance reduction technique that uses pre-experiment covariates to reduce
the standard error of treatment effect estimates.

Reference: Deng, A., et al. (2013). "Improving the Sensitivity of Online
Controlled Experiments by Utilizing Pre-Experiment Data"
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Optional, Tuple, List
from scipy import stats


@dataclass
class CUPEDResult:
    """Result of CUPED variance reduction analysis."""
    # Original estimates
    original_lift: float
    original_se: float
    original_ci: Tuple[float, float]

    # CUPED-adjusted estimates
    adjusted_lift: float
    adjusted_se: float
    adjusted_ci: Tuple[float, float]

    # Variance reduction metrics
    variance_reduction_pct: float
    theta: float  # Optimal coefficient
    covariate_correlation: float

    # Statistical tests
    original_p_value: float
    adjusted_p_value: float
    original_significant: bool
    adjusted_significant: bool

    def __repr__(self) -> str:
        return (
            f"CUPEDResult:\n"
            f"  Original: {self.original_lift:+.4f} ± {self.original_se:.4f} "
            f"(p={self.original_p_value:.4f})\n"
            f"  Adjusted: {self.adjusted_lift:+.4f} ± {self.adjusted_se:.4f} "
            f"(p={self.adjusted_p_value:.4f})\n"
            f"  Variance Reduction: {self.variance_reduction_pct:.1%}\n"
            f"  Theta (optimal coef): {self.theta:.4f}\n"
            f"  Covariate Correlation: {self.covariate_correlation:.3f}"
        )


class CUPEDAnalyzer:
    """
    CUPED variance reduction for A/B testing.

    Uses pre-experiment data to reduce the variance of treatment effect
    estimates by "controlling" for pre-existing differences between users.

    The key insight: if pre-experiment behavior is correlated with
    experiment-period behavior, we can use it to explain away noise.
    """

    def __init__(self, alpha: float = 0.05):
        self.alpha = alpha

    def analyze(
        self,
        df: pd.DataFrame,
        outcome_col: str = 'converted',
        covariate_col: str = 'pre_experiment_converted',
        group_col: str = 'group',
        control_label: str = 'A_control',
        variant_label: str = 'B_variant'
    ) -> Optional[CUPEDResult]:
        """
        Perform CUPED analysis to get variance-reduced treatment effect estimate.

        Args:
            df: DataFrame with experiment and pre-experiment data
            outcome_col: Column name for experiment outcome
            covariate_col: Column name for pre-experiment covariate
            group_col: Column name for group assignment
            control_label: Label for control group
            variant_label: Label for variant group

        Returns:
            CUPEDResult with original and adjusted estimates, or None if
            pre-experiment data not available
        """
        # Check if covariate exists
        if covariate_col not in df.columns:
            return None

        # Split by group
        control_mask = df[group_col] == control_label
        variant_mask = df[group_col] == variant_label

        y_control = df.loc[control_mask, outcome_col].values
        y_variant = df.loc[variant_mask, outcome_col].values
        x_control = df.loc[control_mask, covariate_col].values
        x_variant = df.loc[variant_mask, covariate_col].values

        # Pool data for theta calculation
        y = np.concatenate([y_control, y_variant])
        x = np.concatenate([x_control, x_variant])

        # Calculate theta (optimal coefficient)
        # theta = Cov(Y, X) / Var(X)
        cov_yx = np.cov(y, x)[0, 1]
        var_x = np.var(x)

        if var_x == 0:
            return None

        theta = cov_yx / var_x

        # Calculate correlation for reporting
        correlation = np.corrcoef(y, x)[0, 1]

        # Original estimates (unadjusted)
        original_control_mean = y_control.mean()
        original_variant_mean = y_variant.mean()
        original_lift = original_variant_mean - original_control_mean

        n_control = len(y_control)
        n_variant = len(y_variant)

        # Original standard error (pooled)
        pooled_var = (
            (n_control - 1) * y_control.var() + (n_variant - 1) * y_variant.var()
        ) / (n_control + n_variant - 2)
        original_se = np.sqrt(pooled_var * (1/n_control + 1/n_variant))

        # CUPED adjustment
        # Y_adj = Y - theta * (X - mean(X))
        x_mean = x.mean()
        y_control_adj = y_control - theta * (x_control - x_mean)
        y_variant_adj = y_variant - theta * (x_variant - x_mean)

        adjusted_control_mean = y_control_adj.mean()
        adjusted_variant_mean = y_variant_adj.mean()
        adjusted_lift = adjusted_variant_mean - adjusted_control_mean

        # Adjusted standard error
        adjusted_pooled_var = (
            (n_control - 1) * y_control_adj.var() + (n_variant - 1) * y_variant_adj.var()
        ) / (n_control + n_variant - 2)
        adjusted_se = np.sqrt(adjusted_pooled_var * (1/n_control + 1/n_variant))

        # Variance reduction
        if original_se > 0:
            variance_reduction = 1 - (adjusted_se ** 2) / (original_se ** 2)
        else:
            variance_reduction = 0

        # Confidence intervals
        z_crit = stats.norm.ppf(1 - self.alpha / 2)
        original_ci = (
            original_lift - z_crit * original_se,
            original_lift + z_crit * original_se
        )
        adjusted_ci = (
            adjusted_lift - z_crit * adjusted_se,
            adjusted_lift + z_crit * adjusted_se
        )

        # P-values (two-sided z-test)
        if original_se > 0:
            original_z = original_lift / original_se
            original_p = 2 * (1 - stats.norm.cdf(abs(original_z)))
        else:
            original_p = 1.0

        if adjusted_se > 0:
            adjusted_z = adjusted_lift / adjusted_se
            adjusted_p = 2 * (1 - stats.norm.cdf(abs(adjusted_z)))
        else:
            adjusted_p = 1.0

        return CUPEDResult(
            original_lift=original_lift,
            original_se=original_se,
            original_ci=original_ci,
            adjusted_lift=adjusted_lift,
            adjusted_se=adjusted_se,
            adjusted_ci=adjusted_ci,
            variance_reduction_pct=variance_reduction,
            theta=theta,
            covariate_correlation=correlation,
            original_p_value=original_p,
            adjusted_p_value=adjusted_p,
            original_significant=original_p < self.alpha,
            adjusted_significant=adjusted_p < self.alpha
        )

    def analyze_multiple_covariates(
        self,
        df: pd.DataFrame,
        outcome_col: str = 'converted',
        covariate_cols: List[str] = None,
        group_col: str = 'group',
        control_label: str = 'A_control',
        variant_label: str = 'B_variant'
    ) -> Optional[CUPEDResult]:
        """
        CUPED with multiple pre-experiment covariates using regression adjustment.

        Uses OLS to find optimal linear combination of covariates.
        """
        if covariate_cols is None or not covariate_cols:
            return None

        # Filter to available covariates
        available_covs = [c for c in covariate_cols if c in df.columns]
        if not available_covs:
            return None

        # Use single covariate method if only one available
        if len(available_covs) == 1:
            return self.analyze(
                df, outcome_col, available_covs[0], group_col,
                control_label, variant_label
            )

        # Multiple covariate regression
        try:
            import statsmodels.api as sm

            # Prepare data
            y = df[outcome_col].values
            X = df[available_covs].values
            X = sm.add_constant(X)  # Add intercept

            # Fit regression to get residuals
            model = sm.OLS(y, X).fit()
            residuals = model.resid

            # Create adjusted DataFrame
            df_adj = df.copy()
            df_adj['_cuped_adjusted'] = residuals

            # Calculate treatment effect on residuals
            control_mask = df_adj[group_col] == control_label
            variant_mask = df_adj[group_col] == variant_label

            y_control_adj = df_adj.loc[control_mask, '_cuped_adjusted'].values
            y_variant_adj = df_adj.loc[variant_mask, '_cuped_adjusted'].values

            adjusted_lift = y_variant_adj.mean() - y_control_adj.mean()

            n_control = len(y_control_adj)
            n_variant = len(y_variant_adj)

            adjusted_pooled_var = (
                (n_control - 1) * y_control_adj.var() +
                (n_variant - 1) * y_variant_adj.var()
            ) / (n_control + n_variant - 2)
            adjusted_se = np.sqrt(adjusted_pooled_var * (1/n_control + 1/n_variant))

            # Original estimates for comparison
            y_control = df.loc[control_mask, outcome_col].values
            y_variant = df.loc[variant_mask, outcome_col].values
            original_lift = y_variant.mean() - y_control.mean()

            original_pooled_var = (
                (n_control - 1) * y_control.var() +
                (n_variant - 1) * y_variant.var()
            ) / (n_control + n_variant - 2)
            original_se = np.sqrt(original_pooled_var * (1/n_control + 1/n_variant))

            variance_reduction = 1 - (adjusted_se ** 2) / (original_se ** 2)

            z_crit = stats.norm.ppf(1 - self.alpha / 2)
            original_ci = (
                original_lift - z_crit * original_se,
                original_lift + z_crit * original_se
            )
            adjusted_ci = (
                adjusted_lift - z_crit * adjusted_se,
                adjusted_lift + z_crit * adjusted_se
            )

            original_p = 2 * (1 - stats.norm.cdf(abs(original_lift / original_se)))
            adjusted_p = 2 * (1 - stats.norm.cdf(abs(adjusted_lift / adjusted_se)))

            return CUPEDResult(
                original_lift=original_lift,
                original_se=original_se,
                original_ci=original_ci,
                adjusted_lift=adjusted_lift,
                adjusted_se=adjusted_se,
                adjusted_ci=adjusted_ci,
                variance_reduction_pct=variance_reduction,
                theta=model.rsquared,  # R² as proxy for theta with multiple covariates
                covariate_correlation=np.sqrt(model.rsquared),
                original_p_value=original_p,
                adjusted_p_value=adjusted_p,
                original_significant=original_p < self.alpha,
                adjusted_significant=adjusted_p < self.alpha
            )

        except Exception:
            return None


def main():
    """Demo CUPED analysis."""
    print("=" * 60)
    print("CUPED VARIANCE REDUCTION DEMO")
    print("=" * 60)

    # Generate synthetic data with pre-experiment covariate
    np.random.seed(42)
    n_per_group = 5000

    # Pre-experiment behavior (correlated with experiment outcome)
    pre_exp_control = np.random.binomial(1, 0.10, n_per_group)
    pre_exp_variant = np.random.binomial(1, 0.10, n_per_group)

    # Experiment outcomes (correlated with pre-experiment)
    base_rate = 0.08
    treatment_effect = 0.01  # 1 percentage point lift
    correlation = 0.5

    # Generate correlated outcomes
    noise_control = np.random.normal(0, 1, n_per_group)
    noise_variant = np.random.normal(0, 1, n_per_group)

    # Create probability based on pre-experiment + noise
    p_control = base_rate + correlation * 0.05 * (pre_exp_control - 0.1) + 0.02 * noise_control
    p_variant = base_rate + treatment_effect + correlation * 0.05 * (pre_exp_variant - 0.1) + 0.02 * noise_variant

    p_control = np.clip(p_control, 0.01, 0.99)
    p_variant = np.clip(p_variant, 0.01, 0.99)

    exp_control = np.random.binomial(1, p_control)
    exp_variant = np.random.binomial(1, p_variant)

    # Create DataFrame
    df = pd.DataFrame({
        'user_id': range(n_per_group * 2),
        'group': ['A_control'] * n_per_group + ['B_variant'] * n_per_group,
        'converted': np.concatenate([exp_control, exp_variant]),
        'pre_experiment_converted': np.concatenate([pre_exp_control, pre_exp_variant])
    })

    print(f"\nSample size: {len(df):,} ({n_per_group:,} per group)")
    print(f"True treatment effect: {treatment_effect:.2%}")

    # Run CUPED analysis
    analyzer = CUPEDAnalyzer()
    result = analyzer.analyze(df)

    if result:
        print(f"\n{result}")
        print(f"\n✨ CUPED reduced variance by {result.variance_reduction_pct:.1%}")
        if result.adjusted_significant and not result.original_significant:
            print("   → CUPED made the result significant!")
        elif result.adjusted_significant and result.original_significant:
            print("   → Result was already significant, CUPED increased precision")
    else:
        print("CUPED analysis not available (no pre-experiment data)")


if __name__ == '__main__':
    main()
