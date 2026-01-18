---
date: 2025-12-22T16:30:05Z
researcher: Claude Code
git_commit: 23e662b4f2b1a7ee073ca90bd215ca9e56ebc3e3
branch: feature/project3-and-chart-updates
repository: project_profile
topic: "Project 2 A/B Testing - Critical Gaps Documentation"
tags: [research, codebase, ab-testing, experimentation, project-2]
status: complete
last_updated: 2025-12-22
last_updated_by: Claude Code
---

# Research: Project 2 A/B Testing - Critical Gaps Documentation

**Date**: 2025-12-22T16:30:05Z
**Researcher**: Claude Code
**Git Commit**: 23e662b4f2b1a7ee073ca90bd215ca9e56ebc3e3
**Branch**: feature/project3-and-chart-updates
**Repository**: project_profile

## Research Question

Document the current implementation state of Project 2 (Growth Experimentation Portfolio) to understand the following identified gaps:
1. Real campaign data usage status
2. Segment analysis capabilities
3. Guardrails module integration
4. Notebook visualizations
5. Bayesian vs Frequentist integration
6. Sequential testing implementation

## Summary

The Growth Experimentation Portfolio at `Project_2/growth-experimentation-portfolio/` is a well-structured A/B testing framework that implements both frequentist and Bayesian statistical analysis. However, the codebase operates entirely on **synthetic simulated data** rather than the real campaign data that exists in the repository. The project demonstrates technical implementation capabilities but lacks several features that would showcase analytical judgment on real-world messy data.

---

## Detailed Findings

### 1. Real Campaign Data - Exists But Unused

#### Data File Locations

**Original Data Files:**
- `/Project_2/AB Testing/control_group.csv` - 30 days of control campaign metrics (Aug 2019)
- `/Project_2/AB Testing/test_group.csv` - 30 days of test campaign metrics (Aug 2019)

**Copied to Portfolio:**
- `/Project_2/growth-experimentation-portfolio/data/raw/control_group.csv`
- `/Project_2/growth-experimentation-portfolio/data/raw/test_group.csv`

#### Data Schema (Real Campaign Data)

```
Campaign Name;Date;Spend [USD];# of Impressions;Reach;# of Website Clicks;# of Searches;# of View Content;# of Add to Cart;# of Purchase
```

- **Delimiter**: Semicolon (European CSV format)
- **Date Format**: `DD.MM.YYYY` (e.g., `1.08.2019`)
- **Notable Issues**: Row 5 (Aug 5, 2019) has missing data in control_group.csv

#### Utility Function Exists But Never Called

**Location**: `src/utils.py:12-34`

```python
def load_campaign_data(filepath: str, delimiter: str = ';') -> pd.DataFrame:
```

This function:
- Accepts semicolon delimiter as default
- Parses European date format (`%d.%m.%Y`)
- Cleans column names (removes `# of ` prefix)

**Finding**: This function is **never imported or called** by any executable code in the repository.

#### What the Codebase Actually Uses

All analysis modules load **simulated data** from `data/processed/simulation_clean.csv`:

| Module | Data Source | Line Reference |
|--------|-------------|----------------|
| `stats_engine.py` | `simulation_clean.csv` | Line 222 |
| `bayesian_engine.py` | `simulation_clean.csv` | Line 308 |
| `memo_generator.py` | `simulation_clean.csv` | Line 300 |
| Jupyter notebook | In-memory generation | Cell 5 |

---

### 2. Segment Analysis - Not Implemented

#### Current Groupby Operations

The **only** groupby operation in the codebase is at `simulator.py:175`:

```python
print(df.groupby('group')['converted'].agg(['count', 'sum', 'mean']))
```

This groups by experiment assignment (`A_control`/`B_variant`), not by any segment dimension.

#### Missing Segment Capabilities

| Capability | Status | Notes |
|------------|--------|-------|
| Device-level segmentation | Not implemented | No `device` column in simulator |
| Channel segmentation | Not implemented | No `channel` column |
| Geographic segmentation | Not implemented | No `geography` column |
| Cohort analysis | Not implemented | No cohort-based grouping |
| Bonferroni correction | Not implemented | No multiple testing correction |
| FDR correction | Not implemented | |
| Holm correction | Not implemented | |

#### Data Schema Comparison

