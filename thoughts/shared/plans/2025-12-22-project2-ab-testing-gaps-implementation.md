# Project 2 A/B Testing - Critical Gaps Implementation Plan

## Overview

This plan addresses the 6 critical gaps identified in the Growth Experimentation Portfolio (`Project_2/growth-experimentation-portfolio/`). The implementation transforms the project from a synthetic-data demonstration into a comprehensive A/B testing framework that analyzes real campaign data, supports segment analysis with multiple testing corrections, integrates Bayesian decision-making, provides rich visualizations, and implements sequential testing for early stopping.

## Current State Analysis

### Codebase Architecture

```
Project_2/growth-experimentation-portfolio/
├── src/
│   ├── simulator.py          # Generates synthetic data (4 columns only)
│   ├── stats_engine.py       # Frequentist analysis
│   ├── bayesian_engine.py    # Bayesian analysis (not used in decisions)
│   ├── guardrails.py         # Guardrail checker (never receives real data)
│   ├── memo_generator.py     # Orchestrates analysis, hardcoded guardrails
│   └── utils.py              # Contains unused load_campaign_data()
├── notebooks/
│   └── analysis_walkthrough.ipynb  # Only frequentist, 2 visualizations
├── data/
│   ├── raw/
│   │   ├── control_group.csv      # Real data (unused)
│   │   └── test_group.csv         # Real data (unused)
│   └── processed/
│       └── simulation_clean.csv   # Synthetic data (all modules use this)
└── DECISION_MEMO.md               # Output with hardcoded guardrail values
```

### Key Discoveries

1. **Real Data Schema** (`data/raw/control_group.csv`):
   - Delimiter: Semicolon (European CSV)
   - Date format: `DD.MM.YYYY`
   - Columns: `Campaign Name`, `Date`, `Spend [USD]`, `# of Impressions`, `Reach`, `# of Website Clicks`, `# of Searches`, `# of View Content`, `# of Add to Cart`, `# of Purchase`
   - Missing data: Row 5 (Aug 5, 2019) has empty values

2. **Simulator Output** (`src/simulator.py:101-106`):
   - Only generates: `user_id`, `group`, `converted`, `timestamp`
   - No segment dimensions, no guardrail metrics

3. **Decision Logic** (`src/memo_generator.py:78-91`):
   - Only uses frequentist `statistically_significant` and `relative_lift`
   - Bayesian results displayed but not used in decisions

4. **Guardrail Fallback** (`src/memo_generator.py:113-115`):
   - Hardcoded placeholder values when columns missing

## Desired End State

After implementation:

1. **Real Data Analysis**: Separate notebook and module analyzing actual campaign performance
2. **Enhanced Simulator**: Generates segments (device/channel/geo) and guardrail metrics
3. **Integrated Guardrails**: Real statistical checks on simulated guardrail data
4. **Dual Decision Framework**: Both frequentist and Bayesian inform recommendations
5. **Rich Visualizations**: 8+ chart types including time-series, posteriors, forest plots
6. **Sequential Testing**: Alpha spending functions and early stopping boundaries

### Verification

- All Python modules pass: `python -m py_compile src/*.py`
- Real data analysis runs: `python src/real_data_analyzer.py`
- Enhanced simulation works: `python src/simulator.py`
- Memo shows real guardrail stats (not hardcoded)
- Notebook executes without errors and displays all visualizations
- Sequential testing boundaries calculated correctly

## What We're NOT Doing

- Modifying the original `AB Testing/` directory CSV files
- Building a production ML pipeline or API
- Adding a web UI or dashboard
- Implementing Bayesian bandits or multi-armed bandit algorithms
- Adding database storage or data persistence beyond CSV
- Creating Docker containers or deployment infrastructure

---

## Implementation Approach

The plan is organized into 4 sequential phases, each building on the previous:

1. **Phase 1**: Real Data Integration - Analyze actual campaign data separately
2. **Phase 2**: Enhanced Simulator - Add segments and guardrails to synthetic data
3. **Phase 3**: Bayesian Integration - Dual decision framework with both approaches
4. **Phase 4**: Visualizations & Sequential Testing - Complete the analytical toolkit

---

## Phase 1: Real Data Integration

### Overview

Create a standalone analysis pipeline for the real campaign data in `data/raw/`. This demonstrates analytical judgment on messy, real-world data with missing values and aggregated metrics.

### Changes Required

#### 1. Create Real Data Analyzer Module

**File**: `src/real_data_analyzer.py` (NEW)

**Purpose**: Load, clean, and analyze the real campaign CSV files

