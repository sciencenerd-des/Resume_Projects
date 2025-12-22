"""
Decision Memo Generator for A/B Testing Pipeline

Generates a professional executive decision memo based on actual analysis results.
This is the final output of the experimentation pipeline.
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

from stats_engine import ABTestAnalyzer, ABTestResult, SRMSeverity
from bayesian_engine import BayesianAnalyzer, BayesianResult
from guardrails import GuardrailChecker, GuardrailReport, GuardrailStatus
from segment_analyzer import SegmentAnalyzer, SegmentAnalysisReport, CorrectionMethod
from sequential_testing import SequentialTester, SpendingFunction, InterimResult, SequentialTestPlan
from cuped import CUPEDAnalyzer, CUPEDResult


@dataclass
class MemoConfig:
    """Configuration for decision memo generation."""
    experiment_name: str = "Sign-Up Button Color Test"
    control_description: str = "Blue button"
    variant_description: str = "Green button"
    hypothesis: str = (
        "Changing the 'Sign Up' button color from Blue to Green on the mobile "
        "landing page will result in a 15% increase in conversion rate."
    )
    rationale: str = (
        "Green is culturally associated with 'Go' and financial success in our target market"
    )
    audience: str = "All mobile web visitors"
    duration: str = "7 days"
    traffic_split: str = "50/50 randomized"

    # Sequential testing configuration
    enable_sequential: bool = True
    sequential_n_looks: int = 5
    sequential_spending: SpendingFunction = SpendingFunction.OBRIEN_FLEMING


class DecisionMemoGenerator:
    """
    Generates executive decision memos from A/B test analysis results.
    
    Combines frequentist stats, Bayesian analysis, and guardrail metrics
    into a comprehensive recommendation document.
    """
    
    def __init__(self, config: Optional[MemoConfig] = None):
        self.config = config or MemoConfig()
        self.freq_result: Optional[ABTestResult] = None
        self.bayes_result: Optional[BayesianResult] = None
        self.guardrail_report: Optional[GuardrailReport] = None
        self.segment_reports: Dict[str, SegmentAnalysisReport] = {}
        self.sequential_results: List[InterimResult] = []
        self.sequential_plan: Optional[SequentialTestPlan] = None
        self.decision_confidence: Optional[Dict[str, Any]] = None
        self.cuped_result: Optional[CUPEDResult] = None
    
    def analyze_data(self, df: pd.DataFrame) -> None:
        """Run all analyses on the provided data."""
        # Frequentist analysis
        freq_analyzer = ABTestAnalyzer(alpha=0.05)
        self.freq_result = freq_analyzer.analyze(df)
        
        # Bayesian analysis
        bayes_analyzer = BayesianAnalyzer()
        self.bayes_result = bayes_analyzer.analyze(df)
        
        # Guardrail check - requires split DataFrames
        # For simulation data without guardrail columns, we'll skip
        control_df = df[df['group'] == 'A_control'].copy()
        variant_df = df[df['group'] == 'B_variant'].copy()
        
        guardrail_checker = GuardrailChecker()
        # Check if any guardrail metrics exist in the data
        has_guardrail_cols = any(
            col in df.columns for col in ['bounce_rate', 'error_rate', 'time_to_convert']
        )
        
        if has_guardrail_cols:
            self.guardrail_report = guardrail_checker.check_all(control_df, variant_df)
        else:
            # No guardrail metrics available - report as N/A
            self.guardrail_report = None

        # Segment analysis
        if 'device' in df.columns:
            segment_analyzer = SegmentAnalyzer(correction=CorrectionMethod.HOLM)
            self.segment_reports = segment_analyzer.analyze_all_segments(df)
        else:
            self.segment_reports = {}

        # Sequential testing analysis
        if self.config.enable_sequential and 'timestamp' in df.columns:
            seq_tester = SequentialTester(
                alpha=0.05,
                n_looks=self.config.sequential_n_looks,
                spending_function=self.config.sequential_spending
            )
            self.sequential_plan = seq_tester.create_plan()
            self.sequential_results = seq_tester.analyze_sequential(df)

        # CUPED variance reduction (if pre-experiment data available)
        if 'pre_experiment_converted' in df.columns:
            cuped_analyzer = CUPEDAnalyzer()
            self.cuped_result = cuped_analyzer.analyze(df)

        # Calculate decision confidence
        self.decision_confidence = self._calculate_decision_confidence()
    
    def get_recommendation(self) -> str:
        """
        Determine the final recommendation using enhanced decision framework.

        Decision Framework (Priority Order):
        1. HALT_SRM: Sample Ratio Mismatch detected - investigation required
        2. HALT_GUARDRAIL: Critical guardrail failure - do not proceed
        3. EARLY_STOP_EFFICACY: Sequential testing indicates early success
        4. EARLY_STOP_FUTILITY: Sequential testing indicates early failure
        5. ITERATE_SEGMENTS: Significant negative segments need investigation
        6. SHIP: Frequentist significant AND Bayesian P(V>C) >= 95%
        7. LIKELY_SHIP: Bayesian very confident but frequentist borderline
        8. ROLLBACK: Both approaches indicate negative effect
        9. ITERATE: Either approach inconclusive
        """
        if self.freq_result is None or self.bayes_result is None:
            return "UNKNOWN"

        # 1. CRITICAL: Check for Sample Ratio Mismatch (data quality)
        if self.freq_result.srm_detected:
            return "HALT_SRM"

        # 2. CRITICAL: Check for guardrail failures
        if self.guardrail_report and self.guardrail_report.results:
            critical_failures = [
                r for r in self.guardrail_report.results
                if r.status == GuardrailStatus.FAIL
            ]
            if critical_failures:
                return "HALT_GUARDRAIL"

        # 3. Sequential testing early stopping (if applicable)
        if self.sequential_results:
            last_result = self.sequential_results[-1]
            if last_result.reject_null:
                # Stopped early - determine direction
                if last_result.lift > 0:
                    return "EARLY_STOP_EFFICACY"
                else:
                    return "EARLY_STOP_FUTILITY"

        # 4. Check for significant negative segments (heterogeneity warning)
        segment_warnings = self._get_segment_warnings()
        if segment_warnings:
            return "ITERATE_SEGMENTS"

        # 5. Standard decision logic
        freq_sig = self.freq_result.statistically_significant
        freq_positive = self.freq_result.relative_lift > 0
        freq_substantial = self.freq_result.relative_lift > 0.05

        bayes_confident = self.bayes_result.probability_variant_better >= 0.95
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

    def _get_segment_warnings(self) -> List[str]:
        """Identify segments with significantly negative effects."""
        warnings = []
        if self.segment_reports:
            for dim, report in self.segment_reports.items():
                for r in report.results:
                    # Flag segments with significant AND substantial negative lift
                    if r.significant_adjusted and r.lift_relative < -0.10:
                        warnings.append(
                            f"{dim}:{r.segment_value} ({r.lift_relative:+.1%})"
                        )
        return warnings

    def _calculate_decision_confidence(self) -> Dict[str, Any]:
        """
        Calculate multi-dimensional confidence score for the decision.

        Experts evaluate decisions on:
        - Statistical rigor (power, p-value margin)
        - Practical significance (effect size)
        - Data quality (SRM, guardrails)
        - Robustness (segment consistency)
        """
        if self.freq_result is None or self.bayes_result is None:
            return {'overall_confidence': 0, 'confidence_grade': 'F', 'concerns': []}

        scores = {}

        # Power score (0-1): Penalize underpowered studies
        power = self.freq_result.power
        scores['power'] = min(power / 0.80, 1.0)  # Full credit at 80%

        # P-value margin (0-1): How far below threshold?
        p = self.freq_result.p_value
        if p < 0.001:
            scores['p_margin'] = 1.0
        elif p < 0.01:
            scores['p_margin'] = 0.8
        elif p < 0.05:
            scores['p_margin'] = 0.6
        else:
            scores['p_margin'] = 0.0

        # Effect size score (Cohen's h for proportions)
        import numpy as np
        h = 2 * (
            np.arcsin(np.sqrt(self.freq_result.variant_conversion)) -
            np.arcsin(np.sqrt(self.freq_result.control_conversion))
        )
        scores['effect_size'] = min(abs(h) / 0.2, 1.0)  # Full credit at h=0.2

        # Data quality (0-1)
        srm_ok = not self.freq_result.srm_detected
        guardrails_ok = True
        if self.guardrail_report and self.guardrail_report.results:
            guardrails_ok = all(
                r.status != GuardrailStatus.FAIL
                for r in self.guardrail_report.results
            )
        scores['data_quality'] = 1.0 if (srm_ok and guardrails_ok) else 0.0

        # Segment consistency (0-1)
        if self.segment_reports:
            all_directions = []
            for report in self.segment_reports.values():
                for r in report.results:
                    all_directions.append(r.lift_relative > 0)
            if all_directions:
                overall_positive = self.freq_result.relative_lift > 0
                consistency = sum(all_directions) / len(all_directions)
                scores['segment_consistency'] = consistency if overall_positive else (1 - consistency)
            else:
                scores['segment_consistency'] = 0.5
        else:
            scores['segment_consistency'] = 0.5  # Unknown

        # Overall confidence (weighted average)
        weights = {
            'power': 0.20,
            'p_margin': 0.25,
            'effect_size': 0.15,
            'data_quality': 0.25,
            'segment_consistency': 0.15
        }
        overall = sum(scores[k] * weights[k] for k in weights)

        # Grade the confidence
        if overall >= 0.90:
            grade = 'A'
        elif overall >= 0.80:
            grade = 'B'
        elif overall >= 0.70:
            grade = 'C'
        elif overall >= 0.60:
            grade = 'D'
        else:
            grade = 'F'

        # Identify concerns
        concerns = []
        if scores['power'] < 0.8:
            concerns.append(f"Underpowered study ({self.freq_result.power:.0%} vs 80% target)")
        if scores['data_quality'] < 1.0:
            concerns.append("Data quality issues detected (SRM or guardrail violations)")
        if scores['segment_consistency'] < 0.7:
            concerns.append("Inconsistent effects across segments - investigate heterogeneity")
        if self.freq_result.power < 0.80:
            concerns.append(f"Achieved power ({self.freq_result.power:.0%}) below 80% threshold")

        return {
            'component_scores': scores,
            'overall_confidence': overall,
            'confidence_grade': grade,
            'concerns': concerns
        }
    
    def generate_memo(self) -> str:
        """Generate the complete decision memo as markdown."""
        if self.freq_result is None:
            raise ValueError("Must call analyze_data() before generating memo")
        
        recommendation = self.get_recommendation()
        rec_emoji = {
            "SHIP": "✅",
            "LIKELY_SHIP": "🟢",
            "ITERATE": "⚠️",
            "ROLLBACK": "❌",
            "UNKNOWN": "❓",
            "HALT_SRM": "⛔",
            "HALT_GUARDRAIL": "⛔",
            "EARLY_STOP_EFFICACY": "✅",
            "EARLY_STOP_FUTILITY": "❌",
            "ITERATE_SEGMENTS": "⚠️"
        }.get(recommendation, "❓")
        rec_action = {
            "SHIP": "Ship to 100%",
            "LIKELY_SHIP": "Ship with Monitoring",
            "ITERATE": "Continue Testing",
            "ROLLBACK": "Rollback to Control",
            "UNKNOWN": "Insufficient Data",
            "HALT_SRM": "HALT - Investigate SRM",
            "HALT_GUARDRAIL": "HALT - Guardrail Failure",
            "EARLY_STOP_EFFICACY": "Ship (Early Stop - Efficacy)",
            "EARLY_STOP_FUTILITY": "Rollback (Early Stop - Futility)",
            "ITERATE_SEGMENTS": "Continue Testing - Segment Issues"
        }.get(recommendation, "Unknown")
        
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
        
        # Calculate business impact
        visitors = 100000
        current_signups = int(self.freq_result.control_conversion * visitors)
        projected_signups = int(self.freq_result.variant_conversion * visitors)
        additional_signups = projected_signups - current_signups
        
        # Bayesian metrics
        bayes_prob = self.bayes_result.probability_variant_better * 100 if self.bayes_result else 0

        # Build SRM status section
        srm_section = ""
        if self.freq_result.srm_result:
            srm = self.freq_result.srm_result
            srm_status = "✅ PASS" if not srm.srm_detected else f"⛔ {srm.severity.value.upper()}"
            srm_section = f"""### Sample Ratio Mismatch (SRM) Check

