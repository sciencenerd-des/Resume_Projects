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
        Generate simulated A/B test data.
        
        Args:
            n_per_variant: Sample size per group (uses calculated if None)
        
        Returns:
            DataFrame with user_id, group, converted, timestamp columns
        """
        n = n_per_variant or self.sample_size
        
        # Calculate target conversion rates
        p_control = self.config.baseline_conversion
        p_variant = p_control * (1 + self.config.relative_lift)
        
        # Generate binary conversion outcomes
        control_conversions = np.random.binomial(n=1, p=p_control, size=n)
        variant_conversions = np.random.binomial(n=1, p=p_variant, size=n)
        
        # Generate timestamps (simulate 7-day experiment)
        base_date = pd.Timestamp('2024-01-01')
        control_timestamps = base_date + pd.to_timedelta(
            np.random.uniform(0, 7*24*60, n), unit='m'
        )
        variant_timestamps = base_date + pd.to_timedelta(
            np.random.uniform(0, 7*24*60, n), unit='m'
        )
        
        # Build DataFrame
        df = pd.DataFrame({
            'user_id': range(n * 2),
            'group': ['A_control'] * n + ['B_variant'] * n,
            'converted': np.concatenate([control_conversions, variant_conversions]),
            'timestamp': np.concatenate([control_timestamps, variant_timestamps])
        })
        
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
    
    # Save cleaned version (just the essentials)
    df_clean = df[['user_id', 'group', 'converted']].copy()
    df_clean.to_csv(output_dir / 'simulation_clean.csv', index=False)
    print(f"Saved: {output_dir / 'simulation_clean.csv'}")
    
    # Print summary statistics
    print("\nGenerated Data Summary:")
    print(df.groupby('group')['converted'].agg(['count', 'sum', 'mean']))


if __name__ == '__main__':
    main()
