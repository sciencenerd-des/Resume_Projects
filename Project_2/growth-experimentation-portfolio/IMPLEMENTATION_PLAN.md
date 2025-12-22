# Implementation Plan: Expert-Level A/B Testing Framework Enhancements

## Overview

This plan addresses 6 critical gaps identified during expert critique of the A/B testing framework:

| Issue | Severity | Module | Status |
|-------|----------|--------|--------|
| No SRM Check | High | stats_engine.py | To implement |
| No CUPED Variance Reduction | Medium | simulator.py, stats_engine.py | To implement |
| No Interaction Tests | Medium | segment_analyzer.py | To implement |
| Sequential Testing Not Integrated | High | memo_generator.py | To implement |
| Guardrails Don't Block Decisions | High | memo_generator.py | To implement |
| No Decision Confidence Metrics | Medium | memo_generator.py | To implement |

---

## Phase 1: Sample Ratio Mismatch (SRM) Check

**File**: `src/stats_engine.py`

### Implementation

Add SRM validation using existing `chi_square_test` pattern:

```python
def check_srm(
    self,
    control_n: int,
    variant_n: int,
    expected_ratio: float = 0.5,
    threshold: float = 0.001
) -> Dict[str, Any]:
    """
    Check for Sample Ratio Mismatch using chi-square test.

    SRM indicates randomization failure (critical data quality issue).
    Uses stricter threshold (0.001) than effect tests (0.05).
    """
    total = control_n + variant_n
    expected_control = total * expected_ratio
    expected_variant = total * (1 - expected_ratio)

    chi2, p_value = stats.chisquare(
        [control_n, variant_n],
        [expected_control, expected_variant]
    )

    return {
        'control_n': control_n,
        'variant_n': variant_n,
        'expected_ratio': expected_ratio,
        'observed_ratio': control_n / total,
        'chi2_statistic': chi2,
        'p_value': p_value,
        'srm_detected': p_value < threshold,
        'severity': 'CRITICAL' if p_value < 0.0001 else ('WARNING' if p_value < threshold else 'OK')
    }
```

### Integration Points

1. Add `SRMResult` dataclass to `stats_engine.py`
2. Call `check_srm()` in `ABTestAnalyzer.analyze()` before main analysis
3. Add SRM field to `ABTestResult` dataclass
4. Update `memo_generator.py` to display SRM status and BLOCK if detected

---

## Phase 2: CUPED Variance Reduction

**Files**: `src/simulator.py`, `src/stats_engine.py`

### Step 2a: Add Pre-Experiment Covariates to Simulator

```python
# In ExperimentConfig dataclass, add:
pre_experiment_days: int = 14
pre_experiment_conversion_correlation: float = 0.6

# In ABTestSimulator.generate_data(), add:
def _generate_pre_experiment_data(self, n_users: int) -> np.ndarray:
    """Generate correlated pre-experiment conversion indicator."""
    # Generate pre-experiment conversions correlated with experiment conversions
    noise = np.random.normal(0, 1, n_users)
    pre_exp = self.config.pre_experiment_conversion_correlation * experiment_propensity + \
              np.sqrt(1 - self.config.pre_experiment_conversion_correlation**2) * noise
    return (pre_exp > np.percentile(pre_exp, 100 * (1 - self.config.control_conversion))).astype(int)
```

### Step 2b: Implement CUPED Estimator

```python
# New file: src/cuped.py
def cuped_adjustment(
    y: np.ndarray,          # Experiment outcomes
    x: np.ndarray,          # Pre-experiment covariate
    treatment: np.ndarray   # Treatment indicator (0/1)
) -> Tuple[float, float, float]:
    """
    CUPED: Controlled-experiment Using Pre-Experiment Data.

    Returns:
        adjusted_lift: Variance-reduced treatment effect estimate
        adjusted_se: Reduced standard error
        variance_reduction: Fraction of variance removed
    """
    # Calculate theta (optimal coefficient)
    theta = np.cov(y, x)[0, 1] / np.var(x)

    # Adjusted outcomes
    y_adj = y - theta * (x - np.mean(x))

    # Calculate adjusted treatment effect
    control_adj = y_adj[treatment == 0].mean()
    variant_adj = y_adj[treatment == 1].mean()
    adjusted_lift = variant_adj - control_adj

    # Variance reduction
    original_var = np.var(y)
    adjusted_var = np.var(y_adj)
    variance_reduction = 1 - (adjusted_var / original_var)

    return adjusted_lift, np.sqrt(adjusted_var), variance_reduction
```