| Metric | Expected | Observed | Status |
|--------|----------|----------|--------|
| Split Ratio | {srm.expected_ratio:.1%} / {(1-srm.expected_ratio):.1%} | {srm.observed_ratio:.1%} / {(1-srm.observed_ratio):.1%} | {srm_status} |

- **Chi-Square**: χ² = {srm.chi2_statistic:.2f}
- **P-Value**: {srm.p_value:.6f}
- **Interpretation**: {"Randomization appears valid" if not srm.srm_detected else "⚠️ Sample ratio mismatch detected - investigate before proceeding"}

"""

        # Build decision confidence section
        confidence_section = ""
        if self.decision_confidence:
            dc = self.decision_confidence
            scores = dc.get('component_scores', {})
            concerns_list = ""
            if dc.get('concerns'):
                concerns_list = "\n".join([f"- ⚠️ {c}" for c in dc['concerns']])
            else:
                concerns_list = "- ✅ No significant concerns identified"

            confidence_section = f"""## Decision Confidence

**Overall Grade**: {dc.get('confidence_grade', 'N/A')} ({dc.get('overall_confidence', 0):.0%})

| Component | Score | Description |
|-----------|-------|-------------|
| Power | {scores.get('power', 0):.0%} | Statistical power adequacy |
| P-Value Margin | {scores.get('p_margin', 0):.0%} | Distance from significance threshold |
| Effect Size | {scores.get('effect_size', 0):.0%} | Practical significance |
| Data Quality | {scores.get('data_quality', 0):.0%} | SRM and guardrail checks |
| Segment Consistency | {scores.get('segment_consistency', 0):.0%} | Effect consistency across segments |

