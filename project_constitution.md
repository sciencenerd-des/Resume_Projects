# Building Growth Lead Portfolio Projects
**The Growth Engineer’s Portfolio: A Strategic Blueprint for Analytics, Experimentation, and Operations**

## 1. Executive Context: The Evolution from Growth Marketing to Growth Engineering
The contemporary landscape of digital product growth has undergone a fundamental paradigm shift. The era of "growth hacking"—characterized by clever but ephemeral marketing tactics—has ceded ground to "growth engineering," a discipline rooted in systemic rigor, statistical validity, and operational scalability. For a professional seeking a Growth Lead role in a mature technology organization, the burden of proof has shifted significantly. Hiring managers and executive leadership no longer look solely for a history of successful campaigns; rather, they seek evidence of a candidate's ability to architect the very systems that make sustainable growth possible. This report outlines a comprehensive framework for constructing a portfolio that demonstrates this mastery through three distinct but interconnected proof projects: a high-fidelity analytics environment modeling the Indian acquisition market, a rigorous experimentation repository based on statistical first principles, and a fully automated marketing operations pipeline.

The modern Growth Lead operates at the intersection of three technical domains: advanced data analytics, experimental science, and process automation. The demand for "mature growth experience," as articulated in senior job descriptions, specifically targets the ability to synthesize these domains. It requires the candidate to move beyond the superficial tracking of "vanity metrics" (such as raw install counts) to the optimization of "value metrics" (such as retention cohorts, Lifetime Value (LTV) to Customer Acquisition Cost (CAC) ratios, and operational throughput).

This document serves as an exhaustive implementation guide for building these three portfolio artifacts. It provides not just the high-level strategy, but the granular technical details—ranging from Python data simulation scripts and Power BI DAX formulas to n8n workflow JSON configurations—necessary to execute these projects at a standard indistinguishable from a senior engineer or product data scientist. By rigorously documenting the construction of these systems, a candidate transforms their application from a promise of future performance to a demonstration of current capability.

### 1.1 The Strategic Necessity of the "Proof Project"
In the competitive market for senior growth roles, the "proof project" serves as a proxy for on-the-job performance. Standard interviews often fail to assess a candidate's hands-on technical fluency. A candidate might speak eloquently about "cohort analysis," but can they write the SQL or DAX required to calculate it? They may understand "A/B testing" conceptually, but can they calculate the sample size required for a specific statistical power or interpret a p-value correctly in the presence of skewed data?

The projects detailed herein are selected to specifically address the most common skepticism points hiring managers hold against growth candidates:
1. **Analytical Depth:** The "India Acquisition Funnel" project proves the ability to handle high-volume, noisy data and extract meaningful retention signals, moving beyond simple aggregates to cohort-based insights.
2. **Scientific Rigor:** The "Experimentation Repo" proves that the candidate is not merely "trying things" but following a scientific process that minimizes type I and type II errors, ensuring that business decisions are founded on statistical reality.
3. **Operational Efficiency:** The "n8n Automation" project proves the ability to scale. It demonstrates that the candidate can build the "pipes" that allow a growth team to move fast, removing manual bottlenecks through low-code orchestration.

---

## 2. Project I: The India Acquisition Funnel – Advanced Analytics & Market Simulation
The first pillar of the growth portfolio is the demonstration of advanced analytical capabilities. The choice of an "India Acquisition Funnel" is strategic. The Indian mobile application market represents one of the most challenging environments for growth professionals due to its specific unit economics: extreme scale, low Average Revenue Per User (ARPU), high device fragmentation (predominantly Android), and steep retention decay curves. Successfully modeling this environment demonstrates an ability to navigate the complexities of emerging markets, which serves as a strong proxy for handling any high-volume, low-margin business model.

### 2.1 Market Characteristics and Data Simulation Strategy
To build a credible dashboard, one cannot simply use random data. The data must reflect the statistical reality of the target market. A Growth Lead must understand the underlying distributions of the metrics they analyze.

#### 2.1.1 The Statistical Profile of the Indian Mobile Market
The Indian market is characterized by distinct behavioral patterns that must be encoded into our synthetic dataset.
- **Device Fragmentation and CPI:** The market is overwhelmingly dominated by Android devices, often accounting for 95% of the user base in mass-market utility or fintech apps. This impacts Cost Per Install (CPI) significantly. Research indicates that while iOS CPIs in India can range from $2.00 to $5.00, Android CPIs are frequently as low as $0.07 to $0.30. A realistic data model must reflect this variance; mixing these distinct populations without segmentation leads to "Simpson's Paradox," where aggregate trends mask the underlying reality of the subgroups.
- **The "Install-to-Activation" Drop:** A common bottleneck in India is the drop-off between Install and Signup (or Activation). Factors such as OTP delivery failures, lower-end device storage constraints, and intermittent network connectivity often result in activation rates lower than Western benchmarks. While a US app might see 80% install-to-signup, an Indian app might struggle at 50-60%.
- **Retention Decay:** Retention rates in India can be challenging. Average Day 1 retention across categories often hovers around 28%, dropping to roughly 15-18% by Day 7, and single digits by Day 30. The data generation script must simulate this geometric decay to allow for meaningful cohort analysis in the visualization layer.

