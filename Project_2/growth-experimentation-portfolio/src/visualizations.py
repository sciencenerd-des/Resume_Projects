"""
Visualization Module for A/B Testing

Provides comprehensive plotting functions:
- Conversion rate comparison
- Time series analysis
- Posterior distributions
- Forest plots for segments
- Power curves
- Sequential testing boundaries
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats as scipy_stats
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass

# Import internal modules
from stats_engine import ABTestResult
from bayesian_engine import BayesianResult
from segment_analyzer import SegmentAnalysisReport


def set_style():
    """Set consistent plot styling."""
    sns.set_theme(style="whitegrid")
    plt.rcParams['figure.figsize'] = [12, 6]
    plt.rcParams['font.size'] = 11


def plot_conversion_comparison(
    result: ABTestResult,
    title: str = "Conversion Rate by Variant",
    save_path: Optional[str] = None
) -> plt.Figure:
    """
    Bar chart comparing conversion rates with error bars.
    """
    set_style()
    fig, ax = plt.subplots(figsize=(10, 6))

    labels = ['Control', 'Variant']
    rates = [result.control_conversion, result.variant_conversion]
    colors = ['steelblue', 'seagreen']

    # Calculate standard errors for error bars
    se_control = np.sqrt(result.control_conversion * (1 - result.control_conversion) / result.control_sample_size)
    se_variant = np.sqrt(result.variant_conversion * (1 - result.variant_conversion) / result.variant_sample_size)
    errors = [1.96 * se_control, 1.96 * se_variant]

    bars = ax.bar(labels, rates, color=colors, yerr=errors, capsize=10, alpha=0.8)

    # Add value labels
    for bar, rate in zip(bars, rates):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.005,
                f'{rate:.2%}', ha='center', va='bottom', fontweight='bold')

    # Add lift annotation
    ax.annotate(
        f'Lift: {result.relative_lift:+.2%}',
        xy=(1, result.variant_conversion),
        xytext=(1.3, result.variant_conversion),
        fontsize=12,
        color='green' if result.relative_lift > 0 else 'red',
        fontweight='bold'
    )

    ax.set_ylabel('Conversion Rate')
    ax.set_title(title)
    ax.set_ylim(0, max(rates) * 1.3)

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def plot_confidence_interval(
    result: ABTestResult,
    title: str = "95% Confidence Interval for Lift",
    save_path: Optional[str] = None
) -> plt.Figure:
    """
    Error bar plot showing confidence interval for the treatment effect.
    """
    set_style()
    fig, ax = plt.subplots(figsize=(10, 4))

    ci_low, ci_high = result.confidence_interval
    lift = result.absolute_lift

    ax.errorbar(
        lift, 0,
        xerr=[[lift - ci_low], [ci_high - lift]],
        fmt='o', color='seagreen', markersize=12, capsize=15,
        elinewidth=3, capthick=2
    )

    ax.axvline(0, color='red', linestyle='--', alpha=0.7, linewidth=2, label='No Effect')
    ax.set_xlabel('Absolute Difference in Conversion Rate')
    ax.set_title(title)
    ax.set_yticks([])
    ax.legend()

    # Add annotation
    ax.annotate(
        f'Point Estimate: {lift:+.2%}\n95% CI: [{ci_low:.2%}, {ci_high:.2%}]',
        xy=(lift, 0.1), fontsize=11, ha='center'
    )

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def plot_cumulative_conversions(
    df: pd.DataFrame,
    group_col: str = 'group',
    outcome_col: str = 'converted',
    timestamp_col: str = 'timestamp',
    title: str = "Cumulative Conversions Over Time",
    save_path: Optional[str] = None
) -> plt.Figure:
    """
    Time series plot of cumulative conversions by group.
    """
    set_style()
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Sort by timestamp
    df_sorted = df.sort_values(timestamp_col)

    colors = {'A_control': 'steelblue', 'B_variant': 'seagreen'}
    labels = {'A_control': 'Control', 'B_variant': 'Variant'}

    # Left: Cumulative conversions
    for group in df_sorted[group_col].unique():
        group_df = df_sorted[df_sorted[group_col] == group]
        cumsum = group_df[outcome_col].cumsum()
        axes[0].plot(
            range(len(cumsum)), cumsum,
            label=labels.get(group, group),
            color=colors.get(group, 'gray'),
            linewidth=2
        )

    axes[0].set_xlabel('User Number')
    axes[0].set_ylabel('Cumulative Conversions')
    axes[0].set_title('Cumulative Conversions')
    axes[0].legend()

    # Right: Running conversion rate
    for group in df_sorted[group_col].unique():
        group_df = df_sorted[df_sorted[group_col] == group]
        running_rate = group_df[outcome_col].expanding().mean()
        axes[1].plot(
            range(len(running_rate)), running_rate,
            label=labels.get(group, group),
            color=colors.get(group, 'gray'),
            linewidth=2
        )

    axes[1].set_xlabel('User Number')
    axes[1].set_ylabel('Running Conversion Rate')
    axes[1].set_title('Running Conversion Rate')
    axes[1].legend()

    plt.suptitle(title, fontsize=14, fontweight='bold')
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def plot_posterior_distributions(
    bayes_result: BayesianResult,
    title: str = "Posterior Distributions",
    save_path: Optional[str] = None
) -> plt.Figure:
    """
    Plot Bayesian posterior distributions for both groups.
    """
    set_style()
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Left: Posterior distributions
    x = np.linspace(0.01, 0.20, 1000)

    control_dist = scipy_stats.beta(
        bayes_result.control_posterior[0],
        bayes_result.control_posterior[1]
    )
    variant_dist = scipy_stats.beta(
        bayes_result.variant_posterior[0],
        bayes_result.variant_posterior[1]
    )

    axes[0].plot(x, control_dist.pdf(x), label='Control', color='steelblue', linewidth=2)
    axes[0].plot(x, variant_dist.pdf(x), label='Variant', color='seagreen', linewidth=2)
    axes[0].fill_between(x, control_dist.pdf(x), alpha=0.3, color='steelblue')
    axes[0].fill_between(x, variant_dist.pdf(x), alpha=0.3, color='seagreen')
    axes[0].set_xlabel('Conversion Rate')
    axes[0].set_ylabel('Probability Density')
    axes[0].set_title('Posterior Distributions')
    axes[0].legend()

    # Right: Lift distribution
    n_samples = 100000
    control_samples = np.random.beta(
        bayes_result.control_posterior[0],
        bayes_result.control_posterior[1],
        n_samples
    )
    variant_samples = np.random.beta(
        bayes_result.variant_posterior[0],
        bayes_result.variant_posterior[1],
        n_samples
    )
    lift_samples = variant_samples - control_samples

    axes[1].hist(lift_samples, bins=100, density=True, alpha=0.7, color='purple')
    axes[1].axvline(0, color='red', linestyle='--', linewidth=2, label='No Effect')
    axes[1].axvline(
        np.median(lift_samples), color='green', linestyle='-', linewidth=2,
        label=f'Median: {np.median(lift_samples):.4f}'
    )

    # Shade the positive region
    hist_vals, bin_edges = np.histogram(lift_samples, bins=100, density=True)
    positive_mask = bin_edges[:-1] > 0
    axes[1].fill_between(
        bin_edges[:-1][positive_mask],
        hist_vals[positive_mask],
        alpha=0.3, color='green'
    )

    axes[1].set_xlabel('Absolute Lift (Variant - Control)')
    axes[1].set_ylabel('Probability Density')
    axes[1].set_title(f'Distribution of Lift\nP(Variant > Control) = {bayes_result.probability_variant_better:.1%}')
    axes[1].legend()

    plt.suptitle(title, fontsize=14, fontweight='bold')
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def plot_forest_plot(
    segment_reports: Dict[str, SegmentAnalysisReport],
    title: str = "Forest Plot: Effect by Segment",
    save_path: Optional[str] = None
) -> plt.Figure:
    """
    Forest plot showing effect sizes across segments.
    """
    set_style()

    # Collect all segments
    all_segments = []
    for dim, report in segment_reports.items():
        for r in report.results:
            all_segments.append({
                'dimension': dim,
                'segment': r.segment_value,
                'lift': r.lift_relative,
                'significant': r.significant_adjusted,
                'n': r.control_n + r.variant_n
            })

    if not all_segments:
        return None

    segments_df = pd.DataFrame(all_segments)
    segments_df = segments_df.sort_values(['dimension', 'lift'])

    fig, ax = plt.subplots(figsize=(12, len(segments_df) * 0.5 + 2))

    y_positions = range(len(segments_df))
    colors = ['seagreen' if sig else 'gray' for sig in segments_df['significant']]

    ax.barh(y_positions, segments_df['lift'], color=colors, alpha=0.7, height=0.6)
    ax.axvline(0, color='red', linestyle='--', linewidth=2)

    # Labels
    labels = [f"{row['dimension']}: {row['segment']} (n={row['n']})"
              for _, row in segments_df.iterrows()]
    ax.set_yticks(y_positions)
    ax.set_yticklabels(labels)
    ax.set_xlabel('Relative Lift')
    ax.set_title(title)

    # Add value labels
    for i, (_, row) in enumerate(segments_df.iterrows()):
        ax.text(row['lift'] + 0.01 if row['lift'] >= 0 else row['lift'] - 0.01,
                i, f"{row['lift']:+.1%}",
                va='center', ha='left' if row['lift'] >= 0 else 'right',
                fontsize=9)

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def plot_power_curve(
    baseline_rate: float = 0.08,
    alpha: float = 0.05,
    sample_sizes: Optional[List[int]] = None,
    title: str = "Statistical Power vs Sample Size",
    save_path: Optional[str] = None
) -> plt.Figure:
    """
    Plot showing power curve for different sample sizes and effect sizes.
    """
    set_style()
    from statsmodels.stats.power import NormalIndPower

    if sample_sizes is None:
        sample_sizes = [500, 1000, 2000, 5000, 10000, 20000]

    effect_sizes = [0.05, 0.10, 0.15, 0.20, 0.25]  # Relative lifts

    fig, ax = plt.subplots(figsize=(12, 6))

    power_analysis = NormalIndPower()
    colors = plt.cm.viridis(np.linspace(0, 1, len(effect_sizes)))

    for i, mde in enumerate(effect_sizes):
        p1 = baseline_rate * (1 + mde)
        effect = 2 * (np.arcsin(np.sqrt(p1)) - np.arcsin(np.sqrt(baseline_rate)))

        powers = []
        for n in sample_sizes:
            power = power_analysis.solve_power(
                effect_size=abs(effect),
                nobs1=n,
                alpha=alpha,
                ratio=1.0,
                alternative='two-sided'
            )
            powers.append(power)

        ax.plot(sample_sizes, powers, marker='o', linewidth=2,
                color=colors[i], label=f'{mde:.0%} lift')

    ax.axhline(0.80, color='red', linestyle='--', alpha=0.7, label='80% Power')
    ax.set_xlabel('Sample Size per Variant')
    ax.set_ylabel('Statistical Power')
    ax.set_title(title)
    ax.legend(title='Minimum Detectable Effect')
    ax.set_ylim(0, 1.05)
    ax.grid(True, alpha=0.3)

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def create_visualization_report(
    df: pd.DataFrame,
    freq_result: ABTestResult,
    bayes_result: BayesianResult,
    segment_reports: Optional[Dict[str, SegmentAnalysisReport]] = None,
    output_dir: str = 'figures'
) -> List[str]:
    """
    Generate all visualizations and save to directory.

    Returns:
        List of saved file paths
    """
    import os
    os.makedirs(output_dir, exist_ok=True)

    saved_files = []

    # 1. Conversion comparison
    plot_conversion_comparison(freq_result, save_path=f'{output_dir}/01_conversion_comparison.png')
    saved_files.append(f'{output_dir}/01_conversion_comparison.png')

    # 2. Confidence interval
    plot_confidence_interval(freq_result, save_path=f'{output_dir}/02_confidence_interval.png')
    saved_files.append(f'{output_dir}/02_confidence_interval.png')

    # 3. Cumulative conversions
    if 'timestamp' in df.columns:
        plot_cumulative_conversions(df, save_path=f'{output_dir}/03_cumulative_conversions.png')
        saved_files.append(f'{output_dir}/03_cumulative_conversions.png')

    # 4. Posterior distributions
    plot_posterior_distributions(bayes_result, save_path=f'{output_dir}/04_posterior_distributions.png')
    saved_files.append(f'{output_dir}/04_posterior_distributions.png')

    # 5. Forest plot
    if segment_reports:
        plot_forest_plot(segment_reports, save_path=f'{output_dir}/05_forest_plot.png')
        saved_files.append(f'{output_dir}/05_forest_plot.png')

    # 6. Power curve
    plot_power_curve(save_path=f'{output_dir}/06_power_curve.png')
    saved_files.append(f'{output_dir}/06_power_curve.png')

    plt.close('all')

    return saved_files


def main():
    """Demo all visualizations."""
    from simulator import ABTestSimulator
    from stats_engine import ABTestAnalyzer
    from bayesian_engine import BayesianAnalyzer
    from segment_analyzer import SegmentAnalyzer

    print("Generating sample data and visualizations...")

    # Generate data
    simulator = ABTestSimulator()
    df = simulator.generate_data()

    # Analyze
    freq_analyzer = ABTestAnalyzer()
    freq_result = freq_analyzer.analyze(df)

    bayes_analyzer = BayesianAnalyzer()
    bayes_result = bayes_analyzer.analyze(df)

    segment_analyzer = SegmentAnalyzer()
    segment_reports = segment_analyzer.analyze_all_segments(df)

    # Generate all visualizations
    saved = create_visualization_report(
        df, freq_result, bayes_result, segment_reports,
        output_dir='../figures'
    )

    print(f"\n✅ Generated {len(saved)} visualizations:")
    for f in saved:
        print(f"   - {f}")


if __name__ == '__main__':
    main()