```python
"""
Real Campaign Data Analyzer

Analyzes the actual marketing campaign A/B test data from August 2019.
Demonstrates handling of real-world data issues:
- European CSV format (semicolon delimiter)
- Missing data (Aug 5, 2019)
- Aggregated daily metrics vs user-level data
"""

import pandas as pd
import numpy as np
from pathlib import Path
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any
from scipy import stats

from utils import load_campaign_data


@dataclass
class CampaignMetrics:
    """Aggregated campaign performance metrics."""
    total_spend: float
    total_impressions: int
    total_reach: int
    total_clicks: int
    total_purchases: int
    conversion_rate: float  # Purchases / Clicks
    click_through_rate: float  # Clicks / Impressions
    cost_per_purchase: float
    days_with_data: int
    days_missing: int


@dataclass
class CampaignComparisonResult:
    """Results of comparing control vs test campaigns."""
    control_metrics: CampaignMetrics
    test_metrics: CampaignMetrics

    # Conversion rate comparison
    conversion_lift_absolute: float
    conversion_lift_relative: float
    conversion_p_value: float
    conversion_significant: bool

    # Click-through rate comparison
    ctr_lift_absolute: float
    ctr_lift_relative: float
    ctr_p_value: float
    ctr_significant: bool

    # Cost efficiency
    cost_per_purchase_change: float

    def __repr__(self) -> str:
        return (
            f"CampaignComparisonResult(\n"
            f"  Control: {self.control_metrics.conversion_rate:.2%} CVR, "
            f"${self.control_metrics.cost_per_purchase:.2f} CPP\n"
            f"  Test: {self.test_metrics.conversion_rate:.2%} CVR, "
            f"${self.test_metrics.cost_per_purchase:.2f} CPP\n"
            f"  Conversion Lift: {self.conversion_lift_relative:+.2%} "
            f"(p={self.conversion_p_value:.4f})\n"
            f"  CTR Lift: {self.ctr_lift_relative:+.2%} "
            f"(p={self.ctr_p_value:.4f})\n"
            f")"
        )


class RealDataAnalyzer:
    """
    Analyzer for real campaign A/B test data.

    Handles the specific data format and quality issues in the
    August 2019 marketing campaign test.
    """

    def __init__(self, data_dir: Optional[Path] = None):
        """
        Initialize analyzer with data directory.

        Args:
            data_dir: Path to raw data directory. Defaults to data/raw/
        """
        if data_dir is None:
            data_dir = Path(__file__).parent.parent / 'data' / 'raw'
        self.data_dir = data_dir
        self.control_df: Optional[pd.DataFrame] = None
        self.test_df: Optional[pd.DataFrame] = None

    def load_data(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Load and clean both campaign datasets.

        Returns:
            Tuple of (control_df, test_df)
        """
        control_path = self.data_dir / 'control_group.csv'
        test_path = self.data_dir / 'test_group.csv'

        self.control_df = load_campaign_data(str(control_path))
        self.test_df = load_campaign_data(str(test_path))

        return self.control_df, self.test_df

    def get_data_quality_report(self) -> Dict[str, Any]:
        """
        Generate data quality report identifying issues.

        Returns:
            Dictionary with quality metrics and issues found
        """
        if self.control_df is None:
            self.load_data()

        control_missing = self.control_df.isnull().sum().sum()
        test_missing = self.test_df.isnull().sum().sum()

        # Find specific missing dates
        control_missing_dates = self.control_df[
            self.control_df.isnull().any(axis=1)
        ]['Date'].tolist()

        test_missing_dates = self.test_df[
            self.test_df.isnull().any(axis=1)
        ]['Date'].tolist()

        return {
            'control_rows': len(self.control_df),
            'test_rows': len(self.test_df),
            'control_missing_values': control_missing,
            'test_missing_values': test_missing,
            'control_missing_dates': control_missing_dates,
            'test_missing_dates': test_missing_dates,
            'date_range': {
                'start': self.control_df['Date'].min(),
                'end': self.control_df['Date'].max()
            }
        }

    def calculate_metrics(self, df: pd.DataFrame) -> CampaignMetrics:
        """
        Calculate aggregate metrics for a campaign.

        Args:
            df: Campaign DataFrame

        Returns:
            CampaignMetrics with aggregated stats
        """
        # Drop rows with missing data for calculations
        df_clean = df.dropna()

        total_spend = df_clean['Spend_USD'].sum()
        total_impressions = int(df_clean['Impressions'].sum())
        total_reach = int(df_clean['Reach'].sum())
        total_clicks = int(df_clean['Website_Clicks'].sum())
        total_purchases = int(df_clean['Purchase'].sum())

        conversion_rate = total_purchases / total_clicks if total_clicks > 0 else 0
        ctr = total_clicks / total_impressions if total_impressions > 0 else 0
        cpp = total_spend / total_purchases if total_purchases > 0 else float('inf')

        return CampaignMetrics(
            total_spend=total_spend,
            total_impressions=total_impressions,
            total_reach=total_reach,
            total_clicks=total_clicks,
            total_purchases=total_purchases,
            conversion_rate=conversion_rate,
            click_through_rate=ctr,
            cost_per_purchase=cpp,
            days_with_data=len(df_clean),
            days_missing=len(df) - len(df_clean)
        )

    def compare_campaigns(self) -> CampaignComparisonResult:
        """
        Perform statistical comparison of control vs test campaigns.

        Returns:
            CampaignComparisonResult with all comparisons
        """
        if self.control_df is None:
            self.load_data()

        control_metrics = self.calculate_metrics(self.control_df)
        test_metrics = self.calculate_metrics(self.test_df)

        # Conversion rate comparison (chi-square test)
        # Create contingency table: [clicks that converted, clicks that didn't]
        control_conversions = control_metrics.total_purchases
        control_non_conversions = control_metrics.total_clicks - control_conversions
        test_conversions = test_metrics.total_purchases
        test_non_conversions = test_metrics.total_clicks - test_conversions

        contingency = np.array([
            [control_conversions, control_non_conversions],
            [test_conversions, test_non_conversions]
        ])
        chi2, conv_p_value, _, _ = stats.chi2_contingency(contingency)

        conv_lift_abs = test_metrics.conversion_rate - control_metrics.conversion_rate
        conv_lift_rel = conv_lift_abs / control_metrics.conversion_rate if control_metrics.conversion_rate > 0 else 0

        # CTR comparison
        control_clicks = control_metrics.total_clicks
        control_no_clicks = control_metrics.total_impressions - control_clicks
        test_clicks = test_metrics.total_clicks
        test_no_clicks = test_metrics.total_impressions - test_clicks

        ctr_contingency = np.array([
            [control_clicks, control_no_clicks],
            [test_clicks, test_no_clicks]
        ])
        _, ctr_p_value, _, _ = stats.chi2_contingency(ctr_contingency)

        ctr_lift_abs = test_metrics.click_through_rate - control_metrics.click_through_rate
        ctr_lift_rel = ctr_lift_abs / control_metrics.click_through_rate if control_metrics.click_through_rate > 0 else 0

        cpp_change = (test_metrics.cost_per_purchase - control_metrics.cost_per_purchase) / control_metrics.cost_per_purchase

        return CampaignComparisonResult(
            control_metrics=control_metrics,
            test_metrics=test_metrics,
            conversion_lift_absolute=conv_lift_abs,
            conversion_lift_relative=conv_lift_rel,
            conversion_p_value=conv_p_value,
            conversion_significant=conv_p_value < 0.05,
            ctr_lift_absolute=ctr_lift_abs,
            ctr_lift_relative=ctr_lift_rel,
            ctr_p_value=ctr_p_value,
            ctr_significant=ctr_p_value < 0.05,
            cost_per_purchase_change=cpp_change
        )

    def get_daily_metrics(self) -> pd.DataFrame:
        """
        Get day-by-day metrics for time series analysis.

        Returns:
            DataFrame with daily metrics for both campaigns
        """
        if self.control_df is None:
            self.load_data()

        control_daily = self.control_df.copy()
        control_daily['campaign'] = 'control'
        control_daily['conversion_rate'] = control_daily['Purchase'] / control_daily['Website_Clicks']
        control_daily['ctr'] = control_daily['Website_Clicks'] / control_daily['Impressions']

        test_daily = self.test_df.copy()
        test_daily['campaign'] = 'test'
        test_daily['conversion_rate'] = test_daily['Purchase'] / test_daily['Website_Clicks']
        test_daily['ctr'] = test_daily['Website_Clicks'] / test_daily['Impressions']

        combined = pd.concat([control_daily, test_daily], ignore_index=True)
        return combined.sort_values('Date')


def main():
    """Demonstrate real data analysis."""
    print("=" * 60)
    print("REAL CAMPAIGN DATA ANALYSIS")
    print("=" * 60)

    analyzer = RealDataAnalyzer()

    # Load and check data quality
    print("\n📂 Loading campaign data...")
    analyzer.load_data()

    quality = analyzer.get_data_quality_report()
    print(f"\n📊 Data Quality Report:")
    print(f"   Control: {quality['control_rows']} days, {quality['control_missing_values']} missing values")
    print(f"   Test: {quality['test_rows']} days, {quality['test_missing_values']} missing values")
    print(f"   Date Range: {quality['date_range']['start']} to {quality['date_range']['end']}")

    if quality['control_missing_dates']:
        print(f"   ⚠️ Control missing dates: {quality['control_missing_dates']}")

    # Compare campaigns
    print("\n" + "-" * 60)
    result = analyzer.compare_campaigns()
    print(result)

    # Recommendation
    print("\n" + "=" * 60)
    if result.conversion_significant and result.conversion_lift_relative > 0:
        print("✅ RECOMMENDATION: Test campaign shows significant improvement")
        print(f"   Conversion Rate: {result.conversion_lift_relative:+.2%}")
        print(f"   Cost Per Purchase: {result.cost_per_purchase_change:+.2%}")
    elif result.conversion_significant and result.conversion_lift_relative < 0:
        print("❌ RECOMMENDATION: Test campaign performs worse")
    else:
        print("⚠️ RECOMMENDATION: No significant difference detected")
    print("=" * 60)


if __name__ == '__main__':
    main()
```