---

## Phase 3: Treatment × Segment Interaction Tests

**File**: `src/segment_analyzer.py`

### Implementation

```python
def test_interaction(
    self,
    df: pd.DataFrame,
    segment_col: str,
    group_col: str = 'group',
    outcome_col: str = 'converted'
) -> Dict[str, Any]:
    """
    Test if treatment effect varies significantly across segments.

    Uses logistic regression: outcome ~ treatment + segment + treatment:segment
    Significant interaction term indicates heterogeneous treatment effects.
    """
    from statsmodels.formula.api import logit

    # Prepare data
    df_model = df.copy()
    df_model['treatment'] = (df_model[group_col] == 'B_variant').astype(int)
    df_model['segment'] = pd.Categorical(df_model[segment_col])

    # Fit model with interaction
    formula = f"{outcome_col} ~ treatment * C({segment_col})"
    model = logit(formula, data=df_model).fit(disp=0)

    # Extract interaction p-values
    interaction_terms = [t for t in model.pvalues.index if ':' in t]
    interaction_pvalues = model.pvalues[interaction_terms]

    # Joint test for all interaction terms
    from scipy import stats
    _, joint_p = stats.combine_pvalues(interaction_pvalues, method='fisher')

    return {
        'segment_dimension': segment_col,
        'interaction_significant': joint_p < 0.05,
        'joint_p_value': joint_p,
        'individual_interactions': dict(zip(interaction_terms, interaction_pvalues)),
        'heterogeneity_warning': joint_p < 0.10
    }
```

### Integration

Add to `SegmentAnalysisReport`:
```python
interaction_test_result: Optional[Dict[str, Any]] = None
```

---

## Phase 4: Sequential Testing Integration

**File**: `src/memo_generator.py`

### Changes to `analyze_data()`

```python
def analyze_data(self, df: pd.DataFrame) -> None:
    """Run all analyses including sequential testing."""
    # ... existing analyses ...

    # Sequential testing (if interim analysis requested)
    if self.config.interim_analysis:
        from sequential_testing import SequentialTester
        seq_tester = SequentialTester(
            alpha=0.05,
            power=0.80,
            spending_function='obrien_fleming'
        )

        # Create plan based on expected total sample
        self.seq_plan = seq_tester.create_plan(
            n_total=self.config.expected_total_sample,
            n_looks=self.config.planned_looks
        )

        # Analyze at current sample
        current_n = len(df)
        self.seq_result = seq_tester.analyze_interim(
            df=df,
            plan=self.seq_plan,
            current_n=current_n
        )
```

### Changes to `get_recommendation()`

```python
def get_recommendation(self) -> str:
    """Enhanced decision framework with sequential stopping rules."""

    # 1. SRM Check (BLOCKING)
    if self.freq_result.srm_detected:
        return "HALT_SRM"

    # 2. Guardrail Check (BLOCKING for FAIL status)
    if self.guardrail_report:
        critical_failures = [r for r in self.guardrail_report.results
                           if r.status == GuardrailStatus.FAIL]
        if critical_failures:
            return "HALT_GUARDRAIL"

    # 3. Sequential Stopping (if applicable)
    if hasattr(self, 'seq_result') and self.seq_result:
        if self.seq_result.decision == 'stop_efficacy':
            return "SHIP"  # Early stop for efficacy
        elif self.seq_result.decision == 'stop_futility':
            return "ROLLBACK"  # Early stop for futility
        elif self.seq_result.decision == 'continue':
            return "CONTINUE_TESTING"

    # 4. Segment Heterogeneity Warning
    segment_warnings = []
    if hasattr(self, 'segment_reports'):
        for dim, report in self.segment_reports.items():
            negative_significant = [r for r in report.results
                                   if r.significant_adjusted and r.lift_relative < -0.10]
            if negative_significant:
                segment_warnings.extend(negative_significant)

    if segment_warnings:
        return "ITERATE_SEGMENTS"  # Significant negative segments need investigation

    # 5. Standard Decision Logic
    freq_sig = self.freq_result.statistically_significant
    freq_positive = self.freq_result.relative_lift > 0
    freq_substantial = self.freq_result.relative_lift > 0.05
    bayes_confident = self.bayes_result.probability_variant_better >= 0.95

    if freq_sig and freq_substantial and bayes_confident:
        return "SHIP"
    elif freq_sig and not freq_positive:
        return "ROLLBACK"
    elif bayes_confident and freq_positive:
        return "LIKELY_SHIP"
    else:
        return "ITERATE"
```

