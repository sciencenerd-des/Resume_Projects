# Research Report: Project 2 – The Experimentation Engine
## A/B Testing & Scientific Decision Frameworks for Growth Engineering

---

**Date**: 2024-12-19  
**Project**: Growth Lead Portfolio – Experimentation Repository  
**Status**: Research Complete  
**Repository**: project_profile

---

## Executive Summary

This research report documents the technical foundation, best practices, and implementation strategy for **Project 2: The Experimentation Engine** – a rigorous A/B testing portfolio piece designed to demonstrate scientific methodology and data-driven decision-making capabilities for Growth Engineering roles.

The project aims to prove that the candidate follows a scientific process minimizing Type I and Type II errors, ensuring business decisions are founded on statistical reality rather than intuition.

---

## 1. Project Overview

### 1.1 Strategic Purpose

Project 2 addresses the critical gap in growth candidate portfolios: **Scientific Rigor**. According to the project constitution:

> *"The Experimentation Repo proves that the candidate is not merely 'trying things' but following a scientific process that minimizes type I and type II errors, ensuring that business decisions are founded on statistical reality."*

### 1.2 Proposed Repository Architecture

```
/growth-experimentation-portfolio
├── /data
│   ├── simulation_raw.csv
│   └── simulation_clean.csv
├── /src
│   ├── simulator.py
│   └── stats_engine.py
├── /notebooks
│   └── analysis_walkthrough.ipynb
├── README.md
└── DECISION_MEMO.md
```

### 1.3 Current Assets

The project currently has existing test data in `Project_2/AB Testing/`:

| File | Records | Description |
|------|---------|-------------|
| `control_group.csv` | 30 days | Control campaign metrics (Aug 2019) |
| `test_group.csv` | 30 days | Test campaign metrics (Aug 2019) |

**Data Schema:**
- Campaign Name, Date, Spend [USD]
- # of Impressions, Reach
- # of Website Clicks, # of Searches
- # of View Content, # of Add to Cart, # of Purchase

---

## 2. Statistical Foundations

### 2.1 Key Statistical Concepts

#### Type I Error (False Positive)
- **Definition**: Concluding a difference exists when it does not
- **Industry Standard**: α = 0.05 (5% risk threshold)
- **Implication**: 5% chance of incorrectly rejecting null hypothesis

#### Type II Error (False Negative)
- **Definition**: Missing a real effect that actually exists
- **Mitigation**: Statistical power (1-β), typically set to 80%
- **Implication**: 80% chance of detecting a true difference

#### Statistical Power Analysis

Power analysis determines the necessary sample size for an A/B test given:

| Parameter | Standard Value | Description |
|-----------|----------------|-------------|
| α (Alpha) | 0.05 | Significance level |
| 1-β (Power) | 0.80 | Probability of detecting true effect |
| MDE | 2-5% relative | Minimum Detectable Effect |
| BCR | Varies | Baseline Conversion Rate |

### 2.2 Sample Size Calculation Formula

For proportion-based tests (conversion rates):

```
n = 2 × [(Zα/2 + Zβ)² × p(1-p)] / (p₁ - p₀)²
```

Where:
- `Zα/2` = 1.96 for 95% confidence
- `Zβ` = 0.84 for 80% power
- `p` = pooled conversion rate
- `p₁ - p₀` = MDE (absolute difference)

### 2.3 Test Duration Guidelines

| Factor | Recommendation | Rationale |
|--------|----------------|-----------|
| Minimum Duration | 2-4 weeks | Capture weekly cycles |
| Business Cycles | Include full cycle | Account for seasonality |
| Sample Size | Pre-calculated | Avoid "peeking" bias |
| External Factors | Document | Marketing campaigns, holidays |

---

## 3. Hypothesis Framework

### 3.1 Hypothesis Structure

The project constitution specifies a hypothesis format based on the button color experiment:

**If-Then-Because Format:**
> *"We believe that [change] will result in [outcome] because [rationale]."*

**Example Hypothesis:**
> *"We believe that changing the 'Sign Up' button color from Blue to Green on the mobile landing page will result in a 15% increase in conversion rate because Green is culturally associated with 'Go' and financial success in the local context."*

### 3.2 Hypothesis Components