#### 2. Create Real Data Analysis Notebook

**File**: `notebooks/real_data_analysis.ipynb` (NEW)

**Purpose**: Interactive walkthrough of real campaign data analysis

```python
# Cell 1 - Markdown
"""
# Real Campaign Data Analysis

This notebook analyzes the actual marketing campaign A/B test data from August 2019.
Unlike the simulation walkthrough, this uses real messy data with:
- Missing values (Aug 5, 2019)
- Aggregated daily metrics
- Real business KPIs
"""

# Cell 2 - Setup
import sys
sys.path.append('../')

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from src.real_data_analyzer import RealDataAnalyzer

sns.set_theme(style="whitegrid")
plt.rcParams['figure.figsize'] = [12, 6]

analyzer = RealDataAnalyzer()
analyzer.load_data()
print("✅ Data loaded successfully")

# Cell 3 - Data Quality
quality = analyzer.get_data_quality_report()
print("Data Quality Report:")
print(f"  Date range: {quality['date_range']['start'].strftime('%Y-%m-%d')} to {quality['date_range']['end'].strftime('%Y-%m-%d')}")
print(f"  Control: {quality['control_rows']} days, {quality['control_missing_values']} missing values")
print(f"  Test: {quality['test_rows']} days, {quality['test_missing_values']} missing values")

# Cell 4 - Time Series Plot
daily = analyzer.get_daily_metrics()
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Conversion Rate over time
for campaign in ['control', 'test']:
    data = daily[daily['campaign'] == campaign]
    axes[0, 0].plot(data['Date'], data['conversion_rate'], label=campaign, marker='o', markersize=4)
axes[0, 0].set_title('Conversion Rate Over Time')
axes[0, 0].set_ylabel('Conversion Rate')
axes[0, 0].legend()
axes[0, 0].tick_params(axis='x', rotation=45)

# CTR over time
for campaign in ['control', 'test']:
    data = daily[daily['campaign'] == campaign]
    axes[0, 1].plot(data['Date'], data['ctr'], label=campaign, marker='o', markersize=4)
axes[0, 1].set_title('Click-Through Rate Over Time')
axes[0, 1].set_ylabel('CTR')
axes[0, 1].legend()
axes[0, 1].tick_params(axis='x', rotation=45)

# Cumulative Purchases
for campaign in ['control', 'test']:
    data = daily[daily['campaign'] == campaign].sort_values('Date')
    axes[1, 0].plot(data['Date'], data['Purchase'].cumsum(), label=campaign)
axes[1, 0].set_title('Cumulative Purchases')
axes[1, 0].set_ylabel('Total Purchases')
axes[1, 0].legend()
axes[1, 0].tick_params(axis='x', rotation=45)

# Daily Spend
for campaign in ['control', 'test']:
    data = daily[daily['campaign'] == campaign]
    axes[1, 1].bar(data['Date'], data['Spend_USD'], alpha=0.7, label=campaign)
axes[1, 1].set_title('Daily Spend')
axes[1, 1].set_ylabel('Spend (USD)')
axes[1, 1].legend()
axes[1, 1].tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.show()

# Cell 5 - Statistical Comparison
result = analyzer.compare_campaigns()
print(result)

# Cell 6 - Funnel Visualization
fig, ax = plt.subplots(figsize=(10, 6))

metrics = ['Impressions', 'Clicks', 'Purchases']
control_values = [
    result.control_metrics.total_impressions,
    result.control_metrics.total_clicks,
    result.control_metrics.total_purchases
]
test_values = [
    result.test_metrics.total_impressions,
    result.test_metrics.total_clicks,
    result.test_metrics.total_purchases
]

x = np.arange(len(metrics))
width = 0.35

bars1 = ax.bar(x - width/2, control_values, width, label='Control', color='steelblue')
bars2 = ax.bar(x + width/2, test_values, width, label='Test', color='seagreen')

ax.set_ylabel('Count')
ax.set_title('Marketing Funnel: Control vs Test')
ax.set_xticks(x)
ax.set_xticklabels(metrics)
ax.legend()
ax.set_yscale('log')

plt.tight_layout()
plt.show()

# Cell 7 - Summary and Recommendation
print("=" * 50)
print("ANALYSIS SUMMARY")
print("=" * 50)
print(f"\nConversion Rate:")
print(f"  Control: {result.control_metrics.conversion_rate:.2%}")
print(f"  Test: {result.test_metrics.conversion_rate:.2%}")
print(f"  Lift: {result.conversion_lift_relative:+.2%} (p={result.conversion_p_value:.4f})")

print(f"\nCost Per Purchase:")
print(f"  Control: ${result.control_metrics.cost_per_purchase:.2f}")
print(f"  Test: ${result.test_metrics.cost_per_purchase:.2f}")
print(f"  Change: {result.cost_per_purchase_change:+.2%}")

print("\n" + "=" * 50)
if result.conversion_significant:
    if result.conversion_lift_relative > 0:
        print("✅ RECOMMENDATION: Ship the test variant")
    else:
        print("❌ RECOMMENDATION: Revert to control")
else:
    print("⚠️ RECOMMENDATION: Continue testing (not significant)")
print("=" * 50)
```

### Success Criteria

#### Automated Verification:
- [ ] Module compiles: `python -m py_compile src/real_data_analyzer.py`
- [ ] Module runs without errors: `python src/real_data_analyzer.py`
- [ ] Uses `load_campaign_data()` from utils (no longer unused)
- [ ] Handles missing data gracefully (Aug 5, 2019)

#### Manual Verification:
- [ ] Data quality report correctly identifies missing dates
- [ ] Statistical comparison produces reasonable p-values
- [ ] Time series plots show 30 days of data
- [ ] Funnel visualization shows campaign comparison

---

## Phase 2: Enhanced Simulator with Segments & Guardrails

### Overview

Extend the simulator to generate realistic segment dimensions and guardrail metrics, then update the memo generator to use real guardrail calculations instead of hardcoded values.

### Changes Required

#### 1. Update Simulator with Segments and Guardrails