**Simulator Output** (`simulator.py:101-106`):
```python
df = pd.DataFrame({
    'user_id': range(n * 2),
    'group': ['A_control'] * n + ['B_variant'] * n,
    'converted': np.concatenate([...]),
    'timestamp': np.concatenate([...])
})
```

**No segment dimensions are generated.**

#### Documentation Reference

`DECISION_MEMO.md:114` mentions segment analysis as future work:
```
| **Segment Variance** | Moderate - May vary by device | Plan segment analysis post-launch |
```

---

### 3. Guardrails Module - Exists But Not Integrated with Simulator

#### Module Structure

**Location**: `src/guardrails.py`

- `GuardrailConfig` dataclass (lines 33-44)
- `GuardrailChecker` class (lines 105-356)
- `GuardrailReport` class (lines 72-102)

#### Default Guardrail Metrics (`guardrails.py:130-151`)

```python
GuardrailConfig(metric_name="bounce_rate", direction=Direction.INCREASE, max_degradation_pct=5.0)
GuardrailConfig(metric_name="error_rate", direction=Direction.INCREASE, max_degradation_pct=1.0)
GuardrailConfig(metric_name="time_to_convert", direction=Direction.INCREASE, max_degradation_pct=10.0)
```

#### Integration Status

**memo_generator.py Integration** (lines 61-76):

```python
has_guardrail_cols = any(
    col in df.columns for col in ['bounce_rate', 'error_rate', 'time_to_convert']
)
if has_guardrail_cols:
    self.guardrail_report = guardrail_checker.check_all(control_df, variant_df)
else:
    self.guardrail_report = None  # Falls through to hardcoded placeholders
```

**Current State**: Since simulator does not generate guardrail columns, `has_guardrail_cols` is always `False`, resulting in hardcoded placeholder values in the Decision Memo.

#### Fallback Behavior (`memo_generator.py:113-115`)

When no guardrail data exists, the memo displays:
```markdown
| Bounce Rate | Must not increase >5% | ✅ No change |
| Time to Sign-up | Must not increase >10% | ✅ No change |
| Error Rate | Must not increase | ✅ No change |
```

These are **fabricated values**, not calculated from actual data.

---

### 4. Notebook Visualizations - Basic Implementation

#### Visualizations Found

| Cell | Chart Type | Description |
|------|------------|-------------|
| Cell 8 | Bar plot | Conversion rate by variant (seaborn barplot) |
| Cell 12 | Error bar plot | 95% confidence interval for absolute lift |

#### Implementation Details

**Bar Chart** (`cell-8`):
- Uses `sns.barplot(x='Group', y='Conversion Rate', data=summary)`
- Palette: viridis
- Includes data labels on bars

**Confidence Interval Plot** (`cell-12`):
- Uses `plt.errorbar()` with asymmetric error bars
- Reference line at x=0 (red dashed)
- Annotation showing lift percentage

#### Not Implemented

| Visualization | Status |
|---------------|--------|
| Cumulative conversion over time | Not found |
| Power curve visualization | Not found |
| Segment breakdown charts | Not found |
| Forest plots | Not found |
| Time-series analysis | Not found |
| Heatmaps | Not found |
| Distribution plots | Not found |

---

### 5. Bayesian vs Frequentist Integration

#### Import Structure

**memo_generator.py:14-15**:
```python
from stats_engine import ABTestAnalyzer, ABTestResult
from bayesian_engine import BayesianAnalyzer, BayesianResult
```

#### Parallel Execution (`memo_generator.py:51-59`)

Both engines run on the same dataset:

```python
# Frequentist
freq_analyzer = ABTestAnalyzer(alpha=0.05)
self.freq_result = freq_analyzer.analyze(df)

# Bayesian
bayes_analyzer = BayesianAnalyzer()
self.bayes_result = bayes_analyzer.analyze(df)
```

#### Decision Logic (`memo_generator.py:78-91`)

**Important Finding**: Only frequentist results drive the automated recommendation:

```python
if not self.freq_result.statistically_significant:
    return 'ITERATE'
if self.freq_result.relative_lift > 0.05:
    return 'SHIP'
```

Bayesian results are **not used** in decision logic, only in rationale presentation.

#### Presentation in Decision Memo