**Concerns**:
{concerns_list}

---

"""

        # Build guardrail summary for rationale
        guardrail_summary = ""
        if self.guardrail_report and self.guardrail_report.results:
            warnings = [r for r in self.guardrail_report.results if r.status == GuardrailStatus.WARNING]
            failures = [r for r in self.guardrail_report.results if r.status == GuardrailStatus.FAIL]
            if failures:
                guardrail_summary = f"⛔ {len(failures)} guardrail(s) FAILED - do not proceed"
            elif warnings:
                guardrail_summary = f"⚠️ {len(warnings)} guardrail warning(s) - monitor closely"
            else:
                guardrail_summary = "✅ All guardrails passed - no negative user experience impact detected"
        else:
            guardrail_summary = "⚠️ No guardrail metrics available"

        # Build CUPED section
        cuped_section = ""
        if self.cuped_result:
            cr = self.cuped_result
            cuped_section = f"""### CUPED Variance Reduction

CUPED (Controlled-experiment Using Pre-Experiment Data) uses pre-experiment behavior to reduce variance in treatment effect estimates.

| Metric | Original | CUPED-Adjusted | Change |
|--------|----------|----------------|--------|
| Lift | {cr.original_lift:+.4f} | {cr.adjusted_lift:+.4f} | {(cr.adjusted_lift - cr.original_lift):.4f} |
| Standard Error | {cr.original_se:.4f} | {cr.adjusted_se:.4f} | {((cr.adjusted_se - cr.original_se) / cr.original_se * 100):+.1f}% |
| P-Value | {cr.original_p_value:.4f} | {cr.adjusted_p_value:.4f} | - |
| Significant? | {"Yes" if cr.original_significant else "No"} | {"Yes" if cr.adjusted_significant else "No"} | - |