**File**: `src/simulator.py`

**Changes**: Add segment generation and guardrail metrics to `generate_data()`

```python
# Add to ExperimentConfig dataclass (after line 24)
    # Segment configuration
    device_distribution: dict = None  # {'mobile': 0.6, 'desktop': 0.3, 'tablet': 0.1}
    channel_distribution: dict = None  # {'organic': 0.4, 'paid': 0.35, 'social': 0.25}
    geography_distribution: dict = None  # {'US': 0.5, 'EU': 0.3, 'APAC': 0.2}

    # Guardrail configuration
    generate_guardrails: bool = True
    base_bounce_rate: float = 0.30
    base_error_rate: float = 0.02
    base_time_to_convert: float = 60.0  # seconds

    def __post_init__(self):
        if self.device_distribution is None:
            self.device_distribution = {'mobile': 0.6, 'desktop': 0.3, 'tablet': 0.1}
        if self.channel_distribution is None:
            self.channel_distribution = {'organic': 0.4, 'paid': 0.35, 'social': 0.25}
        if self.geography_distribution is None:
            self.geography_distribution = {'US': 0.5, 'EU': 0.3, 'APAC': 0.2}
```

```python
# Replace generate_data method (lines 71-111) with enhanced version
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

    # Shuffle to simulate random assignment
    df = df.sample(frac=1).reset_index(drop=True)

    return df
```

#### 2. Create Segment Analysis Module

**File**: `src/segment_analyzer.py` (NEW)

**Purpose**: Perform segment-level analysis with multiple testing correction

```python
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
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from enum import Enum


class CorrectionMethod(Enum):
    """Multiple testing correction methods."""
    NONE = "none"
    BONFERRONI = "bonferroni"
    HOLM = "holm"
    FDR = "fdr_bh"  # Benjamini-Hochberg


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

        return SegmentAnalysisReport(
            segment_dimension=segment_col,
            correction_method=self.correction,
            alpha=self.alpha,
            results=final_results,
            simpsons_paradox_warning=paradox_warning,
            overall_lift=overall_lift
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


if __name__ == '__main__':
    main()
```

#### 3. Update Memo Generator to Use Real Guardrails

**File**: `src/memo_generator.py`

**Changes**: Remove hardcoded guardrail fallback, add segment analysis

```python
# Replace lines 107-115 (guardrail_rows generation) with:
        # Format guardrail status
        guardrail_rows = ""
        if self.guardrail_report and self.guardrail_report.results:
            for result in self.guardrail_report.results:
                status_icon = "✅" if result.status == GuardrailStatus.PASS else (
                    "⚠️" if result.status == GuardrailStatus.WARNING else "❌"
                )
                change_str = f"{result.change_pct:+.2f}%" if result.change_pct != 0 else "No change"
                guardrail_rows += (
                    f"| {result.metric_name.replace('_', ' ').title()} | "
                    f"Must not exceed {result.threshold_pct}% | "
                    f"{status_icon} {change_str} (p={result.p_value:.3f}) |\n"
                )
        else:
            guardrail_rows = "| *No guardrail metrics available* | - | ⚠️ N/A |\n"
```

```python
# Add segment analysis import at top of file (after line 16)
from segment_analyzer import SegmentAnalyzer, SegmentAnalysisReport, CorrectionMethod
```

```python
# Add segment analysis to analyze_data method (after line 76)
        # Segment analysis
        if 'device' in df.columns:
            segment_analyzer = SegmentAnalyzer(correction=CorrectionMethod.HOLM)
            self.segment_reports = segment_analyzer.analyze_all_segments(df)
        else:
            self.segment_reports = {}
```

```python
# Add segment section to memo template (after Risk Assessment section, around line 237)
        # Add segment analysis section if available
        segment_section = ""
        if hasattr(self, 'segment_reports') and self.segment_reports:
            segment_section = "\n## 8. Segment Analysis\n\n"
            for dim, report in self.segment_reports.items():
                segment_section += f"### By {dim.title()}\n\n"
                segment_section += f"*Correction: {report.correction_method.value}, α={report.alpha}*\n\n"
                segment_section += "| Segment | Control | Variant | Lift | Adj. p-value | Sig? |\n"
                segment_section += "|---------|---------|---------|------|--------------|------|\n"
                for r in report.results:
                    sig = "✅" if r.significant_adjusted else "❌"
                    segment_section += (
                        f"| {r.segment_value} | {r.control_rate:.2%} | {r.variant_rate:.2%} | "
                        f"{r.lift_relative:+.2%} | {r.p_value_adjusted:.4f} | {sig} |\n"
                    )
                if report.simpsons_paradox_warning:
                    segment_section += "\n⚠️ **Warning**: Possible Simpson's Paradox detected. "
                    segment_section += "Overall effect may differ from segment-level effects.\n"
                segment_section += "\n"
```

### Success Criteria

#### Automated Verification:
- [ ] Simulator generates 10 columns: `python -c "from src.simulator import ABTestSimulator; print(ABTestSimulator().generate_data().columns.tolist())"`
- [ ] Segment analyzer compiles: `python -m py_compile src/segment_analyzer.py`
- [ ] Memo generator works with new data: `python src/memo_generator.py`
- [ ] No hardcoded guardrail values in output memo

#### Manual Verification:
- [ ] Segment analysis shows device/channel/geography breakdowns
- [ ] Multiple testing correction adjusts p-values correctly
- [ ] Simpson's Paradox warning triggers when appropriate
- [ ] Guardrail section shows actual statistical results, not "No change"

---

## Phase 3: Bayesian Integration & Decision Framework

### Overview

Integrate the Bayesian engine into the decision framework and notebook walkthrough, creating a dual-approach system that presents both frequentist and Bayesian perspectives for informed decision-making.

### Changes Required

#### 1. Update Decision Logic in Memo Generator

**File**: `src/memo_generator.py`

**Changes**: Add Bayesian results to decision logic

```python
# Replace get_recommendation method (lines 78-91) with:
    def get_recommendation(self) -> str:
        """
        Determine the final recommendation using both frequentist and Bayesian results.

        Decision Framework:
        - SHIP: Frequentist significant AND Bayesian P(V>C) >= 95%
        - ITERATE: Either approach inconclusive
        - ROLLBACK: Both approaches indicate negative effect
        """
        if self.freq_result is None or self.bayes_result is None:
            return "UNKNOWN"

        freq_sig = self.freq_result.statistically_significant
        freq_positive = self.freq_result.relative_lift > 0
        freq_substantial = self.freq_result.relative_lift > 0.05

        bayes_confident = self.bayes_result.probability_variant_better >= 0.95
        bayes_positive = self.bayes_result.probability_variant_better >= 0.50
        bayes_negative = self.bayes_result.probability_variant_better <= 0.05

        # Strong positive signal from both approaches
        if freq_sig and freq_substantial and bayes_confident:
            return "SHIP"

        # Strong negative signal from both approaches
        if freq_sig and not freq_positive and bayes_negative:
            return "ROLLBACK"

        # Bayesian very confident but frequentist not quite there
        if bayes_confident and freq_positive:
            return "LIKELY_SHIP"

        # Frequentist significant but Bayesian not confident
        if freq_sig and freq_positive and not bayes_confident:
            return "ITERATE"

        # Neither approach shows clear signal
        return "ITERATE"
```