#### 2.1.2 Star Schema Data Architecture
The production data generation evolved beyond simple flat files into a proper **Star Schema** optimized for Power BI and analytics dashboards. All generated datasets reside in the `/processed/` directory.

**A. Dimension Tables**

| Table | Records | Key Columns | Description |
|-------|---------|-------------|-------------|
| `dim_customer.csv` | 8,443 | customer_id, cohort_month, user_type_label, lifetime_revenue, avg_order_value | Customer master with LTV metrics |
| `dim_date.csv` | 366 | date_key, date, month_name, quarter, year, is_weekend | Full 2024 calendar dimension |
| `dim_channel.csv` | 6 | marketing_channel_id, channel_label | Marketing acquisition channels (0-5) |
| `dim_device.csv` | 3 | device_type_id, device_label | Desktop, Mobile, Tablet |
| `dim_location.csv` | ~100 | location_id, region | Geographic regions |
| `dim_product.csv` | ~900 | product_id, product_name | Product catalog |

**B. Fact Tables**

| Table | Records | Key Columns | Description |
|-------|---------|-------------|-------------|
| `fact_sessions.csv` | 25,001 | session_id, customer_id, marketing_channel_id, device_type_id, cart_flag, order_flag, revenue | Session-level funnel events |
| `fact_customer_day.csv` | 24,907 | customer_id, visit_date, cohort_month, sessions, purchase_sessions, revenue | Daily customer activity aggregates |
| `fact_phone_usage.csv` | ~25,000 | customer_id, date, usage_metrics | Behavioral engagement data |

**C. Reference Tables**

| Table | Records | Description |
|-------|---------|-------------|
| `assumed_channel_costs.csv` | 6 | marketing_channel_id, assumed_cac_inr | CAC assumptions for LTV/CAC modeling |

**Key Schema Relationships:**
- `fact_sessions` joins to dimensions via `customer_id`, `marketing_channel_id`, `device_type_id`, `date_key`
- `dim_customer.cohort_month` enables cohort retention analysis
- Revenue attribution flows from `fact_sessions.revenue` through to channel and device dimensions

### 2.2 Power BI Architecture and Data Modeling
The transition from raw CSV files to an interactive dashboard requires robust data modeling. The "Star Schema" is the requisite model.

#### 2.2.1 The Schema Design
The Power BI model maps directly to the star schema in `/processed/`:
- **fact_sessions:** Session-level events with cart/order flags. One row per session.
- **fact_customer_day:** Daily customer aggregates. One row per customer per active day.
- **dim_customer:** Customer master with cohort assignments and LTV metrics.
- **dim_date:** Full calendar dimension with weekday, quarter, is_weekend.
- **dim_channel:** Marketing channel dimension (6 channels with CAC from `assumed_channel_costs`).
- **dim_device:** Device type dimension (Desktop, Mobile, Tablet).

#### 2.2.2 Advanced DAX: The Cohort Retention Matrix
The centerpiece is the "Retention Triangle" or Heatmap.

**Step 1: Define the Cohort Month**
```dax
Cohort Month = 'dim_customer'[cohort_month]
```

**Step 2: The Cohort Size Measure**
```dax
Cohort Size = 
CALCULATE(
   DISTINCTCOUNT('dim_customer'[customer_id]),
   ALLEXCEPT('dim_customer', 'dim_customer'[cohort_month])
)
```

**Step 3: The Retained Users Measure**
```dax
Retained Users = DISTINCTCOUNT('fact_customer_day'[customer_id])
```

**Step 4: The Retention Rate**
```dax
Retention Rate = DIVIDE([Retained Users], [Cohort Size])
```

#### 2.2.3 LTV and CAC Modeling
**CAC (Customer Acquisition Cost):**
```dax
CAC = AVERAGE('assumed_channel_costs'[assumed_cac_inr])
```

**LTV (Lifetime Value) Projection:**
```dax
Projected LTV = 'dim_customer'[lifetime_revenue]
```
Where lifetime_revenue is pre-calculated per customer in the dimension table.

---

## 3. Project II: The Experimentation Engine – Scientific Method & Decision Frameworks
The second pillar addresses scientific rigor. This project involves building a GitHub repository that simulates an A/B test, analyzes results, and produces a professional decision memo.