| Component | Description | Example |
|-----------|-------------|---------|
| **Variable** | What is being changed | Button color (Blue → Green) |
| **Context** | Where the change applies | Mobile landing page |
| **Metric** | Primary success measure | Conversion rate |
| **MDE** | Expected effect size | 15% relative lift |
| **Rationale** | Why this should work | Cultural color associations |

### 3.3 Prioritization Frameworks

| Framework | Criteria | Best For |
|-----------|----------|----------|
| **ICE** | Impact, Confidence, Ease | Quick prioritization |
| **RICE** | Reach, Impact, Confidence, Effort | Feature experiments |
| **PIE** | Potential, Importance, Ease | CRO experiments |

---

## 4. Implementation Guide

### 4.1 Power Analysis in Python

```python
import numpy as np
from statsmodels.stats.power import GofChisquarePower

# Power Analysis Setup
effect_size = 0.05  # Expected effect size
power_analysis = GofChisquarePower()

# Calculate required sample size
sample_size = power_analysis.solve_power(
    effect_size=effect_size, 
    nobs=None, 
    alpha=0.05, 
    power=0.8
)
n_per_variant = int(np.ceil(sample_size))
print(f"Required sample per variant: {n_per_variant}")
```

### 4.2 Data Simulation Script

```python
import numpy as np
import pandas as pd

# Configuration
baseline_conversion = 0.08  # 8% baseline
lift_percentage = 0.15       # 15% relative lift
target_conversion = baseline_conversion * (1 + lift_percentage)  # 9.2%

# Control Group (Baseline 8%)
control_conversions = np.random.binomial(
    n=1, 
    p=baseline_conversion, 
    size=n_per_variant
)

# Variant Group (Lift to ~9.2%)
variant_conversions = np.random.binomial(
    n=1, 
    p=target_conversion, 
    size=n_per_variant
)

# Create DataFrame
df = pd.DataFrame({
    'user_id': range(n_per_variant * 2),
    'group': ['A_control'] * n_per_variant + ['B_variant'] * n_per_variant,
    'converted': np.concatenate([control_conversions, variant_conversions])
})

# Export
df.to_csv('data/simulation_raw.csv', index=False)
```

### 4.3 Statistical Analysis Engine

```python
import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.proportion import proportions_ztest

def analyze_ab_test(df: pd.DataFrame) -> dict:
    """
    Perform comprehensive A/B test analysis.
    
    Parameters:
    -----------
    df : pd.DataFrame
        Must contain 'group' and 'converted' columns
    
    Returns:
    --------
    dict : Analysis results including p-value, CI, and lift
    """
    
    # Split groups
    control = df[df['group'] == 'A_control']['converted']
    variant = df[df['group'] == 'B_variant']['converted']
    
    # Calculate metrics
    control_rate = control.mean()
    variant_rate = variant.mean()
    relative_lift = (variant_rate - control_rate) / control_rate
    
    # Two-proportion z-test
    count = np.array([variant.sum(), control.sum()])
    nobs = np.array([len(variant), len(control)])
    
    z_stat, p_value = proportions_ztest(count, nobs, alternative='two-sided')
    
    # Confidence interval (Wilson score)
    from statsmodels.stats.proportion import confint_proportions_2indep
    ci_low, ci_high = confint_proportions_2indep(
        count1=variant.sum(), nobs1=len(variant),
        count2=control.sum(), nobs2=len(control),
        method='newcomb'
    )
    
    return {
        'control_conversion': control_rate,
        'variant_conversion': variant_rate,
        'relative_lift': relative_lift,
        'absolute_lift': variant_rate - control_rate,
        'z_statistic': z_stat,
        'p_value': p_value,
        'confidence_interval': (ci_low, ci_high),
        'statistically_significant': p_value < 0.05,
        'control_sample_size': len(control),
        'variant_sample_size': len(variant)
    }
```

### 4.4 Chi-Square Test Alternative

```python
from scipy.stats import chi2_contingency

def chi_square_test(df: pd.DataFrame) -> dict:
    """
    Perform chi-square test for A/B analysis.
    Useful for categorical outcomes.
    """
    
    # Create contingency table
    contingency = pd.crosstab(df['group'], df['converted'])
    
    # Run chi-square test
    chi2, p_value, dof, expected = chi2_contingency(contingency)
    
    return {
        'chi2_statistic': chi2,
        'p_value': p_value,
        'degrees_of_freedom': dof,
        'expected_frequencies': expected,
        'statistically_significant': p_value < 0.05
    }
```

