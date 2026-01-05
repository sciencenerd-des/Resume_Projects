"""
Sequential Testing Module for A/B Testing

Implements group sequential testing methods with alpha spending functions:
- O'Brien-Fleming (conservative early stopping)
- Pocock (uniform spending)
- Haybittle-Peto (very conservative early)

Enables valid early stopping while controlling Type I error.
"""

import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import brentq
from dataclasses import dataclass
from typing import List, Optional, Tuple, Callable
from enum import Enum
import matplotlib.pyplot as plt


class SpendingFunction(Enum):
    """Alpha spending function types."""
    OBRIEN_FLEMING = "obrien_fleming"
    POCOCK = "pocock"
    HAYBITTLE_PETO = "haybittle_peto"


@dataclass
class InterimResult:
    """Result of a single interim analysis."""
    look_number: int
    information_fraction: float
    z_statistic: float
    p_value: float
    alpha_spent: float
    cumulative_alpha_spent: float
    critical_value: float
    reject_null: bool
    control_n: int
    variant_n: int
    control_rate: float
    variant_rate: float
    lift: float


@dataclass
class SequentialTestPlan:
    """Complete sequential testing plan."""
    n_looks: int
    alpha: float
    spending_function: SpendingFunction
    information_fractions: List[float]
    critical_values: List[float]
    alpha_at_looks: List[float]
    cumulative_alpha: List[float]