```python
# Update rec_action mapping (around line 100-105) to include new states:
        rec_action = {
            "SHIP": "Ship to 100%",
            "LIKELY_SHIP": "Ship with Monitoring",
            "ITERATE": "Continue Testing",
            "ROLLBACK": "Rollback to Control",
            "UNKNOWN": "Insufficient Data"
        }.get(recommendation, "Unknown")
```

#### 2. Add Methodology Comparison Section to Memo

**File**: `src/memo_generator.py`

**Changes**: Add section explaining when each approach is preferred

```python
# Add after Bayesian Analysis section in memo template (around line 192)
        methodology_section = """
### Methodology Comparison

| Criterion | Frequentist | Bayesian |
|-----------|-------------|----------|
| **Question Answered** | "Is the effect unlikely by chance?" | "What's the probability variant is better?" |
| **P-Value / Probability** | {freq_p:.4f} | {bayes_prob:.1%} |
| **Interpretation** | {"Reject" if self.freq_result.statistically_significant else "Fail to reject"} null hypothesis | {bayes_prob:.1%} confidence variant wins |
| **Decision Support** | Binary (significant/not) | Continuous probability |

**Agreement Analysis**: {"✅ Both approaches agree" if (self.freq_result.statistically_significant and self.bayes_result.probability_variant_better >= 0.95) or (not self.freq_result.statistically_significant and self.bayes_result.probability_variant_better < 0.95) else "⚠️ Approaches disagree - consider additional testing"}
""".format(
            freq_p=self.freq_result.p_value,
            bayes_prob=self.bayes_result.probability_variant_better
        )
```

#### 3. Update Notebook with Bayesian Analysis

**File**: `notebooks/analysis_walkthrough.ipynb`

**Changes**: Add Bayesian analysis cells after Cell 12

```python
# Cell 13 - Markdown
"""
## 6. Bayesian Analysis

Bayesian inference provides a different perspective:
- **P(Variant > Control)**: Direct probability that variant beats control
- **Expected Loss**: Risk quantification for decision making
- **Credible Intervals**: Range of plausible effect sizes
"""

# Cell 14 - Bayesian Analysis
from src.bayesian_engine import BayesianAnalyzer

bayes_analyzer = BayesianAnalyzer()
bayes_result = bayes_analyzer.analyze(df)

print("=" * 40)
print("BAYESIAN ANALYSIS RESULTS")
print("=" * 40)
print(bayes_result)

# Cell 15 - Posterior Distribution Visualization
import matplotlib.pyplot as plt
from scipy import stats as scipy_stats

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Left: Posterior distributions
x = np.linspace(0, 0.15, 1000)
control_post = scipy_stats.beta(
    bayes_result.control_posterior[0],
    bayes_result.control_posterior[1]
)
variant_post = scipy_stats.beta(
    bayes_result.variant_posterior[0],
    bayes_result.variant_posterior[1]
)

axes[0].plot(x, control_post.pdf(x), label='Control', color='steelblue', linewidth=2)
axes[0].plot(x, variant_post.pdf(x), label='Variant', color='seagreen', linewidth=2)
axes[0].fill_between(x, control_post.pdf(x), alpha=0.3, color='steelblue')
axes[0].fill_between(x, variant_post.pdf(x), alpha=0.3, color='seagreen')
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
lift_samples = (variant_samples - control_samples) / control_samples

axes[1].hist(lift_samples, bins=100, density=True, alpha=0.7, color='purple')
axes[1].axvline(0, color='red', linestyle='--', label='No Effect')
axes[1].axvline(np.median(lift_samples), color='green', linestyle='-', label=f'Median: {np.median(lift_samples):.2%}')
axes[1].set_xlabel('Relative Lift')
axes[1].set_ylabel('Probability Density')
axes[1].set_title(f'Distribution of Relative Lift\nP(Lift > 0) = {(lift_samples > 0).mean():.1%}')
axes[1].legend()

plt.tight_layout()
plt.show()

# Cell 16 - Methodology Comparison
print("=" * 50)
print("METHODOLOGY COMPARISON")
print("=" * 50)
print(f"\nFrequentist Approach:")
print(f"  P-value: {result.p_value:.4f}")
print(f"  Significant at α=0.05: {'Yes' if result.statistically_significant else 'No'}")
print(f"  95% CI for lift: [{result.confidence_interval[0]:.4f}, {result.confidence_interval[1]:.4f}]")

print(f"\nBayesian Approach:")
print(f"  P(Variant > Control): {bayes_result.probability_variant_better:.1%}")
print(f"  Expected Lift: {bayes_result.expected_lift:.2%}")
print(f"  95% Credible Interval: [{bayes_result.credible_interval[0]:.4f}, {bayes_result.credible_interval[1]:.4f}]")

print(f"\nAgreement: {'✅ Both approaches agree' if (result.statistically_significant and bayes_result.probability_variant_better >= 0.95) else '⚠️ Approaches differ'}")

# Cell 17 - Combined Recommendation
freq_rec = analyzer.generate_recommendation(result)
bayes_rec = bayes_result.get_recommendation()

print("\n" + "=" * 50)
print("COMBINED RECOMMENDATION")
print("=" * 50)
print(f"Frequentist: {freq_rec}")
print(f"Bayesian: {bayes_rec}")

# Final decision based on both
if freq_rec == 'SHIP' and bayes_rec == 'SHIP':
    final = "✅ SHIP - High confidence from both approaches"
elif freq_rec == 'ROLLBACK' or bayes_rec == 'ROLLBACK':
    final = "❌ ROLLBACK - At least one approach indicates negative impact"
else:
    final = "⚠️ ITERATE - Need more data or clearer signal"

print(f"\nFinal Decision: {final}")
```

### Success Criteria

#### Automated Verification:
- [ ] Memo generator produces valid markdown: `python src/memo_generator.py`
- [ ] New decision logic covers all edge cases
- [ ] Notebook executes without errors: `jupyter nbconvert --execute notebooks/analysis_walkthrough.ipynb`

#### Manual Verification:
- [ ] Decision memo shows methodology comparison table
- [ ] Notebook displays posterior distribution visualizations
- [ ] Both approaches inform final recommendation
- [ ] Agreement/disagreement clearly indicated

---

## Phase 4: Enhanced Visualizations & Sequential Testing

### Overview

Add comprehensive visualization capabilities and implement sequential testing with alpha spending functions for valid early stopping.

### Changes Required

#### 1. Create Visualization Module

**File**: `src/visualizations.py` (NEW)

**Purpose**: Centralized visualization functions for A/B testing