---

## 5. Decision Memo Template

### 5.1 Memo Structure

The `DECISION_MEMO.md` format from the project constitution:

```markdown
# A/B Test Decision Memo: [Experiment Name]

## Executive Summary
**TL;DR**: [One-sentence summary of result and recommendation]

**Decision**: ☐ Ship to 100% | ☐ Iterate | ☐ Rollback

---

## 1. Hypothesis

**If** we [specific change]
**Then** we will see [expected outcome]
**Because** [rationale based on user insight or data]

---

## 2. Experimental Design

| Parameter | Value |
|-----------|-------|
| **Sample Size** | N per variant |
| **Duration** | X days/weeks |
| **Audience** | Target segment |
| **Traffic Split** | 50/50 |
| **Statistical Power** | 80% |
| **Significance Level** | 5% (α = 0.05) |

---

## 3. Primary Metric
**Conversion Rate**: [Definition of success event]

### Guardrail Metrics
- Retention Rate (must not decrease >5%)
- Page Load Latency (must not increase >200ms)
- Session Duration (monitor for engagement changes)

---

## 4. Results

### Key Findings

| Metric | Control | Variant | Lift | p-value |
|--------|---------|---------|------|---------|
| Conversion Rate | X.XX% | X.XX% | +X.X% | 0.XXX |

### Statistical Analysis
- **Z-Statistic**: X.XX
- **P-Value**: 0.XXX
- **95% Confidence Interval**: [X.X%, X.X%]
- **Statistical Significance**: ✓ Achieved / ✗ Not Achieved

### Visualizations
[Include conversion rate bar charts, confidence interval plots]

---

## 5. Recommendation

### Decision: [Ship to 100% / Iterate / Rollback]

**Rationale**:
[Explain why this recommendation is being made based on:
- Statistical significance
- Practical significance (business impact)
- Guardrail metric performance
- Implementation cost vs. expected return]

---

## 6. Risk Assessment

| Risk Factor | Assessment |
|-------------|------------|
| **Novelty Effect** | [Consideration of initial spike] |
| **Seasonality Bias** | [Holiday/event impact] |
| **Segment Variance** | [Different effects across cohorts] |
| **Long-term Effects** | [Potential decay or compounding] |

---

## 7. Next Steps

1. [ ] [Immediate action item]
2. [ ] [Follow-up monitoring plan]
3. [ ] [Documentation updates]
```

---

## 6. Existing Data Analysis

### 6.1 Control Group Summary (30 days, August 2019)

Based on `control_group.csv`:

| Metric | Total | Daily Avg |
|--------|-------|-----------|
| **Spend (USD)** | ~$68,000 | ~$2,270 |
| **Impressions** | ~3.1M | ~103K |
| **Website Clicks** | ~153K | ~5,100 |
| **Purchases** | ~15,100 | ~503 |

**Calculated Funnel Rates:**
- Click-to-Purchase: ~9.9%
- Impression-to-Click: ~4.9%

### 6.2 Test Group Summary (30 days, August 2019)

Based on `test_group.csv`:

| Metric | Total | Daily Avg |
|--------|-------|-----------|
| **Spend (USD)** | ~$77,000 | ~$2,570 |
| **Impressions** | ~2.2M | ~73K |
| **Website Clicks** | ~174K | ~5,800 |
| **Purchases** | ~15,600 | ~520 |

**Calculated Funnel Rates:**
- Click-to-Purchase: ~9.0%
- Impression-to-Click: ~7.9%

### 6.3 Preliminary Observations

| Comparison | Control | Test | Difference |
|------------|---------|------|------------|
| Daily Spend | $2,270 | $2,570 | +13.2% |
| Click Rate | 4.9% | 7.9% | +61.2% |
| Purchase Rate | 9.9% | 9.0% | -9.1% |
| Impressions | 103K | 73K | -29.1% |

