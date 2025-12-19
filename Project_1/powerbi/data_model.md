# Power BI Data Model & Dictionary

## Source Profiling Snapshot
- `Project_1/Ecommerce.csv`: 25,000 session rows (8,442 distinct customers, 899 products) spanning 2024-01-01 to 2024-12-30. No nulls, revenue range ₹0–₹7,889.36, binary funnel flags (`added_to_cart`, `purchased`, `cart_abandoned`).
- `Project_1/phone_usage_india.csv`: 17,686 Indian mobile users, 10 metro/tier-1 cities, Android/iOS split (≈88%/12%), e-commerce spend ₹100–₹10,000 per month. All fields populated.

## Standardization & QA Rules
1. Parsed `visit_date` with `dayfirst=True`, cast to ISO dates plus surrogate `date_key` (`YYYYMMDD`).
2. Column names converted to snake_case across both datasets; string IDs preserved.
3. Revenue/discount clipped to ≥0 to guard against negative rounding artifacts.
4. Derived cohort metadata using first visit date per customer; min/max checks confirm coverage of all 365 days in 2024.
5. Phone usage traits left de-normalized (small table) but column names sanitized for Power BI compatibility.

## Star Schema Overview
```
DimDate ─┐                DimProduct
         ├─ FactSessions ──────────┐
DimCustomer ───────────────────────┤
DimChannel ────────────────────────┤
DimDevice  ────────────────────────┤
DimLocation ───────────────────────┘

FactCustomerDay references DimDate + DimCustomer for retention views.
FactPhoneUsage stands alone on Page 5.
AssumedChannelCosts is a disconnected parameter table for CAC inputs.
```
Relationships: one-to-many from each dimension to `FactSessions`; `FactCustomerDay` uses the same keys; disconnected `AssumedChannelCosts` connects only via DAX (TREATAS) against `marketing_channel_id`.

## Table Dictionary

### DimDate (`processed/dim_date.csv`)
| Column | Type | Description |
| --- | --- | --- |
| date_key | int | Surrogate key `YYYYMMDD`. |
| date | date | Calendar date. |
| day | int | Day of month. |
| month | int | Month number. |
| month_name | text | Short month label. |
| quarter | int | Quarter (1-4). |
| year | int | Calendar year. |
| weekday | int | 0=Monday. |
| week_start | date | ISO week starting Monday. |
| is_weekend | int | 1 for Saturday/Sunday. |

### DimCustomer (`processed/dim_customer.csv`)
| Column | Type | Description |
| --- | --- | --- |
| customer_id | int | Native ID from source sessions. |
| first_visit_date | date | First observed session. |
| first_purchase_date | date | First purchased session (nullable). |
| cohort_month | text | `YYYY-MM` of first visit (retention bucket). |
| user_type_flag | int | Source flag; treated as 0=New, 1=Returning (assumption). |
| user_type_label | text | Human-readable label for dashboards. |
| lifetime_sessions | int | Distinct session count. |
| lifetime_revenue | decimal | Total revenue attributed to the customer. |
| avg_order_value | decimal | Mean revenue per session historically. |

### DimProduct (`processed/dim_product.csv`)
| Column | Type | Description |
| --- | --- | --- |
| product_id | int | SKU surrogate. |
| product_category | int | Category code (0–7). |
| product_category_label | text | `Category <code>` placeholder. |
| base_price | decimal | Median unit price per SKU. |
| price_band | text | Bucketed as Budget/Mid/Premium/Luxury. |

### DimChannel (`processed/dim_channel.csv`)
| Column | Type | Description |
| --- | --- | --- |
| marketing_channel_id | int | Channel code (0–5). |
| channel_label | text | Friendly label (`Channel n`). |

### DimDevice (`processed/dim_device.csv`)
| Column | Type | Description |
| --- | --- | --- |
| device_type_id | int | Device code. |
| device_label | text | Desktop/Mobile/Tablet mapping (fallback `Device n`). |

### DimLocation (`processed/dim_location.csv`)
| Column | Type | Description |
| --- | --- | --- |
| location_id | int | Internal geo bucket (0–224). |
| location_label | text | `Region nnn` placeholder. |

