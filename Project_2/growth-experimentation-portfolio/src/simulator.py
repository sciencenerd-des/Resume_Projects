"""
A/B Test Data Simulator
Generates statistically valid experimental data with configurable parameters.

Based on hypothesis:
"Changing the 'Sign Up' button color from Blue to Green will result in 
a 15% increase in conversion rate."
"""

import numpy as np
import pandas as pd
from typing import Tuple, Optional
from dataclasses import dataclass
from statsmodels.stats.power import GofChisquarePower, NormalIndPower


@dataclass
class ExperimentConfig:
    """Configuration for A/B test simulation."""
    baseline_conversion: float = 0.08  # 8% baseline
    relative_lift: float = 0.15  # 15% relative improvement
    alpha: float = 0.05  # 5% significance level
    power: float = 0.80  # 80% statistical power
    random_seed: Optional[int] = 42  # Reproducibility

    # Segment configuration
    device_distribution: dict = None  # {'mobile': 0.6, 'desktop': 0.3, 'tablet': 0.1}
    channel_distribution: dict = None  # {'organic': 0.4, 'paid': 0.35, 'social': 0.25}
    geography_distribution: dict = None  # {'US': 0.5, 'EU': 0.3, 'APAC': 0.2}

    # Guardrail configuration
    generate_guardrails: bool = True
    base_bounce_rate: float = 0.30
    base_error_rate: float = 0.02
    base_time_to_convert: float = 60.0  # seconds

    # Pre-experiment data for CUPED variance reduction
    generate_pre_experiment: bool = True
    pre_experiment_correlation: float = 0.5  # Correlation between pre/post behavior

    def __post_init__(self):
        if self.device_distribution is None:
            self.device_distribution = {'mobile': 0.6, 'desktop': 0.3, 'tablet': 0.1}
        if self.channel_distribution is None:
            self.channel_distribution = {'organic': 0.4, 'paid': 0.35, 'social': 0.25}
        if self.geography_distribution is None:
            self.geography_distribution = {'US': 0.5, 'EU': 0.3, 'APAC': 0.2}