```python
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
```

#### 2. Create Sequential Testing Module

**File**: `src/sequential_testing.py` (NEW)

**Purpose**: Implement group sequential testing with alpha spending functions

```python
"""
Sequential Testing Module for A/B Testing

Implements group sequential testing methods for valid early stopping:
- O'Brien-Fleming alpha spending
- Pocock alpha spending
- Haybittle-Peto boundaries
- Lan-DeMets spending functions

Allows peeking at results during an experiment without inflating Type I error.
"""

import numpy as np
import pandas as pd
from scipy import stats
from scipy.special import ndtri  # Inverse normal CDF
from dataclasses import dataclass
from typing import List, Tuple, Optional, Callable
from enum import Enum


class SpendingFunction(Enum):
    """Alpha spending function types."""
    OBRIEN_FLEMING = "obrien_fleming"
    POCOCK = "pocock"
    HAYBITTLE_PETO = "haybittle_peto"


@dataclass
class InterimResult:
    """Result of an interim analysis."""
    look_number: int
    information_fraction: float
    cumulative_alpha_spent: float
    z_statistic: float
    critical_value: float
    p_value: float
    control_n: int
    variant_n: int
    control_rate: float
    variant_rate: float
    can_stop_for_efficacy: bool
    can_stop_for_futility: bool
    recommendation: str


@dataclass
class SequentialTestPlan:
    """Complete sequential testing plan."""
    total_sample_size: int
    n_looks: int
    spending_function: SpendingFunction
    alpha: float
    look_times: List[float]  # Information fractions
    critical_values: List[float]
    alpha_spent: List[float]

    def __repr__(self) -> str:
        lines = [f"SequentialTestPlan(n={self.total_sample_size}, looks={self.n_looks})"]
        lines.append(f"  Spending: {self.spending_function.value}, Alpha: {self.alpha}")
        lines.append("  Look Schedule:")
        for i, (t, cv, a) in enumerate(zip(self.look_times, self.critical_values, self.alpha_spent)):
            lines.append(f"    Look {i+1}: t={t:.2f}, z_crit={cv:.3f}, alpha_spent={a:.5f}")
        return "\n".join(lines)


class SequentialTester:
    """
    Group sequential testing with alpha spending.

    Allows valid interim analyses without inflating false positive rate.
    """

    def __init__(
        self,
        total_sample_size: int,
        n_looks: int = 5,
        alpha: float = 0.05,
        spending_function: SpendingFunction = SpendingFunction.OBRIEN_FLEMING,
        two_sided: bool = True
    ):
        """
        Initialize sequential tester.

        Args:
            total_sample_size: Total planned sample size (both groups)
            n_looks: Number of planned interim analyses (including final)
            alpha: Overall significance level
            spending_function: Alpha spending function type
            two_sided: Whether to use two-sided test
        """
        self.total_sample_size = total_sample_size
        self.n_looks = n_looks
        self.alpha = alpha
        self.spending_function = spending_function
        self.two_sided = two_sided

        # Calculate look schedule (evenly spaced by default)
        self.look_times = [i / n_looks for i in range(1, n_looks + 1)]

        # Calculate boundaries
        self.plan = self._create_plan()

    def _alpha_spending(self, t: float) -> float:
        """
        Calculate cumulative alpha spent at information fraction t.

        Args:
            t: Information fraction (0 to 1)

        Returns:
            Cumulative alpha spent
        """
        if t <= 0:
            return 0.0
        if t >= 1:
            return self.alpha

        if self.spending_function == SpendingFunction.OBRIEN_FLEMING:
            # O'Brien-Fleming: alpha(t) = 2 - 2*Phi(z_alpha/sqrt(t))
            z_alpha = ndtri(1 - self.alpha / 2) if self.two_sided else ndtri(1 - self.alpha)
            return 2 * (1 - stats.norm.cdf(z_alpha / np.sqrt(t)))

        elif self.spending_function == SpendingFunction.POCOCK:
            # Pocock: alpha(t) = alpha * log(1 + (e-1)*t)
            return self.alpha * np.log(1 + (np.e - 1) * t)

        elif self.spending_function == SpendingFunction.HAYBITTLE_PETO:
            # Haybittle-Peto: very conservative early, all remaining at final
            if t < 1:
                return 0.001  # Fixed small alpha for interim
            return self.alpha

        return self.alpha * t  # Linear spending as fallback

    def _calculate_critical_value(
        self,
        alpha_increment: float,
        prev_critical_values: List[float],
        information_fraction: float
    ) -> float:
        """
        Calculate critical value for a specific look using recursive integration.

        For simplicity, we use an approximation based on the spending function.
        """
        if self.spending_function == SpendingFunction.OBRIEN_FLEMING:
            # O'Brien-Fleming approximation
            z_alpha = ndtri(1 - self.alpha / 2) if self.two_sided else ndtri(1 - self.alpha)
            return z_alpha / np.sqrt(information_fraction)

        elif self.spending_function == SpendingFunction.POCOCK:
            # Pocock uses constant boundary
            # Approximate using inverse normal of spent alpha
            if self.two_sided:
                return ndtri(1 - alpha_increment / 2)
            return ndtri(1 - alpha_increment)

        elif self.spending_function == SpendingFunction.HAYBITTLE_PETO:
            if information_fraction < 1:
                return 3.0  # Very conservative interim boundary
            return ndtri(1 - self.alpha / 2) if self.two_sided else ndtri(1 - self.alpha)

        # Default: standard normal quantile
        return ndtri(1 - alpha_increment / 2) if self.two_sided else ndtri(1 - alpha_increment)

    def _create_plan(self) -> SequentialTestPlan:
        """Create the complete sequential testing plan."""
        critical_values = []
        alpha_spent = []
        prev_alpha = 0.0

        for t in self.look_times:
            cum_alpha = self._alpha_spending(t)
            alpha_increment = cum_alpha - prev_alpha

            cv = self._calculate_critical_value(
                alpha_increment,
                critical_values,
                t
            )

            critical_values.append(cv)
            alpha_spent.append(cum_alpha)
            prev_alpha = cum_alpha

        return SequentialTestPlan(
            total_sample_size=self.total_sample_size,
            n_looks=self.n_looks,
            spending_function=self.spending_function,
            alpha=self.alpha,
            look_times=self.look_times,
            critical_values=critical_values,
            alpha_spent=alpha_spent
        )

    def analyze_interim(
        self,
        df: pd.DataFrame,
        look_number: int,
        group_col: str = 'group',
        outcome_col: str = 'converted',
        control_label: str = 'A_control',
        variant_label: str = 'B_variant'
    ) -> InterimResult:
        """
        Perform interim analysis at a specific look.

        Args:
            df: DataFrame with data collected so far
            look_number: Which look this is (1 to n_looks)

        Returns:
            InterimResult with analysis and recommendation
        """
        if look_number < 1 or look_number > self.n_looks:
            raise ValueError(f"look_number must be between 1 and {self.n_looks}")

        # Get current sample sizes
        control_data = df[df[group_col] == control_label][outcome_col]
        variant_data = df[df[group_col] == variant_label][outcome_col]

        control_n = len(control_data)
        variant_n = len(variant_data)
        total_n = control_n + variant_n

        # Calculate information fraction
        info_fraction = total_n / self.total_sample_size

        # Get critical value for this look
        cv_index = look_number - 1
        critical_value = self.plan.critical_values[cv_index]
        cum_alpha = self.plan.alpha_spent[cv_index]

        # Calculate z-statistic
        control_rate = control_data.mean()
        variant_rate = variant_data.mean()

        pooled_rate = (control_data.sum() + variant_data.sum()) / total_n
        pooled_se = np.sqrt(pooled_rate * (1 - pooled_rate) * (1/control_n + 1/variant_n))

        if pooled_se > 0:
            z_stat = (variant_rate - control_rate) / pooled_se
        else:
            z_stat = 0.0

        # Calculate p-value
        if self.two_sided:
            p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))
        else:
            p_value = 1 - stats.norm.cdf(z_stat)

        # Determine stopping decisions
        can_stop_efficacy = abs(z_stat) >= critical_value

        # Futility: if effect is in wrong direction at late stage
        can_stop_futility = (
            look_number >= self.n_looks // 2 and
            z_stat < 0 and
            info_fraction > 0.5
        )

        # Generate recommendation
        if can_stop_efficacy:
            if z_stat > 0:
                recommendation = "STOP_FOR_EFFICACY_POSITIVE"
            else:
                recommendation = "STOP_FOR_EFFICACY_NEGATIVE"
        elif can_stop_futility:
            recommendation = "STOP_FOR_FUTILITY"
        elif look_number == self.n_looks:
            if abs(z_stat) >= critical_value:
                recommendation = "SIGNIFICANT_AT_FINAL"
            else:
                recommendation = "NOT_SIGNIFICANT"
        else:
            recommendation = "CONTINUE"

        return InterimResult(
            look_number=look_number,
            information_fraction=info_fraction,
            cumulative_alpha_spent=cum_alpha,
            z_statistic=z_stat,
            critical_value=critical_value,
            p_value=p_value,
            control_n=control_n,
            variant_n=variant_n,
            control_rate=control_rate,
            variant_rate=variant_rate,
            can_stop_for_efficacy=can_stop_efficacy,
            can_stop_for_futility=can_stop_futility,
            recommendation=recommendation
        )

    def get_boundary_plot_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Get data for plotting stopping boundaries.

        Returns:
            Tuple of (information_fractions, upper_boundaries, lower_boundaries)
        """
        t = np.array(self.look_times)
        upper = np.array(self.plan.critical_values)
        lower = -upper if self.two_sided else np.zeros_like(upper)

        return t, upper, lower


def plot_sequential_boundaries(
    tester: SequentialTester,
    interim_results: Optional[List[InterimResult]] = None,
    title: str = "Sequential Testing Boundaries",
    save_path: Optional[str] = None
):
    """
    Plot sequential testing boundaries with optional observed z-statistics.
    """
    import matplotlib.pyplot as plt

    t, upper, lower = tester.get_boundary_plot_data()

    fig, ax = plt.subplots(figsize=(12, 6))

    # Plot boundaries
    ax.step(t, upper, where='post', color='red', linewidth=2, label='Upper Boundary')
    if tester.two_sided:
        ax.step(t, lower, where='post', color='red', linewidth=2, label='Lower Boundary')

    ax.axhline(0, color='gray', linestyle='--', alpha=0.5)

    # Fill rejection regions
    ax.fill_between(t, upper, 4, step='post', alpha=0.2, color='red', label='Reject H0')
    if tester.two_sided:
        ax.fill_between(t, lower, -4, step='post', alpha=0.2, color='red')

    # Plot observed z-statistics if provided
    if interim_results:
        observed_t = [r.information_fraction for r in interim_results]
        observed_z = [r.z_statistic for r in interim_results]
        ax.plot(observed_t, observed_z, 'bo-', markersize=10, linewidth=2, label='Observed Z')

        # Mark stopping point if applicable
        for r in interim_results:
            if r.can_stop_for_efficacy:
                ax.plot(r.information_fraction, r.z_statistic, 'g*', markersize=20)
                ax.annotate('STOP', (r.information_fraction, r.z_statistic),
                           xytext=(10, 10), textcoords='offset points')

    ax.set_xlabel('Information Fraction')
    ax.set_ylabel('Z-Statistic')
    ax.set_title(f'{title}\n({tester.spending_function.value} spending, α={tester.alpha})')
    ax.legend()
    ax.set_xlim(0, 1.05)
    ax.set_ylim(-4, 4)
    ax.grid(True, alpha=0.3)

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def main():
    """Demo sequential testing."""
    from simulator import ABTestSimulator, ExperimentConfig

    print("=" * 60)
    print("SEQUENTIAL TESTING DEMO")
    print("=" * 60)

    # Create sequential test plan
    config = ExperimentConfig()
    simulator = ABTestSimulator(config)
    total_n = simulator.sample_size * 2

    tester = SequentialTester(
        total_sample_size=total_n,
        n_looks=5,
        alpha=0.05,
        spending_function=SpendingFunction.OBRIEN_FLEMING
    )

    print(f"\n{tester.plan}")

    # Simulate interim analyses
    print("\n" + "-" * 60)
    print("SIMULATED INTERIM ANALYSES")
    print("-" * 60)

    interim_results = []

    for look in range(1, tester.n_looks + 1):
        # Generate data up to this look
        n_so_far = int(total_n * look / tester.n_looks)
        df = simulator.generate_data(n_per_variant=n_so_far // 2)

        result = tester.analyze_interim(df, look)
        interim_results.append(result)

        print(f"\nLook {look}:")
        print(f"  N = {result.control_n + result.variant_n}")
        print(f"  Z = {result.z_statistic:.3f} (critical = {result.critical_value:.3f})")
        print(f"  Recommendation: {result.recommendation}")

        if result.recommendation.startswith("STOP"):
            print("\n🛑 EARLY STOPPING TRIGGERED")
            break

    # Plot boundaries
    print("\nGenerating boundary plot...")
    plot_sequential_boundaries(
        tester,
        interim_results,
        save_path='../figures/sequential_boundaries.png'
    )
    print("✅ Saved to figures/sequential_boundaries.png")


if __name__ == '__main__':
    main()
```