### FactSessions (`processed/fact_sessions.csv`)
Grain: 1 row per session.
| Column | Type | Description |
| --- | --- | --- |
| session_id | int | Unique session surrogate. |
| date_key | int | Links to DimDate. |
| visit_date | date | Native timestamp. |
| customer_id | int | Links to DimCustomer. |
| product_id | int | Links to DimProduct. |
| marketing_channel_id | int | Links to DimChannel. |
| device_type_id | int | Links to DimDevice. |
| location_id | int | Links to DimLocation. |
| pages_viewed | int | Engagement depth. |
| time_on_site_sec | int | Session duration. |
| cart_flag | int | 1 if add-to-cart event occurred. |
| order_flag | int | 1 if purchased. |
| abandon_flag | int | 1 if cart abandoned. |
| quantity | int | Units in cart/order. |
| unit_price | decimal | Price per unit that session saw. |
| discount_amount | decimal | Discount currency amount. |
| discount_percent | int | Discount percent (0–30). |
| revenue | decimal | Net revenue recognized in session. |
| session_duration_bucket | text | Source categorical bucket. |
| user_type | int | Per-session segment (0=New,1=Returning). |
| session_count | int | Always 1 for quick aggregator. |

### FactCustomerDay (`processed/fact_customer_day.csv`)
Grain: customer-date for retention and activity analysis.
| Column | Type | Description |
| --- | --- | --- |
| customer_id | int | Links to DimCustomer. |
| visit_date | date | Activity date. |
| date_key | int | Links to DimDate. |
| cohort_month | text | Copied from DimCustomer. |
| sessions | int | Distinct sessions on the date. |
| add_to_cart_sessions | int | Add-to-cart session count. |
| purchase_sessions | int | Conversion count. |
| revenue | decimal | Daily revenue. |
| is_active | int | 1 if customer active that day. |
| is_purchase_day | int | 1 if at least one purchase. |
| retained_flag | int | Mirror of `is_active` for DAX readability. |
| purchase_flag | int | Mirror of `is_purchase_day`. |

### FactPhoneUsage (`processed/fact_phone_usage.csv`)
No dimensions required; fields describe the user context for Page 5.
| Column | Type | Description |
| --- | --- | --- |
| phone_user_id | text | Synthetic respondent ID. |
| age | int | 15–60. |
| gender | text | Male/Female/Other. |
| location | text | Major Indian city. |
| brand | text | Handset brand. |
| os | text | Android/iOS. |
| screen_time_hrs_day | decimal | Daily screen time. |
| data_usage_gb_month | decimal | GB per month. |
| calls_duration_mins_day | decimal | Minutes per day. |
| apps_installed | int | Count of installed apps. |
| social_media_time_hrs_day | decimal | Usage. |
| ecommerce_spend_inr_month | int | Monthly spend proxy. |
| streaming_time_hrs_day | decimal | OTT usage. |
| gaming_time_hrs_day | decimal | Gaming usage. |
| monthly_recharge_cost_inr | int | Recharge run-rate. |
| primary_use | text | Primary purpose classification. |

### AssumedChannelCosts (`processed/assumed_channel_costs.csv`)
| Column | Type | Description |
| --- | --- | --- |
| marketing_channel_id | int | Tied to DimChannel. |
| channel_label | text | Duplicated for slicers. |
| assumed_cac_inr | decimal | Editable CAC assumption (₹80–₹160 baseline). |

## Phone Usage Context Table
`FactPhoneUsage` can optionally be split into `DimLocationPhone`/`DimOS` if the dashboard grows. Currently, slicers operate directly on the columns because of the manageable row count.

## Relationship Rules
- `DimDate[date_key]` 1-* `FactSessions[date_key]` and `FactCustomerDay[date_key]`.
- `DimCustomer[customer_id]` 1-* `FactSessions[customer_id]` and `FactCustomerDay[customer_id]`.
- `DimProduct[product_id]` 1-* `FactSessions[product_id]`.
- `DimChannel[marketing_channel_id]` 1-* `FactSessions[marketing_channel_id]`.
- `DimDevice[device_type_id]` 1-* `FactSessions[device_type_id]`.
- `DimLocation[location_id]` 1-* `FactSessions[location_id]`.
- `AssumedChannelCosts` remains disconnected (use `TREATAS` inside CAC measures).

## Notable Data Quality Flags
- Revenue = 0 in 77.5% of sessions because only purchases capture non-zero revenue; handled by building conversion filters.
- 42% cart abandonment rate (`abandon_flag=1`), so ensure funnel cards filter on `cart_flag=1` when calculating abandon metrics.
- Device mapping uses assumption: 0=Desktop, 1=Mobile, 2=Tablet (documented in README).
- Location IDs (0–224) are anonymized; keep as numeric labels until real mapping becomes available.
