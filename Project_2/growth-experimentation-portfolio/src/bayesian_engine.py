"""
Bayesian Statistical Analysis Engine for A/B Testing

Provides Bayesian inference for conversion rate experiments:
- Beta distribution posterior calculation
- Probability to Beat Control (PTBC) metric
- Credible intervals (95%)
- Monte Carlo simulation for probability estimation
- Expected loss calculation
"""

import numpy as np
import pandas as pd
from scipy import stats
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List


@dataclass
class BayesianResult:
    """Container for Bayesian A/B test analysis results."""
    # Posterior parameters
    control_posterior: Tuple[float, float]  # (alpha, beta)
    variant_posterior: Tuple[float, float]  # (alpha, beta)
    
    # Sample metrics
    control_conversion: float
    variant_conversion: float
    control_sample_size: int
    variant_sample_size: int
    
    # Bayesian metrics
    probability_variant_better: float
    credible_interval: Tuple[float, float]  # 95% CI for lift
    expected_lift: float
    expected_loss_choosing_variant: float
    expected_loss_choosing_control: float
    
    def __repr__(self) -> str:
        prob_pct = self.probability_variant_better * 100
        return (
            f"BayesianResult(\n"
            f"  Control: {self.control_conversion:.2%} (n={self.control_sample_size:,})\n"
            f"  Variant: {self.variant_conversion:.2%} (n={self.variant_sample_size:,})\n"
            f"  P(Variant > Control): {prob_pct:.1f}%\n"
            f"  Expected Lift: {self.expected_lift:+.2%}\n"
            f"  95% Credible Interval: [{self.credible_interval[0]:.4f}, {self.credible_interval[1]:.4f}]\n"
            f"  Expected Loss (if choose Variant): {self.expected_loss_choosing_variant:.4f}\n"
            f"  Expected Loss (if choose Control): {self.expected_loss_choosing_control:.4f}\n"
            f")"
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary for serialization."""
        return {
            'control_conversion': self.control_conversion,
            'variant_conversion': self.variant_conversion,
            'control_sample_size': self.control_sample_size,
            'variant_sample_size': self.variant_sample_size,
            'probability_variant_better': self.probability_variant_better,
            'expected_lift': self.expected_lift,
            'credible_interval_lower': self.credible_interval[0],
            'credible_interval_upper': self.credible_interval[1],
            'expected_loss_variant': self.expected_loss_choosing_variant,
            'expected_loss_control': self.expected_loss_choosing_control,
            'control_posterior_alpha': self.control_posterior[0],
            'control_posterior_beta': self.control_posterior[1],
            'variant_posterior_alpha': self.variant_posterior[0],
            'variant_posterior_beta': self.variant_posterior[1],
        }
    
    def get_recommendation(self) -> str:
        """Generate recommendation based on Bayesian results."""
        if self.probability_variant_better >= 0.95:
            return 'SHIP'
        elif self.probability_variant_better <= 0.05:
            return 'ROLLBACK'
        elif self.probability_variant_better >= 0.80:
            return 'LIKELY_SHIP'
        elif self.probability_variant_better <= 0.20:
            return 'LIKELY_ROLLBACK'
        else:
            return 'CONTINUE_TESTING'


class BayesianAnalyzer:
    """
    Bayesian A/B test analyzer using Beta-Binomial conjugate model.
    
    Uses uninformative prior Beta(1, 1) by default, which is equivalent
    to a uniform distribution over [0, 1].
    
    Attributes:
        prior_alpha: Prior alpha parameter for Beta distribution
        prior_beta: Prior beta parameter for Beta distribution
        n_simulations: Number of Monte Carlo simulations
    """
    
    def __init__(
        self, 
        prior_alpha: float = 1.0, 
        prior_beta: float = 1.0,
        n_simulations: int = 100000
    ):
        """
        Initialize Bayesian analyzer.
        
        Args:
            prior_alpha: Prior alpha (successes + 1), default=1 for uninformative
            prior_beta: Prior beta (failures + 1), default=1 for uninformative
            n_simulations: Number of Monte Carlo samples for probability estimation
        """
        self.prior_alpha = prior_alpha
        self.prior_beta = prior_beta
        self.n_simulations = n_simulations
    
    def _calculate_posterior(
        self, 
        successes: int, 
        trials: int
    ) -> Tuple[float, float]:
        """
        Calculate posterior Beta distribution parameters.
        
        Using Bayesian updating:
        posterior_alpha = prior_alpha + successes
        posterior_beta = prior_beta + failures
        
        Returns:
            Tuple of (posterior_alpha, posterior_beta)
        """
        posterior_alpha = self.prior_alpha + successes
        posterior_beta = self.prior_beta + (trials - successes)
        return (posterior_alpha, posterior_beta)
    
    def _monte_carlo_probability(
        self,
        control_posterior: Tuple[float, float],
        variant_posterior: Tuple[float, float]
    ) -> Tuple[float, float, float]:
        """
        Use Monte Carlo simulation to estimate P(Variant > Control).
        
        Also calculates expected losses for decision making.
        
        Returns:
            Tuple of (probability_variant_better, loss_if_choose_variant, loss_if_choose_control)
        """
        # Sample from posterior distributions
        control_samples = np.random.beta(
            control_posterior[0], 
            control_posterior[1], 
            self.n_simulations
        )
        variant_samples = np.random.beta(
            variant_posterior[0], 
            variant_posterior[1], 
            self.n_simulations
        )
        
        # P(Variant > Control)
        probability_variant_better = np.mean(variant_samples > control_samples)
        
        # Expected loss calculations
        # Loss if we choose variant but control is actually better
        loss_variant = np.maximum(control_samples - variant_samples, 0)
        expected_loss_variant = np.mean(loss_variant)
        
        # Loss if we choose control but variant is actually better
        loss_control = np.maximum(variant_samples - control_samples, 0)
        expected_loss_control = np.mean(loss_control)
        
        return probability_variant_better, expected_loss_variant, expected_loss_control
    
    def _calculate_credible_interval(
        self,
        control_posterior: Tuple[float, float],
        variant_posterior: Tuple[float, float],
        credibility: float = 0.95
    ) -> Tuple[float, float]:
        """
        Calculate credible interval for the lift (variant - control).
        
        Uses Monte Carlo simulation to estimate the distribution of the difference.
        
        Returns:
            Tuple of (lower_bound, upper_bound) for the lift
        """
        control_samples = np.random.beta(
            control_posterior[0], 
            control_posterior[1], 
            self.n_simulations
        )
        variant_samples = np.random.beta(
            variant_posterior[0], 
            variant_posterior[1], 
            self.n_simulations
        )
        
        lift_samples = variant_samples - control_samples
        
        alpha = 1 - credibility
        lower = np.percentile(lift_samples, alpha / 2 * 100)
        upper = np.percentile(lift_samples, (1 - alpha / 2) * 100)
        
        return (lower, upper)
    
    def analyze(
        self,
        df: pd.DataFrame,
        group_col: str = 'group',
        outcome_col: str = 'converted',
        control_label: str = 'A_control',
        variant_label: str = 'B_variant'
    ) -> BayesianResult:
        """
        Perform complete Bayesian A/B test analysis.
        
        Args:
            df: DataFrame with experimental data
            group_col: Column name for group assignment
            outcome_col: Column name for binary outcome (0/1)
            control_label: Label for control group
            variant_label: Label for variant group
        
        Returns:
            BayesianResult with comprehensive Bayesian analysis
        """
        # Split data by group
        control_data = df[df[group_col] == control_label][outcome_col]
        variant_data = df[df[group_col] == variant_label][outcome_col]
        
        # Calculate observed metrics
        control_successes = int(control_data.sum())
        control_trials = len(control_data)
        control_rate = control_data.mean()
        
        variant_successes = int(variant_data.sum())
        variant_trials = len(variant_data)
        variant_rate = variant_data.mean()
        
        # Calculate posteriors
        control_posterior = self._calculate_posterior(control_successes, control_trials)
        variant_posterior = self._calculate_posterior(variant_successes, variant_trials)
        
        # Monte Carlo probability estimation
        prob_variant_better, loss_variant, loss_control = self._monte_carlo_probability(
            control_posterior, variant_posterior
        )
        
        # Credible interval for lift
        credible_interval = self._calculate_credible_interval(
            control_posterior, variant_posterior
        )
        
        # Expected lift (difference in posterior means)
        control_mean = control_posterior[0] / (control_posterior[0] + control_posterior[1])
        variant_mean = variant_posterior[0] / (variant_posterior[0] + variant_posterior[1])
        expected_lift = variant_mean - control_mean
        
        return BayesianResult(
            control_posterior=control_posterior,
            variant_posterior=variant_posterior,
            control_conversion=control_rate,
            variant_conversion=variant_rate,
            control_sample_size=control_trials,
            variant_sample_size=variant_trials,
            probability_variant_better=prob_variant_better,
            credible_interval=credible_interval,
            expected_lift=expected_lift,
            expected_loss_choosing_variant=loss_variant,
            expected_loss_choosing_control=loss_control
        )
    
    def analyze_from_counts(
        self,
        control_successes: int,
        control_trials: int,
        variant_successes: int,
        variant_trials: int
    ) -> BayesianResult:
        """
        Analyze from aggregate counts instead of raw data.
        
        Useful when only summary statistics are available.
        """
        # Create synthetic DataFrame
        df = pd.DataFrame({
            'group': ['A_control'] * control_trials + ['B_variant'] * variant_trials,
            'converted': (
                [1] * control_successes + [0] * (control_trials - control_successes) +
                [1] * variant_successes + [0] * (variant_trials - variant_successes)
            )
        })
        
        return self.analyze(df)


def main():
    """Demo the Bayesian analysis engine."""
    from pathlib import Path
    
    print("=" * 60)
    print("BAYESIAN A/B TEST ANALYSIS")
    print("=" * 60)
    
    # Try to load simulation data
    data_path = Path(__file__).parent.parent / 'data' / 'processed' / 'simulation_clean.csv'
    
    if data_path.exists():
        print(f"\nLoading data from: {data_path}")
        df = pd.read_csv(data_path)
    else:
        print("\nNo simulation data found. Generating synthetic data...")
        # Generate synthetic data for demo
        np.random.seed(42)
        n = 4000
        control_rate = 0.08
        variant_rate = 0.092  # 15% lift
        
        df = pd.DataFrame({
            'user_id': range(n * 2),
            'group': ['A_control'] * n + ['B_variant'] * n,
            'converted': (
                list(np.random.binomial(1, control_rate, n)) +
                list(np.random.binomial(1, variant_rate, n))
            )
        })
    
    # Analyze with Bayesian approach
    analyzer = BayesianAnalyzer()
    result = analyzer.analyze(df)
    
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(result)
    
    print("\n" + "-" * 60)
    print("INTERPRETATION")
    print("-" * 60)
    
    prob_pct = result.probability_variant_better * 100
    print(f"\n📊 There is a {prob_pct:.1f}% probability that the Variant is better than Control.")
    print(f"📈 Expected Lift: {result.expected_lift:+.2%}")
    print(f"📉 If we choose Variant but it's wrong, expected loss: {result.expected_loss_choosing_variant:.4f}")
    print(f"📉 If we choose Control but Variant is better, expected loss: {result.expected_loss_choosing_control:.4f}")
    
    recommendation = result.get_recommendation()
    print(f"\n🎯 RECOMMENDATION: {recommendation}")
    
    if recommendation == 'SHIP':
        print("   → High confidence. Roll out Variant to 100% of users.")
    elif recommendation == 'LIKELY_SHIP':
        print("   → Good confidence. Consider shipping with continued monitoring.")
    elif recommendation == 'CONTINUE_TESTING':
        print("   → Insufficient evidence. Continue the experiment.")
    elif recommendation == 'LIKELY_ROLLBACK':
        print("   → Variant appears worse. Consider stopping the test.")
    else:
        print("   → Strong evidence Variant is worse. Rollback recommended.")


if __name__ == '__main__':
    main()
