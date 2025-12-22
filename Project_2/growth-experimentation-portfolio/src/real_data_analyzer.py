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