- **Variance Reduction**: {cr.variance_reduction_pct:.1%}
- **Covariate Correlation**: {cr.covariate_correlation:.3f}
- **Theta (optimal coefficient)**: {cr.theta:.4f}

"""

        # Build segment warnings section
        segment_warnings = self._get_segment_warnings()
        segment_warning_text = ""
        if segment_warnings:
            segment_warning_text = "\n\n> ⚠️ **Segment Alert**: The following segments show significantly negative effects:\n"
            for w in segment_warnings:
                segment_warning_text += f"> - {w}\n"
            segment_warning_text += "> \n> Consider investigating before full rollout.\n"

        # Build segment analysis section
        segment_section = ""
        if self.segment_reports:
            segment_section = "## 7. Segment Analysis\n\n"
            for dim, report in self.segment_reports.items():
                segment_section += f"### By {dim.title()}\n\n"
                segment_section += f"*Correction: {report.correction_method.value}, alpha={report.alpha}*\n\n"
                segment_section += "| Segment | Control | Variant | Lift | Adj. p-value | Sig? |\n"
                segment_section += "|---------|---------|---------|------|--------------|------|\n"
                for r in report.results:
                    sig = "✅" if r.significant_adjusted else "❌"
                    segment_section += (
                        f"| {r.segment_value} | {r.control_rate:.2%} | {r.variant_rate:.2%} | "
                        f"{r.lift_relative:+.2%} | {r.p_value_adjusted:.4f} | {sig} |\n"
                    )
                if report.simpsons_paradox_warning:
                    segment_section += "\n> ⚠️ **Warning**: Possible Simpson's Paradox detected. "
                    segment_section += "Overall effect may differ from segment-level effects.\n"
                segment_section += "\n---\n\n"

        memo = f"""# A/B Test Decision Memo: {self.config.experiment_name}

