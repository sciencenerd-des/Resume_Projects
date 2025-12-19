# A/B Test Decision Memo: Sign-Up Button Color Test

## Executive Summary

**TL;DR**: The Green button variant showed a statistically significant 15% improvement in conversion rate. Recommend shipping to 100% of users.

**Decision**: ✅ **Ship to 100%**

---

## 1. Hypothesis

**If** we change the 'Sign Up' button color from Blue to Green on the mobile landing page

**Then** we will see a 15% increase in conversion rate

**Because** Green is culturally associated with 'Go' and financial success in our target market

---

## 2. Experimental Design

| Parameter | Value |
|-----------|-------|
| **Sample Size** | ~8,500 per variant |
| **Duration** | 7 days (simulated) |
| **Audience** | All mobile web visitors |
| **Traffic Split** | 50/50 randomized |
| **Statistical Power** | 80% |
| **Significance Level** | 5% (α = 0.05) |

### Randomization
Users were randomly assigned to Control (Blue) or Variant (Green) groups using consistent hashing on user ID to ensure stable assignment across sessions.

---

## 3. Primary Metric

**Conversion Rate**: Percentage of users who complete sign-up after landing on the page.

### Guardrail Metrics
| Metric | Threshold | Status |
|--------|-----------|--------|
| Bounce Rate | Must not increase >5% | ✅ No change |
| Time to Sign-up | Must not increase >10% | ✅ No change |
| Error Rate | Must not increase | ✅ No change |

---

## 4. Results

### Key Findings

| Metric | Control (Blue) | Variant (Green) | Lift | p-value |
|--------|----------------|-----------------|------|---------|
| Conversion Rate | 7.97% | 9.18% | **+15.25%** | 0.0045 |

### Statistical Analysis

- **Z-Statistic**: 2.84
- **P-Value**: 0.0045 (< 0.05)
- **95% Confidence Interval**: [+0.4%, +2.1%] absolute lift
- **Statistical Significance**: ✅ **Achieved**
- **Achieved Power**: 82%

### Visualization

```
Conversion Rate by Variant
═══════════════════════════════════════════════════════════════

Control (Blue)  ████████████████████████████░░░░░░░░░░  7.97%
                
Variant (Green) ████████████████████████████████░░░░░░  9.18%  [+15.25%]

                0%        5%        10%       15%       20%
```

---

## 5. Recommendation

### Decision: **Ship to 100%**

**Rationale**:

1. **Statistical Significance**: p-value of 0.0045 is well below our 0.05 threshold, indicating the observed difference is highly unlikely due to chance.

2. **Practical Significance**: A 15.25% relative improvement in conversion translates to significant business impact:
   - Current: 7,970 sign-ups per 100,000 visitors
   - Projected: 9,180 sign-ups per 100,000 visitors
   - **+1,210 additional sign-ups per 100K visitors**

3. **No Guardrail Violations**: All secondary metrics remained stable, indicating no negative user experience impact.

4. **Implementation Cost**: Minimal - simple color change with no engineering complexity.

---

## 6. Risk Assessment

| Risk Factor | Assessment | Mitigation |
|-------------|------------|------------|
| **Novelty Effect** | Low risk - Button color is low-salience | Monitor week 2-4 for decay |
| **Seasonality Bias** | Low - Test ran during typical traffic period | Compare to historical baselines |
| **Segment Variance** | Moderate - May vary by device | Plan segment analysis post-launch |
| **Long-term Effects** | Unknown | Schedule 30-day post-launch review |

---

## 7. Next Steps

1. [x] Complete statistical analysis
2. [ ] Roll out Green button to 100% of mobile web users
3. [ ] Monitor conversion rate for 2 weeks post-launch
4. [ ] Schedule 30-day review meeting
5. [ ] Document learnings in experimentation wiki
6. [ ] Plan follow-up test: Button size optimization

---

## References

- Experiment tracking: Internal Experimentation Platform
- Analysis notebook: `notebooks/analysis_walkthrough.ipynb`
- Raw data: `data/processed/simulation_clean.csv`

---

**Prepared by**: Growth Engineering Team  
**Date**: December 2024  
**Status**: Ready for Stakeholder Review
