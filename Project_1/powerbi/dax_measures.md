# DAX Measure Library
Use these measures after loading the processed CSVs into Power BI with the same table names. Comments (`//`) describe logic so the set is interview-ready.

## Base Session Funnel
```DAX
Sessions :=
    SUM ( FactSessions[session_count] )

Unique Customers :=
    DISTINCTCOUNT ( FactSessions[customer_id] )

Add To Cart Sessions :=
    CALCULATE ( [Sessions], FactSessions[cart_flag] = 1 )

Purchases :=
    CALCULATE ( [Sessions], FactSessions[order_flag] = 1 )

Cart Abandons :=
    CALCULATE ( [Sessions], FactSessions[abandon_flag] = 1 )

Orders := [Purchases]    // alias for KPI cards
```

## Funnel Rates
```DAX
Add To Cart Rate := DIVIDE ( [Add To Cart Sessions], [Sessions] )

Purchase Rate := DIVIDE ( [Purchases], [Sessions] )

Cart To Purchase Rate := DIVIDE ( [Purchases], [Add To Cart Sessions] )

Abandon Rate :=
    VAR CartSessions = [Add To Cart Sessions]
    RETURN DIVIDE ( [Cart Abandons], IF ( CartSessions = 0, [Sessions], CartSessions ) )
```

## Revenue & Value
```DAX
Total Revenue := SUM ( FactSessions[revenue] )

Total Discount := SUM ( FactSessions[discount_amount] )

Gross Merchandise Value := SUMX ( FactSessions, FactSessions[unit_price] * FactSessions[quantity] )

Orders With Revenue := CALCULATE ( [Orders], FactSessions[revenue] > 0 )

Average Order Value := DIVIDE ( [Total Revenue], [Orders With Revenue] )

Revenue Per Customer := DIVIDE ( [Total Revenue], [Unique Customers] )

Discount Rate := DIVIDE ( [Total Discount], [Total Discount] + [Total Revenue] )
```

## Retention & Cohorts
Create the calculated column below on `FactCustomerDay` for the heatmap axis:
```DAX
Months Since Cohort =
VAR CohortStart = DATEVALUE ( FactCustomerDay[cohort_month] & "-01" )
RETURN DATEDIFF ( CohortStart, FactCustomerDay[visit_date], MONTH )
```
Measures:
```DAX
Cohort Size :=
    VAR SelectedCohort = SELECTEDVALUE ( FactCustomerDay[cohort_month] )
    RETURN
        CALCULATE (
            DISTINCTCOUNT ( DimCustomer[customer_id] ),
            DimCustomer[cohort_month] = SelectedCohort
        )

Retained Customers := DISTINCTCOUNT ( FactCustomerDay[customer_id] )

Retention Rate := DIVIDE ( [Retained Customers], [Cohort Size] )

Cohort Revenue := SUM ( FactCustomerDay[revenue] )

Repeat Purchase Rate :=
    VAR PurchaseCustomers =
        CALCULATE ( DISTINCTCOUNT ( FactCustomerDay[customer_id] ), FactCustomerDay[purchase_flag] = 1 )
    RETURN DIVIDE ( PurchaseCustomers, [Retained Customers] )
```

## Channel & CAC/LTV
```DAX
New Customers :=
    VAR CustomerScope = VALUES ( FactSessions[customer_id] )
    RETURN
        COUNTROWS (
            FILTER (
                CustomerScope,
                VAR FirstEverDate =
                    CALCULATE (
                        MIN ( FactSessions[date_key] ),
                        ALLEXCEPT ( FactSessions, FactSessions[customer_id] )
                    )
                VAR FirstDateInContext = CALCULATE ( MIN ( FactSessions[date_key] ) )
                RETURN NOT ISBLANK ( FirstDateInContext ) && FirstEverDate = FirstDateInContext
            )
        )

Channel Sessions :=
    SUMX (
        VALUES ( DimChannel[marketing_channel_id] ),
        CALCULATE ( [Sessions] )
    )

Synthetic Spend (₹) :=
    SUMX (
        VALUES ( DimChannel[marketing_channel_id] ),
        VAR ChannelID = DimChannel[marketing_channel_id]
        VAR CostPerNewCustomer =
            LOOKUPVALUE (
                AssumedChannelCosts[assumed_cac_inr],
                AssumedChannelCosts[marketing_channel_id],
                ChannelID
            )
        VAR ChannelNewCustomers =
            CALCULATE (
                [New Customers],
                KEEPFILTERS ( DimChannel[marketing_channel_id] = ChannelID )
            )
        RETURN ChannelNewCustomers * CostPerNewCustomer
    )

CAC (₹) := DIVIDE ( [Synthetic Spend (₹)], [New Customers] )

Observed LTV (₹) := [Revenue Per Customer]

LTV to CAC Ratio := DIVIDE ( [Observed LTV (₹)], [CAC (₹)] )
```

## Supporting KPIs
```DAX
Returning Customer Sessions :=
    CALCULATE ( [Sessions], FactSessions[user_type] = 1 )

New Customer Sessions :=
    CALCULATE ( [Sessions], FactSessions[user_type] = 0 )

Cart Recovery Rate :=
    VAR CartSessions = [Add To Cart Sessions]
    VAR CompletedAfterCart =
        CALCULATE ( [Sessions], FactSessions[cart_flag] = 1, FactSessions[order_flag] = 1 )
    RETURN DIVIDE ( CompletedAfterCart, CartSessions )

Revenue YoY % :=
    VAR CurrentRevenue = [Total Revenue]
    VAR PriorRevenue = CALCULATE ( [Total Revenue], DATEADD ( DimDate[date], -12, MONTH ) )
    RETURN DIVIDE ( CurrentRevenue - PriorRevenue, PriorRevenue )
```

## Phone Usage Metrics (Page 5)
```DAX
Avg Ecommerce Spend (₹/mo) := AVERAGE ( FactPhoneUsage[ecommerce_spend_inr_month] )

Avg Screen Time (hrs) := AVERAGE ( FactPhoneUsage[screen_time_hrs_day] )
```

## Usage Notes
- Place `cohort_month` on rows, `Months Since Cohort` on columns, value=`Retention Rate` for the heatmap. Add `Cohort Size` as a tooltip or secondary value.
- `Synthetic Spend (₹)` intentionally respects slicers (Date, Channel, Device). Change `AssumedChannelCosts` table values directly in Power BI to scenario-plan CAC.