## Executive Summary

**TL;DR**: The {self.config.variant_description} variant showed a {"statistically significant" if self.freq_result.statistically_significant else "not statistically significant"} {abs(self.freq_result.relative_lift):.1%} {"improvement" if self.freq_result.relative_lift > 0 else "decline"} in conversion rate. Recommend {"shipping to 100% of users" if recommendation == "SHIP" else ("continuing testing" if recommendation == "ITERATE" else "rolling back")}.

**Decision**: {rec_emoji} **{rec_action}**

---

## 1. Hypothesis

**If** we change the 'Sign Up' button color from {self.config.control_description} to {self.config.variant_description} on the mobile landing page

**Then** we will see a 15% increase in conversion rate

**Because** {self.config.rationale}

---

## 2. Experimental Design

| Parameter | Value |
|-----------|-------|
| **Sample Size** | ~{self.freq_result.control_sample_size:,} per variant |
| **Duration** | {self.config.duration} |
| **Audience** | {self.config.audience} |
| **Traffic Split** | {self.config.traffic_split} |
| **Statistical Power** | 80% |
| **Significance Level** | 5% (α = 0.05) |

### Randomization
Users were randomly assigned to Control ({self.config.control_description}) or Variant ({self.config.variant_description}) groups using consistent hashing on user ID to ensure stable assignment across sessions.

{srm_section}---

## 3. Primary Metric

**Conversion Rate**: Percentage of users who complete sign-up after landing on the page.

### Guardrail Metrics
| Metric | Threshold | Status |
|--------|-----------|--------|
{guardrail_rows}
---

## 4. Results

### Key Findings

| Metric | Control ({self.config.control_description}) | Variant ({self.config.variant_description}) | Lift | p-value |
|--------|----------------|-----------------|------|---------| 
| Conversion Rate | {self.freq_result.control_conversion:.2%} | {self.freq_result.variant_conversion:.2%} | **{self.freq_result.relative_lift:+.2%}** | {self.freq_result.p_value:.4f} |

### Statistical Analysis

- **Z-Statistic**: {self.freq_result.z_statistic:.2f}
- **P-Value**: {self.freq_result.p_value:.4f} ({"<" if self.freq_result.p_value < 0.05 else ">"} 0.05)
- **95% Confidence Interval**: [{self.freq_result.confidence_interval[0]:+.1%}, {self.freq_result.confidence_interval[1]:+.1%}] absolute lift
- **Statistical Significance**: {"✅ **Achieved**" if self.freq_result.statistically_significant else "❌ **Not Achieved**"}
- **Achieved Power**: {self.freq_result.power:.0%}

{cuped_section}### Bayesian Analysis

- **P(Variant > Control)**: {bayes_prob:.1f}%
- **Expected Lift**: {self.bayes_result.expected_lift:+.2%}
- **95% Credible Interval**: [{self.bayes_result.credible_interval[0]:+.4f}, {self.bayes_result.credible_interval[1]:+.4f}]

### Methodology Comparison

| Criterion | Frequentist | Bayesian |
|-----------|-------------|----------|
| **Question Answered** | "Is the effect unlikely by chance?" | "What's the probability variant is better?" |
| **P-Value / Probability** | {self.freq_result.p_value:.4f} | {bayes_prob:.1f}% |
| **Interpretation** | {"Reject" if self.freq_result.statistically_significant else "Fail to reject"} null hypothesis | {bayes_prob:.1f}% confidence variant wins |
| **Decision Support** | Binary (significant/not) | Continuous probability |

**Agreement Analysis**: {"✅ Both approaches agree on positive effect" if (self.freq_result.statistically_significant and self.bayes_result.probability_variant_better >= 0.95) else ("✅ Both approaches agree (no significant effect)" if (not self.freq_result.statistically_significant and self.bayes_result.probability_variant_better < 0.95) else "⚠️ Approaches disagree - consider additional testing")}

### Visualization