#### 3. Update Notebook with Complete Visualizations

**File**: `notebooks/analysis_walkthrough.ipynb`

**Changes**: Add visualization and sequential testing cells

```python
# Cell 18 - Markdown
"""
## 7. Complete Visualization Suite

Generate all standard A/B test visualizations.
"""

# Cell 19 - Import and Generate Visualizations
from src.visualizations import (
    plot_conversion_comparison,
    plot_confidence_interval,
    plot_cumulative_conversions,
    plot_posterior_distributions,
    plot_forest_plot,
    plot_power_curve
)
from src.segment_analyzer import SegmentAnalyzer

# Segment analysis
segment_analyzer = SegmentAnalyzer()
segment_reports = segment_analyzer.analyze_all_segments(df)

# Generate visualizations
fig1 = plot_conversion_comparison(result)
plt.show()

fig2 = plot_cumulative_conversions(df)
plt.show()

fig3 = plot_posterior_distributions(bayes_result)
plt.show()

fig4 = plot_forest_plot(segment_reports)
plt.show()

fig5 = plot_power_curve(baseline_rate=0.08)
plt.show()

# Cell 20 - Markdown
"""
## 8. Sequential Testing

Demonstrate how to perform valid interim analyses with alpha spending.
"""

# Cell 21 - Sequential Testing Demo
from src.sequential_testing import (
    SequentialTester,
    SpendingFunction,
    plot_sequential_boundaries
)

# Create test plan
tester = SequentialTester(
    total_sample_size=len(df),
    n_looks=5,
    alpha=0.05,
    spending_function=SpendingFunction.OBRIEN_FLEMING
)

print("Sequential Test Plan:")
print(tester.plan)

# Simulate interim analyses
interim_results = []
for look in range(1, 6):
    n_so_far = int(len(df) * look / 5)
    df_interim = df.iloc[:n_so_far]
    result = tester.analyze_interim(df_interim, look)
    interim_results.append(result)
    print(f"\nLook {look}: Z={result.z_statistic:.3f}, Critical={result.critical_value:.3f}, Rec={result.recommendation}")

# Plot boundaries
fig = plot_sequential_boundaries(tester, interim_results)
plt.show()
```

