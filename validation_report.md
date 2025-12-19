# Validation & QA Report

## 1. Repro Steps
```bash
python3 scripts/prepare_data.py        # rebuild processed star-schema files
python3 - <<'PY'
import pandas as pd
fact = pd.read_csv('processed/fact_sessions.csv', parse_dates=['visit_date'])
print(fact.describe(include='all'))
PY
```
Additional spot checks were run via ad-hoc pandas scripts stored in the command history.

## 2. Aggregate Cross-Checks
| Metric (Python) | Value | Power BI Measure | Notes |
| --- | --- | --- | --- |
| Sessions | 25,000 | `Sessions` | Equals row count because `session_count` = 1 per row. |
| Unique Customers | 8,442 | `Unique Customers` | Matches `DimCustomer` row count. |
| Add-to-Cart Sessions | 16,117 | `Add To Cart Sessions` | 64.5% of traffic advances past browse. |
| Purchases | 5,616 | `Purchases`/`Orders` | Purchase rate = 22.46%. |
| Cart Abandons | 10,501 | `Cart Abandons` | Abandon rate = 65.2% of carting users. |
| Total Revenue | ₹10,116,169.06 | `Total Revenue` | Derived from `revenue` column (already net of discount). |
| Orders With Revenue | 5,616 | `Orders With Revenue` | Confirms zero-revenue orders equal zero purchases. |
| AOV | ₹1,801.31 | `Average Order Value` | Python = Revenue / Orders → expected card value. |
| Purchase Rate | 22.46% | `Purchase Rate` | `5616 / 25000`. |
| Cart→Purchase Rate | 34.85% | `Cart To Purchase Rate` | `5616 / 16117`. |

## 3. Channel Split (Top 5)
| Channel ID | Sessions | Purchases | Revenue (₹) |
| --- | --- | --- | --- |
| 2 | 4,281 | 943 | 1,711,962.69 |
| 5 | 4,263 | 1,006 | 1,820,823.79 |
| 1 | 4,190 | 927 | 1,646,768.68 |
| 3 | 4,116 | 932 | 1,675,463.47 |
| 4 | 4,109 | 890 | 1,599,821.67 |
Channel 0 trails with 4,041 sessions / 918 orders / ₹1.58M revenue and should be highlighted when benchmarking CAC inputs.

## 4. Retention Sanity Check
- January 2024 Cohort size = 1,914 unique customers (Python `fact_customer_day`).
- Retained counts by months since cohort: 0:1,914, 1:387, 2:380, 3:398, 4:403, 5:356, 6:398, 7:392, 8:392, 9:431, 10:370, 11:396.
- Eleven-month retention rate therefore declines to 20.7% (396 ÷ 1,914). This confirms the heatmap denominator must stay fixed at cohort size, matching the DAX `Retention Rate` logic.

## 5. Edge Cases & Data Quality Notes
- **Multiple sessions/day**: `fact_customer_day` shows up to 3 sessions per customer per day; DAX uses `DISTINCTCOUNT` to avoid double counting in retention.
- **Missing data**: `visit_date` has 0 nulls; `phone_usage` also complete. No synthetic rows required.
- **Revenue sanity**: Revenue minimum = 0, maximum = ₹7,889.36; no negative revenue after clipping.
- **Cart logic**: `purchases without cart` = 0, so funnel metrics remain consistent.
- **Location/device labeling**: Location IDs are anonymized ranges 0–224, and device type mapping (0=Desktop, 1=Mobile, 2=Tablet) is an assumption documented in `README.md`.
- **CAC assumptions**: `AssumedChannelCosts` supplies baseline ₹80–₹160 CAC across channels; revisit values before presenting externally.

All computed metrics align with the planned DAX measures, giving confidence that the Power BI visuals will reproduce the same numbers.