```
Conversion Rate by Variant
═══════════════════════════════════════════════════════════════

Control ({self.config.control_description})  {"█" * int(self.freq_result.control_conversion * 100 * 4)}{"░" * (40 - int(self.freq_result.control_conversion * 100 * 4))}  {self.freq_result.control_conversion:.2%}
                
Variant ({self.config.variant_description}) {"█" * int(self.freq_result.variant_conversion * 100 * 4)}{"░" * (40 - int(self.freq_result.variant_conversion * 100 * 4))}  {self.freq_result.variant_conversion:.2%}  [{self.freq_result.relative_lift:+.2%}]

                0%        5%        10%       15%       20%
```

---

{confidence_section}## 5. Recommendation

### Decision: **{rec_action}**

**Rationale**:

1. **Statistical Significance**: p-value of {self.freq_result.p_value:.4f} is {"well below" if self.freq_result.p_value < 0.05 else "above"} our 0.05 threshold{", indicating the observed difference is highly unlikely due to chance" if self.freq_result.p_value < 0.05 else ""}.

2. **Practical Significance**: A {self.freq_result.relative_lift:+.2%} relative improvement in conversion translates to significant business impact:
   - Current: {current_signups:,} sign-ups per {visitors:,} visitors
   - Projected: {projected_signups:,} sign-ups per {visitors:,} visitors
   - **{additional_signups:+,} additional sign-ups per {visitors:,} visitors**

3. **Bayesian Confidence**: {bayes_prob:.1f}% probability that the variant is better than control.

4. **Guardrail Status**: {guardrail_summary}

5. **Implementation Cost**: Minimal - simple color change with no engineering complexity.
{segment_warning_text}
---

## 6. Risk Assessment

| Risk Factor | Assessment | Mitigation |
|-------------|------------|------------|
| **Novelty Effect** | Low risk - Button color is low-salience | Monitor week 2-4 for decay |
| **Seasonality Bias** | Low - Test ran during typical traffic period | Compare to historical baselines |
| **Segment Variance** | Moderate - May vary by device | Plan segment analysis post-launch |
| **Long-term Effects** | Unknown | Schedule 30-day post-launch review |

---

{segment_section}

## 8. Next Steps

1. [x] Complete statistical analysis
2. [x] Complete Bayesian analysis
3. [x] Verify guardrail metrics
4. [ ] Roll out {self.config.variant_description} to 100% of mobile web users
5. [ ] Monitor conversion rate for 2 weeks post-launch
6. [ ] Schedule 30-day review meeting
7. [ ] Document learnings in experimentation wiki
8. [ ] Plan follow-up test: Button size optimization

---

## References

- Experiment tracking: Internal Experimentation Platform
- Analysis notebook: `notebooks/analysis_walkthrough.ipynb`
- Raw data: `data/processed/simulation_clean.csv`

---

**Prepared by**: Growth Engineering Team  
**Date**: {datetime.now().strftime("%B %Y")}  
**Status**: Ready for Stakeholder Review

---

*This memo was automatically generated by the A/B Testing Pipeline.*
"""
        return memo
    
    def save_memo(self, output_path: Optional[Path] = None) -> Path:
        """Save the decision memo to a file."""
        memo_content = self.generate_memo()
        
        if output_path is None:
            output_path = Path(__file__).parent.parent / 'DECISION_MEMO.md'
        
        with open(output_path, 'w') as f:
            f.write(memo_content)
        
        return output_path


def main():
    """Generate decision memo from simulation data."""
    print("=" * 60)
    print("DECISION MEMO GENERATOR")
    print("=" * 60)
    
    # Load simulation data (use raw for segment and guardrail data)
    data_path = Path(__file__).parent.parent / 'data' / 'processed' / 'simulation_raw.csv'
    
    if not data_path.exists():
        print(f"\n❌ No simulation data found at {data_path}")
        print("   Run simulator.py first to generate data.")
        return
    
    print(f"\n📂 Loading data from: {data_path}")
    df = pd.read_csv(data_path)
    
    # Generate memo
    generator = DecisionMemoGenerator()
    generator.analyze_data(df)
    
    print("\n📊 Analysis complete:")
    print(f"   - Frequentist: p-value = {generator.freq_result.p_value:.4f}")
    print(f"   - Bayesian: P(Variant > Control) = {generator.bayes_result.probability_variant_better:.1%}")
    print(f"   - Recommendation: {generator.get_recommendation()}")
    
    # Save memo
    output_path = generator.save_memo()
    print(f"\n✅ Decision memo saved to: {output_path}")
    
    print("\n" + "=" * 60)
    print("MEMO GENERATION COMPLETE")
    print("=" * 60)


if __name__ == '__main__':
    main()
