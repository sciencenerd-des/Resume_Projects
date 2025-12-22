# A/B Test Decision Memo: Sign-Up Button Color Test

## Executive Summary

**TL;DR**: The Green button variant showed a statistically significant 11.4% improvement in conversion rate. Recommend shipping to 100% of users.

**Decision**: ✅ **Ship to 100%**

---

## 1. Hypothesis

**If** we change the 'Sign Up' button color from Blue button to Green button on the mobile landing page

**Then** we will see a 15% increase in conversion rate

**Because** Green is culturally associated with 'Go' and financial success in our target market

---

## 2. Experimental Design

| Parameter | Value |
|-----------|-------|
| **Sample Size** | ~8,559 per variant |
| **Duration** | 7 days |
| **Audience** | All mobile web visitors |
| **Traffic Split** | 50/50 randomized |
| **Statistical Power** | 80% |
| **Significance Level** | 5% (α = 0.05) |

### Randomization
Users were randomly assigned to Control (Blue button) or Variant (Green button) groups using consistent hashing on user ID to ensure stable assignment across sessions.

### Sample Ratio Mismatch (SRM) Check

| Metric | Expected | Observed | Status |
|--------|----------|----------|--------|
| Split Ratio | 50.0% / 50.0% | 50.0% / 50.0% | ✅ PASS |

- **Chi-Square**: χ² = 0.00
- **P-Value**: 1.000000
- **Interpretation**: Randomization appears valid

---

## 3. Primary Metric

**Conversion Rate**: Percentage of users who complete sign-up after landing on the page.

### Guardrail Metrics
| Metric | Threshold | Status |
|--------|-----------|--------|
| Bounce Rate | Must not exceed 5.0% | ✅ -1.05% (p=0.652) |
| Error Rate | Must not exceed 1.0% | ✅ +6.29% (p=0.577) |
| Time To Convert | Must not exceed 10.0% | ⚠️ +7.85% (p=0.000) |

---

## 4. Results

### Key Findings

| Metric | Control (Blue button) | Variant (Green button) | Lift | p-value |
|--------|----------------|-----------------|------|---------| 
| Conversion Rate | 8.06% | 8.98% | **+11.45%** | 0.0306 |

### Statistical Analysis

- **Z-Statistic**: 2.16
- **P-Value**: 0.0306 (< 0.05)
- **95% Confidence Interval**: [+0.1%, +1.8%] absolute lift
- **Statistical Significance**: ✅ **Achieved**
- **Achieved Power**: 58%

### CUPED Variance Reduction

CUPED (Controlled-experiment Using Pre-Experiment Data) uses pre-experiment behavior to reduce variance in treatment effect estimates.

| Metric | Original | CUPED-Adjusted | Change |
|--------|----------|----------------|--------|
| Lift | +0.0092 | +0.0094 | 0.0001 |
| Standard Error | 0.0043 | 0.0043 | -0.2% |
| P-Value | 0.0306 | 0.0282 | - |
| Significant? | Yes | Yes | - |

- **Variance Reduction**: 0.3%
- **Covariate Correlation**: 0.055
- **Theta (optimal coefficient)**: 0.0578

### Bayesian Analysis

- **P(Variant > Control)**: 98.5%
- **Expected Lift**: +0.92%
- **95% Credible Interval**: [+0.0009, +0.0176]

### Methodology Comparison

| Criterion | Frequentist | Bayesian |
|-----------|-------------|----------|
| **Question Answered** | "Is the effect unlikely by chance?" | "What's the probability variant is better?" |
| **P-Value / Probability** | 0.0306 | 98.5% |
| **Interpretation** | Reject null hypothesis | 98.5% confidence variant wins |
| **Decision Support** | Binary (significant/not) | Continuous probability |

**Agreement Analysis**: ✅ Both approaches agree on positive effect

### Visualization

```
Conversion Rate by Variant
═══════════════════════════════════════════════════════════════

Control (Blue button)  ████████████████████████████████░░░░░░░░  8.06%
                
Variant (Green button) ███████████████████████████████████░░░░░  8.98%  [+11.45%]

                0%        5%        10%       15%       20%
```

---

## Decision Confidence

**Overall Grade**: C (70%)

| Component | Score | Description |
|-----------|-------|-------------|
| Power | 73% | Statistical power adequacy |
| P-Value Margin | 60% | Distance from significance threshold |
| Effect Size | 17% | Practical significance |
| Data Quality | 100% | SRM and guardrail checks |
| Segment Consistency | 89% | Effect consistency across segments |

**Concerns**:
- ⚠️ Underpowered study (58% vs 80% target)
- ⚠️ Achieved power (58%) below 80% threshold

---

## 5. Recommendation

### Decision: **Ship to 100%**

**Rationale**:

1. **Statistical Significance**: p-value of 0.0306 is well below our 0.05 threshold, indicating the observed difference is highly unlikely due to chance.

2. **Practical Significance**: A +11.45% relative improvement in conversion translates to significant business impact:
   - Current: 8,061 sign-ups per 100,000 visitors
   - Projected: 8,984 sign-ups per 100,000 visitors
   - **+923 additional sign-ups per 100,000 visitors**

3. **Bayesian Confidence**: 98.5% probability that the variant is better than control.

4. **Guardrail Status**: ⚠️ 1 guardrail warning(s) - monitor closely

5. **Implementation Cost**: Minimal - simple color change with no engineering complexity.

---

## 6. Risk Assessment

| Risk Factor | Assessment | Mitigation |
|-------------|------------|------------|
| **Novelty Effect** | Low risk - Button color is low-salience | Monitor week 2-4 for decay |
| **Seasonality Bias** | Low - Test ran during typical traffic period | Compare to historical baselines |
| **Segment Variance** | Moderate - May vary by device | Plan segment analysis post-launch |
| **Long-term Effects** | Unknown | Schedule 30-day post-launch review |

---

## 7. Segment Analysis

### By Device

*Correction: holm, alpha=0.05*

| Segment | Control | Variant | Lift | Adj. p-value | Sig? |
|---------|---------|---------|------|--------------|------|
| tablet | 8.48% | 6.60% | -22.24% | 0.1703 | ❌ |
| mobile | 8.51% | 9.48% | +11.37% | 0.1703 | ❌ |
| desktop | 7.00% | 8.78% | +25.58% | 0.0547 | ❌ |

---

### By Channel

*Correction: holm, alpha=0.05*

| Segment | Control | Variant | Lift | Adj. p-value | Sig? |
|---------|---------|---------|------|--------------|------|
| paid | 8.70% | 9.18% | +5.49% | 0.8272 | ❌ |
| social | 7.60% | 9.86% | +29.73% | 0.0272 | ✅ |
| organic | 7.76% | 8.30% | +6.95% | 0.8272 | ❌ |

---

### By Geography

*Correction: holm, alpha=0.05*

| Segment | Control | Variant | Lift | Adj. p-value | Sig? |
|---------|---------|---------|------|--------------|------|
| APAC | 7.53% | 9.55% | +26.92% | 0.1042 | ❌ |
| US | 8.56% | 9.02% | +5.27% | 0.4595 | ❌ |
| EU | 7.57% | 8.56% | +13.03% | 0.3910 | ❌ |

---



## 8. Next Steps

1. [x] Complete statistical analysis
2. [x] Complete Bayesian analysis
3. [x] Verify guardrail metrics
4. [ ] Roll out Green button to 100% of mobile web users
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
**Date**: December 2025  
**Status**: Ready for Stakeholder Review

---

*This memo was automatically generated by the A/B Testing Pipeline.*