### 3.1 The Repository Architecture
`/growth-experimentation-portfolio`
- `/data`
    - `simulation_raw.csv`
    - `simulation_clean.csv`
- `/src`
    - `simulator.py`
    - `stats_engine.py`
- `/notebooks`
    - `analysis_walkthrough.ipynb`
- `README.md`
- `DECISION_MEMO.md`

### 3.2 Hypothesis Definition and Simulation Logic
**Hypothesis:** "We believe that changing the 'Sign Up' button color from Blue to Green on the mobile landing page will result in a 15% increase in conversion rate because Green is culturally associated with 'Go' and financial success in the local context."

**Simulation Strategy:**
Perform a Power Analysis first:
- Baseline Conversion: 8%
- MDE: 15% relative lift (Target: 9.2%)
- Alpha: 0.05
- Power: 0.80

```python
import numpy as np
import pandas as pd
from statsmodels.stats.power import GofChisquarePower

# Power Analysis
effect_size = 0.05 
power_analysis = GofChisquarePower()
sample_size = power_analysis.solve_power(effect_size=effect_size, nobs=None, alpha=0.05, power=0.8)
n_per_variant = int(np.ceil(sample_size))

# Control Group (Baseline 8%)
control_conversions = np.random.binomial(n=1, p=0.08, size=n_per_variant)

# Variant Group (Lift to ~9.2%)
variant_conversions = np.random.binomial(n=1, p=0.092, size=n_per_variant)

df = pd.DataFrame({
   'user_id': range(n_per_variant * 2),
   'group': ['A_control'] * n_per_variant + ['B_variant'] * n_per_variant,
   'converted': np.concatenate([control_conversions, variant_conversions])
})
```

### 3.3 Statistical Analysis and Result Computation
The `stats_engine.py` script outputs:
1. **Observed Lift**
2. **P-Value**
3. **Confidence Interval**

### 3.4 The Decision Memo: The Artifact of Leadership
`DECISION_MEMO.md` format:
- **Executive Summary:** TL;DR result and recommendation.
- **Hypothesis:** "If... Then... Because..."
- **Experimental Design:** Sample size, duration, audience.
- **Primary Metric:** Conversion Rate.
- **Guardrail Metric:** Retention Rate or Latency.
- **Results:** Visuals, p-value, confidence intervals.
- **Recommendation:** Ship to 100%, Iterate, or Rollback.
- **Risk Assessment:** Novelty effects or seasonality bias.

---

## 4. Project III: Marketing Ops Automation – The "No-Code" Infrastructure
The final pillar addresses the operational bottleneck using n8n.

### 4.1 The Workflow Architecture
1. **Ingest:** Read the CSV file.
2. **Transform:** Parse data into JSON.
3. **Validate:** Check email format via RegEx.
4. **Route:** Valid leads to Notion, invalid to log.
5. **Report:** Summary email to stakeholder.

### 4.2 Step-by-Step Implementation Guide
#### 4.2.1 Ingestion: The Spreadsheet File Node
Converts binary CSV into JSON array.

#### 4.2.2 The Quality Gate: RegEx Validation
IF Node pattern: `^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$`

#### 4.2.3 The Load: Notion API Integration
Requires specific JSON mapping. 
**Multi-Select Code Node:**
```javascript
const tags = items[0].json.Tags.split(',');
return tags.map(tag => ({ json: { name: tag.trim() } }));
```

#### 4.2.4 The Feedback Loop: Automated Reporting
Gmail node summarizes: "Process complete. X leads added to CRM. Y leads rejected."

---

## 5. Strategic Synthesis: The "Mature" Candidate Profile
This portfolio shifts the interview dynamic from an interrogation of past claims to a review of present capabilities. It positions the candidate as a "Growth Engineer" capable of building the systems of growth.

---

### Key Data Points & References Table

| Metric/Concept | Value/Definition | Source | Context |
| :--- | :--- | :--- | :--- |
| Android CPI (India) | $0.07 - $0.30 | [3] | Justifies channel modeling |
| iOS CPI (India) | $2.00 - $5.00 | [1] | Highlights cost variance |
| Day 1 Retention | ~28% | [5] | Basis for retention script |
| Retention Pattern | "Period of Stay" | [10] | DAX pattern for dashboard |

### Works Cited
1. "What is Cost per install (CPI)?" - AppsFlyer
2. "Cost per Install 2025" - Mapendo Blog
3. "First App Launch Lessons" - Reddit r/SaaS
4. "User conversion funnel" - Medium
5. "Mobile App Benchmarks 2024" - OneSignal
... (and 30 additional references)