class ABTestSimulator:
    """
    Generates synthetic A/B test data with proper statistical properties.
    
    Attributes:
        config: ExperimentConfig with test parameters
        sample_size: Calculated required sample size per variant
    """
    
    def __init__(self, config: Optional[ExperimentConfig] = None):
        self.config = config or ExperimentConfig()
        self.sample_size = self._calculate_sample_size()
        
        if self.config.random_seed:
            np.random.seed(self.config.random_seed)
    
    def _calculate_sample_size(self) -> int:
        """
        Calculate required sample size using power analysis.
        
        Uses the effect size formula for proportion tests:
        effect_size = |p1 - p2| / sqrt(p_pooled * (1 - p_pooled))
        """
        p0 = self.config.baseline_conversion
        p1 = p0 * (1 + self.config.relative_lift)
        
        # Pooled proportion
        p_pooled = (p0 + p1) / 2
        
        # Cohen's h effect size for proportions
        effect_size = 2 * (np.arcsin(np.sqrt(p1)) - np.arcsin(np.sqrt(p0)))
        
        # Use normal approximation for sample size
        power_analysis = NormalIndPower()
        sample_size = power_analysis.solve_power(
            effect_size=abs(effect_size),
            power=self.config.power,
            alpha=self.config.alpha,
            ratio=1.0,  # Equal group sizes
            alternative='two-sided'
        )
        
        return int(np.ceil(sample_size))
    
    def generate_data(self, n_per_variant: Optional[int] = None) -> pd.DataFrame:
        """
        Generate simulated A/B test data with segments and guardrails.

        Args:
            n_per_variant: Sample size per group (uses calculated if None)

        Returns:
            DataFrame with user_id, group, converted, timestamp,
            device, channel, geography, bounce_rate, error_rate, time_to_convert
        """
        n = n_per_variant or self.sample_size
        total_n = n * 2

        # Calculate target conversion rates
        p_control = self.config.baseline_conversion
        p_variant = p_control * (1 + self.config.relative_lift)

        # Generate group assignments
        groups = np.array(['A_control'] * n + ['B_variant'] * n)

        # Generate segments
        devices = np.random.choice(
            list(self.config.device_distribution.keys()),
            size=total_n,
            p=list(self.config.device_distribution.values())
        )

        channels = np.random.choice(
            list(self.config.channel_distribution.keys()),
            size=total_n,
            p=list(self.config.channel_distribution.values())
        )

        geographies = np.random.choice(
            list(self.config.geography_distribution.keys()),
            size=total_n,
            p=list(self.config.geography_distribution.values())
        )

        # Generate conversions with segment-based variation
        # Mobile has slightly higher conversion, desktop slightly lower
        device_multipliers = {'mobile': 1.1, 'desktop': 0.9, 'tablet': 1.0}

        conversions = []
        for i in range(total_n):
            base_p = p_control if groups[i] == 'A_control' else p_variant
            device_mult = device_multipliers.get(devices[i], 1.0)
            adjusted_p = min(base_p * device_mult, 1.0)
            conversions.append(np.random.binomial(1, adjusted_p))

        conversions = np.array(conversions)

        # Generate timestamps (simulate 7-day experiment)
        base_date = pd.Timestamp('2024-01-01')
        timestamps = base_date + pd.to_timedelta(
            np.random.uniform(0, 7*24*60, total_n), unit='m'
        )

        # Build base DataFrame
        df = pd.DataFrame({
            'user_id': range(total_n),
            'group': groups,
            'converted': conversions,
            'timestamp': timestamps,
            'device': devices,
            'channel': channels,
            'geography': geographies
        })

        # Generate guardrail metrics if enabled
        if self.config.generate_guardrails:
            # Bounce rate: slightly higher for variant (realistic scenario)
            control_bounce = np.random.binomial(
                1, self.config.base_bounce_rate, n
            )
            variant_bounce = np.random.binomial(
                1, self.config.base_bounce_rate * 1.02, n  # 2% higher
            )
            df['bounce_rate'] = np.concatenate([control_bounce, variant_bounce])

            # Error rate: same for both groups
            df['error_rate'] = np.random.binomial(
                1, self.config.base_error_rate, total_n
            )

            # Time to convert: exponential distribution
            control_time = np.random.exponential(
                self.config.base_time_to_convert, n
            )
            variant_time = np.random.exponential(
                self.config.base_time_to_convert * 1.03, n  # 3% higher
            )
            df['time_to_convert'] = np.concatenate([control_time, variant_time])

        # Generate pre-experiment data for CUPED variance reduction
        if self.config.generate_pre_experiment:
            # Pre-experiment behavior is correlated with experiment behavior
            # Users who converted before are more likely to convert during experiment
            rho = self.config.pre_experiment_correlation

            # Generate correlated pre-experiment conversions
            # Use a latent variable approach
            pre_exp_conversions = []
            for i in range(total_n):
                # Higher propensity for those who will convert in experiment
                if conversions[i] == 1:
                    # Converters have higher pre-experiment conversion probability
                    pre_p = self.config.baseline_conversion * (1 + rho)
                else:
                    # Non-converters have lower pre-experiment conversion probability
                    pre_p = self.config.baseline_conversion * (1 - rho * 0.3)
                pre_p = np.clip(pre_p, 0.01, 0.99)
                pre_exp_conversions.append(np.random.binomial(1, pre_p))

            df['pre_experiment_converted'] = pre_exp_conversions

        # Shuffle to simulate random assignment
        df = df.sample(frac=1).reset_index(drop=True)

        return df
    
    def generate_with_metadata(self) -> Tuple[pd.DataFrame, dict]:
        """
        Generate data along with experiment metadata.
        
        Returns:
            Tuple of (DataFrame, metadata dict)
        """
        df = self.generate_data()
        
        metadata = {
            'experiment_name': 'Button Color Test (Blue vs Green)',
            'hypothesis': (
                "Changing the 'Sign Up' button color from Blue to Green "
                "will result in a 15% increase in conversion rate."
            ),
            'baseline_conversion': self.config.baseline_conversion,
            'target_conversion': self.config.baseline_conversion * (1 + self.config.relative_lift),
            'relative_lift': self.config.relative_lift,
            'alpha': self.config.alpha,
            'power': self.config.power,
            'sample_size_per_variant': self.sample_size,
            'total_sample_size': self.sample_size * 2,
            'control_group': 'A_control (Blue button)',
            'variant_group': 'B_variant (Green button)'
        }
        
        return df, metadata


def main():
    """Generate and save simulation data."""
    from pathlib import Path
    
    # Initialize simulator with default config
    simulator = ABTestSimulator()
    
    print(f"Experiment Configuration:")
    print(f"  Baseline Conversion: {simulator.config.baseline_conversion:.1%}")
    print(f"  Target Lift: {simulator.config.relative_lift:.1%}")
    print(f"  Required Sample Size: {simulator.sample_size:,} per variant")
    print(f"  Total Sample Size: {simulator.sample_size * 2:,}")
    print()
    
    # Generate data
    df, metadata = simulator.generate_with_metadata()
    
    # Save raw data
    # Navigate relative to current file to ensure correct path
    project_root = Path(__file__).parent.parent
    output_dir = project_root / 'data' / 'processed'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    df.to_csv(output_dir / 'simulation_raw.csv', index=False)
    print(f"Saved: {output_dir / 'simulation_raw.csv'}")
    
    # Save cleaned version (essentials + pre-experiment for CUPED)
    clean_cols = ['user_id', 'group', 'converted']
    if 'pre_experiment_converted' in df.columns:
        clean_cols.append('pre_experiment_converted')
    df_clean = df[clean_cols].copy()
    df_clean.to_csv(output_dir / 'simulation_clean.csv', index=False)
    print(f"Saved: {output_dir / 'simulation_clean.csv'}")
    
    # Print summary statistics
    print("\nGenerated Data Summary:")
    print(df.groupby('group')['converted'].agg(['count', 'sum', 'mean']))


if __name__ == '__main__':
    main()