### Success Criteria

#### Automated Verification:
- [ ] Visualizations module compiles: `python -m py_compile src/visualizations.py`
- [ ] Sequential testing module compiles: `python -m py_compile src/sequential_testing.py`
- [ ] Visualization demo runs: `python src/visualizations.py`
- [ ] Sequential testing demo runs: `python src/sequential_testing.py`
- [ ] All figures generated in `figures/` directory

#### Manual Verification:
- [ ] 6+ visualization types generated correctly
- [ ] Forest plot shows all segments
- [ ] Power curve displays correct relationship
- [ ] Sequential boundaries plotted with O'Brien-Fleming shape
- [ ] Early stopping recommendation triggers at appropriate z-statistic

---

## Testing Strategy

### Unit Tests

Create `tests/test_all.py`:

```python
import pytest
import pandas as pd
import numpy as np
from pathlib import Path

# Add src to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))


class TestRealDataAnalyzer:
    def test_load_data(self):
        from real_data_analyzer import RealDataAnalyzer
        analyzer = RealDataAnalyzer()
        control, test = analyzer.load_data()
        assert len(control) == 30
        assert len(test) == 30

    def test_missing_data_detection(self):
        from real_data_analyzer import RealDataAnalyzer
        analyzer = RealDataAnalyzer()
        analyzer.load_data()
        quality = analyzer.get_data_quality_report()
        assert quality['control_missing_values'] > 0  # Aug 5 has missing data


class TestSimulator:
    def test_generates_segments(self):
        from simulator import ABTestSimulator
        sim = ABTestSimulator()
        df = sim.generate_data()
        assert 'device' in df.columns
        assert 'channel' in df.columns
        assert 'geography' in df.columns

    def test_generates_guardrails(self):
        from simulator import ABTestSimulator
        sim = ABTestSimulator()
        df = sim.generate_data()
        assert 'bounce_rate' in df.columns
        assert 'error_rate' in df.columns
        assert 'time_to_convert' in df.columns


class TestSegmentAnalyzer:
    def test_bonferroni_correction(self):
        from segment_analyzer import SegmentAnalyzer, CorrectionMethod
        analyzer = SegmentAnalyzer(correction=CorrectionMethod.BONFERRONI)
        raw_p = [0.01, 0.02, 0.03]
        adjusted = analyzer._apply_correction(raw_p)
        assert adjusted[0] == 0.03  # 0.01 * 3
        assert adjusted[1] == 0.06  # 0.02 * 3

    def test_holm_correction(self):
        from segment_analyzer import SegmentAnalyzer, CorrectionMethod
        analyzer = SegmentAnalyzer(correction=CorrectionMethod.HOLM)
        raw_p = [0.01, 0.04, 0.03]
        adjusted = analyzer._apply_correction(raw_p)
        # Holm: sorted p-values * (n - rank)
        assert adjusted[0] < adjusted[1]  # Maintains ordering


class TestSequentialTesting:
    def test_obrien_fleming_boundaries(self):
        from sequential_testing import SequentialTester, SpendingFunction
        tester = SequentialTester(
            total_sample_size=10000,
            n_looks=5,
            spending_function=SpendingFunction.OBRIEN_FLEMING
        )
        # O'Brien-Fleming has decreasing critical values
        cvs = tester.plan.critical_values
        assert cvs[0] > cvs[-1]  # First look is most conservative

    def test_pocock_boundaries(self):
        from sequential_testing import SequentialTester, SpendingFunction
        tester = SequentialTester(
            total_sample_size=10000,
            n_looks=5,
            spending_function=SpendingFunction.POCOCK
        )
        # Pocock has approximately constant boundaries
        cvs = tester.plan.critical_values
        assert max(cvs) - min(cvs) < 0.5  # Roughly constant


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
```

### Integration Tests

```bash
# Run all modules in sequence
python src/simulator.py
python src/stats_engine.py
python src/bayesian_engine.py
python src/segment_analyzer.py
python src/guardrails.py
python src/memo_generator.py
python src/real_data_analyzer.py
python src/visualizations.py
python src/sequential_testing.py
```

### Manual Testing Steps

1. Run `python src/simulator.py` and verify output shows segment columns
2. Run `python src/memo_generator.py` and check DECISION_MEMO.md has real guardrail stats
3. Open `notebooks/analysis_walkthrough.ipynb` and run all cells
4. Verify all visualizations display correctly
5. Check sequential testing boundaries plot shows proper O'Brien-Fleming shape

---

## Performance Considerations

- Sequential testing Monte Carlo simulations limited to 100,000 samples
- Visualization module closes figures to prevent memory leaks
- Real data analyzer handles missing values without loading full dataset into memory multiple times

---

## Migration Notes

No data migration required. All changes are additive:
- New modules created alongside existing ones
- Existing `simulation_clean.csv` format unchanged
- Real data analysis completely separate from simulation pipeline

---

## References

- Research document: `thoughts/shared/research/2025-12-22-project2-ab-testing-gaps-analysis.md`
- Original real data: `Project_2/AB Testing/control_group.csv`, `test_group.csv`
- Existing codebase: `Project_2/growth-experimentation-portfolio/src/`

---

**Plan Created**: 2025-12-22
**Status**: Ready for Implementation