**Frequentist Section** (lines 172-187):
- Z-statistic, P-value, Confidence Interval, Power

**Bayesian Section** (lines 188-192):
- P(Variant > Control), Expected Lift, Credible Interval

**Integration Gap**: No comparison of when to use each approach or how conclusions might differ.

#### Notebook Usage

The Jupyter notebook **only uses frequentist analysis** (`stats_engine`). Bayesian engine is not imported or demonstrated in the interactive walkthrough.

---

### 6. Sequential Testing - Not Implemented

#### Search Results

**Keywords Not Found:**
- "sequential", "early stopping", "peeking"
- "alpha spending", "O'Brien-Fleming", "Pocock"
- "group sequential", "interim analysis"
- "stopping boundary", "Lan-DeMets"

#### Architecture Pattern

The codebase implements a **fixed-horizon testing framework**:

1. **Pre-experiment**: Calculate sample size once (`simulator.py:43-69`)
2. **Data collection**: Generate complete dataset (`simulator.py:71`)
3. **Post-experiment**: Single analysis (`stats_engine.py:91`)
4. **Decision**: One-time recommendation (`memo_generator.py:78`)

#### Configuration (`simulator.py:17-24`)

```python
@dataclass
class ExperimentConfig:
    baseline_conversion: float = 0.08
    relative_lift: float = 0.15
    alpha: float = 0.05  # Fixed, no adjustment for multiple looks
    power: float = 0.80
```

No configuration exists for:
- Number of planned interim looks
- Alpha spending function type
- Boundary shape parameters

---

## Code References

| File | Lines | Description |
|------|-------|-------------|
| `src/utils.py` | 12-34 | Unused `load_campaign_data()` function |
| `src/simulator.py` | 101-106 | DataFrame schema (no segment columns) |
| `src/simulator.py` | 43-69 | Fixed sample size calculation |
| `src/stats_engine.py` | 91-170 | Frequentist analysis (no segment support) |
| `src/bayesian_engine.py` | 208-273 | Bayesian analysis (no segment support) |
| `src/guardrails.py` | 130-151 | Default guardrail configurations |
| `src/memo_generator.py` | 61-76 | Conditional guardrail checking |
| `src/memo_generator.py` | 78-91 | Frequentist-only decision logic |
| `notebooks/analysis_walkthrough.ipynb` | Cell 8, 12 | Only 2 visualizations |
| `DECISION_MEMO.md` | 41-46 | Hardcoded guardrail placeholders |

---

## Architecture Documentation

### Data Flow

```
simulator.py → data/processed/simulation_clean.csv
                        ↓
         ┌──────────────┴──────────────┐
         ↓                             ↓
   stats_engine.py              bayesian_engine.py
   (ABTestResult)               (BayesianResult)
         ↓                             ↓
         └──────────────┬──────────────┘
                        ↓
               memo_generator.py
                        ↓
               DECISION_MEMO.md
```

### Module Responsibilities

| Module | Purpose | Segment Support | Sequential Support |
|--------|---------|-----------------|-------------------|
| `simulator.py` | Generate test data | No | No |
| `stats_engine.py` | Frequentist analysis | No | No |
| `bayesian_engine.py` | Bayesian analysis | No | No |
| `guardrails.py` | Secondary metric checks | No | No |
| `memo_generator.py` | Orchestration & reporting | No | No |

---

## Summary of Gaps

| Gap | Current State | Evidence |
|-----|---------------|----------|
| Real data unused | `load_campaign_data()` never called | Grep search returns no imports |
| No segment analysis | Only groups by experiment assignment | `simulator.py:175` only groupby |
| Guardrails placeholder | Hardcoded "No change" values | `memo_generator.py:113-115` |
| Basic visualizations | 2 charts (bar + errorbar) | Notebook cells 8, 12 |
| No Bayesian in decision | Only frequentist drives recommendation | `memo_generator.py:78-91` |
| No sequential testing | Fixed-horizon only | No related code found |

---

## Open Questions

1. Should the real campaign data be analyzed in addition to or instead of simulated data?
2. What segment dimensions would be most relevant for the button color test hypothesis?
3. Should guardrail metrics be synthetically generated or should different source data be used?
4. Is there a reason the Bayesian engine is excluded from the notebook walkthrough?

---

*Research completed: 2025-12-22*