> [!NOTE]
> The existing data shows a trade-off pattern: The test campaign achieved higher click rates but lower impression volume. Full statistical significance testing is required before drawing conclusions.

---

## 7. Best Practices Checklist

### Pre-Experiment

- [ ] Define clear hypothesis with If-Then-Because format
- [ ] Calculate required sample size via power analysis
- [ ] Set primary metric and guardrail metrics
- [ ] Document experiment in central repository
- [ ] Get stakeholder alignment on success criteria

### During Experiment

- [ ] **Avoid peeking** – Do not check results before sample size reached
- [ ] Run for minimum 2 weeks to capture weekly cycles
- [ ] Monitor guardrail metrics for degradation
- [ ] Document any external factors (marketing campaigns, holidays)
- [ ] Maintain consistent traffic split

### Post-Experiment

- [ ] Verify statistical significance (p < 0.05)
- [ ] Calculate confidence intervals
- [ ] Assess practical significance (business impact)
- [ ] Segment analysis (device, user type, geography)
- [ ] Complete Decision Memo with recommendation
- [ ] Archive learnings in experimentation repository

---

## 8. Tools & Libraries

### Python Statistical Libraries

| Library | Function | Use Case |
|---------|----------|----------|
| `statsmodels` | `proportions_ztest` | Two-sample proportion test |
| `scipy.stats` | `chi2_contingency` | Chi-square independence test |
| `scipy.stats` | `ttest_ind` | T-test for continuous metrics |
| `numpy` | `random.binomial` | Simulate binary outcomes |

### Visualization Libraries

| Library | Recommended For |
|---------|-----------------|
| `matplotlib` | Statistical plots, confidence intervals |
| `seaborn` | Distribution comparisons, heatmaps |
| `plotly` | Interactive funnel visualizations |

### Power Analysis Tools

| Tool | Source |
|------|--------|
| `statsmodels.stats.power` | Python native |
| [Evan Miller Calculator](https://www.evanmiller.org/ab-testing/sample-size.html) | Web-based |
| [Optimizely Calculator](https://www.optimizely.com/sample-size-calculator/) | Web-based |

---

## 9. Emerging Trends (2024-2025)

### 9.1 AI-Powered Experimentation
- Automated hypothesis generation
- ML-driven traffic allocation
- Predictive experiment outcomes

### 9.2 Advanced Methodologies
- **Group Sequential Testing**: Faster decisions while maintaining statistical power
- **Bayesian A/B Testing**: Probability-based decision making
- **Multi-Armed Bandits**: Dynamic traffic optimization

### 9.3 Hybrid Experimentation
- Combined client-side and server-side testing
- Feature flagging integration
- Real-time personalization within experiments

---

## 10. References & Resources

### Academic & Industry Sources

1. **Statsig** - A/B Testing Best Practices & Power Analysis
2. **Amplitude** - 2024 Experimentation Trends
3. **GrowthBook** - A/B Testing Decision Framework
4. **CXL** - Growth Experiment Methodology
5. **Statsmodels Documentation** - proportions_ztest API

### Project Constitution Reference

The complete specification for Project 2 is defined in:
- [project_constitution.md](file:///Users/biswajitmondal/Developer/project_profile/project_constitution.md) - Section 3

### Data Files

- [control_group.csv](file:///Users/biswajitmondal/Developer/project_profile/Project_2/AB%20Testing/control_group.csv)
- [test_group.csv](file:///Users/biswajitmondal/Developer/project_profile/Project_2/AB%20Testing/test_group.csv)

---

## 11. Next Steps for Implementation

### Phase 1: Repository Setup
1. Create `/growth-experimentation-portfolio` structure
2. Implement `simulator.py` with configurable parameters
3. Build `stats_engine.py` with reusable analysis functions

### Phase 2: Analysis Workflow
1. Create Jupyter notebook walkthrough
2. Analyze existing campaign data
3. Generate visualizations

### Phase 3: Documentation
1. Write comprehensive README
2. Create DECISION_MEMO template
3. Add example completed memo

### Phase 4: Portfolio Integration
1. Upload to GitHub with clear README
2. Add badges for Python version, tests passing
3. Include live Jupyter notebook preview

---

*Research compiled: December 19, 2024*  
*Framework: Growth Engineering Portfolio – Experimentation Pillar*