class SequentialTester:
    """
    Implements group sequential testing with alpha spending.

    Alpha spending functions control the cumulative Type I error
    across multiple interim analyses, enabling valid early stopping.
    """

    def __init__(
        self,
        alpha: float = 0.05,
        n_looks: int = 5,
        spending_function: SpendingFunction = SpendingFunction.OBRIEN_FLEMING
    ):
        self.alpha = alpha
        self.n_looks = n_looks
        self.spending_function = spending_function
        self.plan: Optional[SequentialTestPlan] = None
        self.results: List[InterimResult] = []

    def _obrien_fleming_boundary(self, t: float, alpha: float) -> float:
        """
        O'Brien-Fleming alpha spending function.

        Very conservative early, spends most alpha at the end.
        α(t) = 2 * (1 - Φ(z_{α/2} / √t))
        """
        if t <= 0:
            return 0.0
        z_alpha = stats.norm.ppf(1 - alpha / 2)
        return 2 * (1 - stats.norm.cdf(z_alpha / np.sqrt(t)))

    def _pocock_boundary(self, t: float, alpha: float) -> float:
        """
        Pocock alpha spending function.

        Uniform spending across looks.
        α(t) = α * log(1 + (e - 1) * t)
        """
        if t <= 0:
            return 0.0
        return alpha * np.log(1 + (np.e - 1) * t)

    def _haybittle_peto_boundary(self, t: float, alpha: float, n_looks: int) -> float:
        """
        Haybittle-Peto alpha spending function.

        Very conservative early (z=3 boundary), saves almost all alpha for final.
        """
        if t <= 0:
            return 0.0
        if t < 1.0:
            # Use z=3 for all interim analyses
            interim_alpha = 2 * (1 - stats.norm.cdf(3))
            return min(interim_alpha * (n_looks - 1), alpha * t)
        return alpha

    def _get_spending_function(self) -> Callable:
        """Get the appropriate spending function."""
        if self.spending_function == SpendingFunction.OBRIEN_FLEMING:
            return lambda t: self._obrien_fleming_boundary(t, self.alpha)
        elif self.spending_function == SpendingFunction.POCOCK:
            return lambda t: self._pocock_boundary(t, self.alpha)
        elif self.spending_function == SpendingFunction.HAYBITTLE_PETO:
            return lambda t: self._haybittle_peto_boundary(t, self.alpha, self.n_looks)
        else:
            raise ValueError(f"Unknown spending function: {self.spending_function}")

    def create_plan(
        self,
        information_fractions: Optional[List[float]] = None
    ) -> SequentialTestPlan:
        """
        Create a sequential testing plan with critical values.

        Args:
            information_fractions: Proportion of total information at each look.
                                   Defaults to equally spaced.

        Returns:
            SequentialTestPlan with boundaries
        """
        if information_fractions is None:
            information_fractions = [
                (i + 1) / self.n_looks for i in range(self.n_looks)
            ]

        if len(information_fractions) != self.n_looks:
            raise ValueError("information_fractions must have n_looks elements")

        spending_func = self._get_spending_function()

        # Calculate cumulative alpha spent at each look
        cumulative_alpha = [spending_func(t) for t in information_fractions]

        # Calculate incremental alpha at each look
        alpha_at_looks = [cumulative_alpha[0]]
        for i in range(1, self.n_looks):
            alpha_at_looks.append(cumulative_alpha[i] - cumulative_alpha[i - 1])

        # Calculate critical values (two-sided)
        critical_values = []
        for alpha_i in alpha_at_looks:
            if alpha_i > 0:
                z_crit = stats.norm.ppf(1 - alpha_i / 2)
            else:
                z_crit = np.inf
            critical_values.append(z_crit)

        self.plan = SequentialTestPlan(
            n_looks=self.n_looks,
            alpha=self.alpha,
            spending_function=self.spending_function,
            information_fractions=information_fractions,
            critical_values=critical_values,
            alpha_at_looks=alpha_at_looks,
            cumulative_alpha=cumulative_alpha
        )

        return self.plan

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
            df: DataFrame with data available at this look
            look_number: Which interim analysis (1-indexed)

        Returns:
            InterimResult with decision
        """
        if self.plan is None:
            self.create_plan()

        if look_number < 1 or look_number > self.n_looks:
            raise ValueError(f"look_number must be between 1 and {self.n_looks}")

        look_idx = look_number - 1

        # Split data
        control = df[df[group_col] == control_label][outcome_col]
        variant = df[df[group_col] == variant_label][outcome_col]

        control_n = len(control)
        variant_n = len(variant)
        control_rate = control.mean()
        variant_rate = variant.mean()

        # Calculate z-statistic
        pooled_rate = (control.sum() + variant.sum()) / (control_n + variant_n)
        se = np.sqrt(pooled_rate * (1 - pooled_rate) * (1/control_n + 1/variant_n))

        if se > 0:
            z_stat = (variant_rate - control_rate) / se
        else:
            z_stat = 0.0

        p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))

        # Compare to critical value
        critical_value = self.plan.critical_values[look_idx]
        reject_null = abs(z_stat) >= critical_value

        result = InterimResult(
            look_number=look_number,
            information_fraction=self.plan.information_fractions[look_idx],
            z_statistic=z_stat,
            p_value=p_value,
            alpha_spent=self.plan.alpha_at_looks[look_idx],
            cumulative_alpha_spent=self.plan.cumulative_alpha[look_idx],
            critical_value=critical_value,
            reject_null=reject_null,
            control_n=control_n,
            variant_n=variant_n,
            control_rate=control_rate,
            variant_rate=variant_rate,
            lift=(variant_rate - control_rate) / control_rate if control_rate > 0 else 0
        )

        self.results.append(result)
        return result

    def analyze_sequential(
        self,
        df: pd.DataFrame,
        timestamp_col: str = 'timestamp',
        group_col: str = 'group',
        outcome_col: str = 'converted',
        control_label: str = 'A_control',
        variant_label: str = 'B_variant'
    ) -> List[InterimResult]:
        """
        Run sequential analysis on time-ordered data.

        Splits data into n_looks chunks and performs interim analyses.

        Returns:
            List of InterimResult for each look
        """
        if self.plan is None:
            self.create_plan()

        # Sort by timestamp
        df_sorted = df.sort_values(timestamp_col)
        n_total = len(df_sorted)

        self.results = []

        for i in range(self.n_looks):
            # Calculate how much data to include at this look
            info_frac = self.plan.information_fractions[i]
            n_at_look = int(n_total * info_frac)

            df_at_look = df_sorted.head(n_at_look)

            result = self.analyze_interim(
                df_at_look,
                look_number=i + 1,
                group_col=group_col,
                outcome_col=outcome_col,
                control_label=control_label,
                variant_label=variant_label
            )

            # Early stopping check
            if result.reject_null:
                break

        return self.results

    def get_summary(self) -> str:
        """Generate summary of sequential analysis."""
        if not self.results:
            return "No interim analyses performed yet."

        lines = [
            "Sequential Testing Summary",
            "=" * 50,
            f"Spending Function: {self.spending_function.value}",
            f"Planned Looks: {self.n_looks}",
            f"Overall Alpha: {self.alpha}",
            "",
            "Interim Results:",
            "-" * 50
        ]

        stopped_early = False
        for r in self.results:
            status = "✅ STOP" if r.reject_null else "➡️ CONTINUE"
            lines.append(
                f"Look {r.look_number}: z={r.z_statistic:.3f}, "
                f"critical={r.critical_value:.3f}, "
                f"lift={r.lift:+.2%} [{status}]"
            )
            if r.reject_null:
                stopped_early = True

        lines.append("")
        if stopped_early:
            final = self.results[-1]
            lines.append(
                f"⚡ Early stopping at look {final.look_number} "
                f"(info fraction: {final.information_fraction:.1%})"
            )
            lines.append(f"   Final lift: {final.lift:+.2%}")
        else:
            lines.append("📊 Completed all planned looks without early stopping")

        return "\n".join(lines)


def plot_sequential_boundaries(
    plan: SequentialTestPlan,
    results: Optional[List[InterimResult]] = None,
    title: str = "Sequential Testing Boundaries",
    save_path: Optional[str] = None
) -> plt.Figure:
    """
    Plot sequential testing boundaries with optional observed z-statistics.

    Args:
        plan: SequentialTestPlan with boundaries
        results: Optional list of InterimResult to overlay
        title: Plot title
        save_path: Optional path to save figure

    Returns:
        matplotlib Figure
    """
    fig, ax = plt.subplots(figsize=(12, 6))

    # Plot upper and lower boundaries
    info_fracs = plan.information_fractions
    upper_bounds = plan.critical_values
    lower_bounds = [-z for z in plan.critical_values]

    ax.plot(info_fracs, upper_bounds, 'r-', linewidth=2,
            label='Upper Boundary (Reject H0: Variant Better)')
    ax.plot(info_fracs, lower_bounds, 'b-', linewidth=2,
            label='Lower Boundary (Reject H0: Control Better)')

    # Fill rejection regions
    ax.fill_between(info_fracs, upper_bounds, [5] * len(info_fracs),
                    alpha=0.2, color='red')
    ax.fill_between(info_fracs, lower_bounds, [-5] * len(info_fracs),
                    alpha=0.2, color='blue')

    # Add continuation region
    ax.fill_between(info_fracs, lower_bounds, upper_bounds,
                    alpha=0.1, color='gray', label='Continue Testing')

    # Plot observed z-statistics if provided
    if results:
        obs_fracs = [r.information_fraction for r in results]
        obs_z = [r.z_statistic for r in results]

        ax.plot(obs_fracs, obs_z, 'go-', markersize=10, linewidth=2,
                label='Observed Z-statistic')

        # Mark if stopped early
        for r in results:
            if r.reject_null:
                ax.scatter([r.information_fraction], [r.z_statistic],
                          s=200, c='green', marker='*', zorder=5,
                          label=f'Early Stop (Look {r.look_number})')
                break

    ax.axhline(0, color='gray', linestyle='--', alpha=0.5)
    ax.set_xlabel('Information Fraction')
    ax.set_ylabel('Z-Statistic')
    ax.set_title(f"{title}\n({plan.spending_function.value} spending)")
    ax.set_xlim(0, 1.05)
    ax.set_ylim(-4, 4)
    ax.legend(loc='upper right')
    ax.grid(True, alpha=0.3)

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def compare_spending_functions(
    alpha: float = 0.05,
    n_looks: int = 5,
    save_path: Optional[str] = None
) -> plt.Figure:
    """
    Compare different alpha spending functions visually.

    Shows how each function allocates Type I error across looks.
    """
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    info_fracs = np.linspace(0.01, 1.0, 100)

    # Create testers for each function
    testers = {
        'O\'Brien-Fleming': SequentialTester(alpha, n_looks, SpendingFunction.OBRIEN_FLEMING),
        'Pocock': SequentialTester(alpha, n_looks, SpendingFunction.POCOCK),
        'Haybittle-Peto': SequentialTester(alpha, n_looks, SpendingFunction.HAYBITTLE_PETO)
    }

    colors = {'O\'Brien-Fleming': 'blue', 'Pocock': 'green', 'Haybittle-Peto': 'red'}

    # Left: Cumulative alpha spending
    for name, tester in testers.items():
        spending_func = tester._get_spending_function()
        cumulative = [spending_func(t) for t in info_fracs]
        axes[0].plot(info_fracs, cumulative, label=name, color=colors[name], linewidth=2)

    axes[0].axhline(alpha, color='gray', linestyle='--', label=f'Total α = {alpha}')
    axes[0].set_xlabel('Information Fraction')
    axes[0].set_ylabel('Cumulative Alpha Spent')
    axes[0].set_title('Alpha Spending Functions')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    # Right: Critical values (boundaries)
    for name, tester in testers.items():
        plan = tester.create_plan()
        axes[1].plot(plan.information_fractions, plan.critical_values,
                    'o-', label=name, color=colors[name], linewidth=2, markersize=8)

    axes[1].axhline(stats.norm.ppf(1 - alpha/2), color='gray', linestyle='--',
                   label=f'Fixed Sample z = {stats.norm.ppf(1 - alpha/2):.2f}')
    axes[1].set_xlabel('Information Fraction')
    axes[1].set_ylabel('Critical Value (|Z|)')
    axes[1].set_title('Critical Values at Each Look')
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    plt.suptitle('Comparison of Sequential Testing Methods', fontsize=14, fontweight='bold')
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def main():
    """Demo sequential testing."""
    from simulator import ABTestSimulator

    print("=" * 60)
    print("SEQUENTIAL TESTING DEMO")
    print("=" * 60)

    # Generate data
    simulator = ABTestSimulator()
    df = simulator.generate_data()

    print(f"\nTotal sample size: {len(df):,}")
    print(f"Simulating {5} interim analyses...\n")

    # Test each spending function
    for func in SpendingFunction:
        print(f"\n{'=' * 50}")
        print(f"Spending Function: {func.value}")
        print("=" * 50)

        tester = SequentialTester(
            alpha=0.05,
            n_looks=5,
            spending_function=func
        )

        plan = tester.create_plan()

        print("\nPlanned boundaries:")
        for i in range(plan.n_looks):
            print(f"  Look {i+1}: info={plan.information_fractions[i]:.1%}, "
                  f"z_crit={plan.critical_values[i]:.3f}, "
                  f"α_cumulative={plan.cumulative_alpha[i]:.4f}")

        # Run sequential analysis
        results = tester.analyze_sequential(df)

        print("\n" + tester.get_summary())

    # Generate comparison plot
    print("\n" + "=" * 60)
    print("Generating comparison plot...")
    fig = compare_spending_functions(save_path='../figures/sequential_comparison.png')
    print("Saved: ../figures/sequential_comparison.png")
    plt.close(fig)


if __name__ == '__main__':
    main()