---

## Phase 5: Decision Confidence Metrics

**File**: `src/memo_generator.py`

### Add Confidence Summary

```python
def calculate_decision_confidence(self) -> Dict[str, Any]:
    """
    Calculate multi-dimensional confidence score for the decision.

    Experts evaluate decisions on:
    - Statistical rigor (power, p-value margin)
    - Practical significance (effect size)
    - Data quality (SRM, guardrails)
    - Robustness (segment consistency)
    """
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

    # Effect size (0-1): Cohen's h
    h = self._calculate_cohens_h()
    scores['effect_size'] = min(h / 0.2, 1.0)  # Full credit at h=0.2 (small effect)

    # Data quality (0-1)
    srm_ok = not getattr(self.freq_result, 'srm_detected', False)
    guardrails_ok = all(r.status != GuardrailStatus.FAIL
                       for r in self.guardrail_report.results) if self.guardrail_report else True
    scores['data_quality'] = 1.0 if (srm_ok and guardrails_ok) else 0.0

    # Segment consistency (0-1)
    if hasattr(self, 'segment_reports') and self.segment_reports:
        all_directions = []
        for report in self.segment_reports.values():
            for r in report.results:
                all_directions.append(r.lift_relative > 0)
        consistency = sum(all_directions) / len(all_directions) if all_directions else 1.0
        # Penalize if not all segments agree with overall direction
        overall_positive = self.freq_result.relative_lift > 0
        scores['segment_consistency'] = consistency if overall_positive else (1 - consistency)
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

    return {
        'component_scores': scores,
        'overall_confidence': overall,
        'confidence_grade': self._grade_confidence(overall),
        'concerns': self._identify_concerns(scores)
    }

def _grade_confidence(self, score: float) -> str:
    if score >= 0.90: return 'A'
    elif score >= 0.80: return 'B'
    elif score >= 0.70: return 'C'
    elif score >= 0.60: return 'D'
    else: return 'F'

def _identify_concerns(self, scores: Dict[str, float]) -> List[str]:
    concerns = []
    if scores['power'] < 0.8:
        concerns.append(f"Underpowered study ({scores['power']*100:.0f}% vs 80% target)")
    if scores['data_quality'] < 1.0:
        concerns.append("Data quality issues detected (SRM or guardrail violations)")
    if scores['segment_consistency'] < 0.7:
        concerns.append("Inconsistent effects across segments - investigate heterogeneity")
    return concerns
```

---

## Phase 6: Memo Template Updates

Update memo template to include:

1. **SRM Status** section after Experimental Design
2. **Decision Confidence** section with component scores
3. **Segment Warnings** highlighted if heterogeneity detected
4. **Sequential Analysis** section if interim analysis performed
5. **Guardrail Impact** - change "No Guardrail Violations" to dynamic text based on actual results

---

## Implementation Order

| Priority | Phase | Files | Risk | Value |
|----------|-------|-------|------|-------|
| 1 | SRM Check | stats_engine.py | Low | High |
| 2 | Sequential Integration | memo_generator.py | Medium | High |
| 3 | Decision Confidence | memo_generator.py | Low | Medium |
| 4 | Interaction Tests | segment_analyzer.py | Medium | Medium |
| 5 | CUPED | simulator.py, stats_engine.py, cuped.py | High | Medium |

---

## Success Criteria

After implementation, the framework should:

- [ ] Detect and BLOCK on SRM violations
- [ ] Calculate CUPED-adjusted treatment effects (when pre-experiment data available)
- [ ] Test and warn on significant Treatment × Segment interactions
- [ ] Integrate sequential stopping rules into recommendations
- [ ] Display decision confidence grade with component breakdown
- [ ] Surface tablet -22% regression in warnings (current gap)
- [ ] Fix guardrail contradiction (dynamic text vs hardcoded)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/stats_engine.py` | Add `check_srm()`, `SRMResult` dataclass, update `ABTestResult` |
| `src/segment_analyzer.py` | Add `test_interaction()`, update `SegmentAnalysisReport` |
| `src/memo_generator.py` | Update `get_recommendation()`, add `calculate_decision_confidence()`, integrate sequential testing |
| `src/simulator.py` | Add pre-experiment covariate generation |
| `src/cuped.py` | New file for CUPED variance reduction |

---

*Generated from expert critique analysis of the A/B Testing Framework*
