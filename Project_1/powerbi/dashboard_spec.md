# Dashboard Layout Specification

## Page 1 – Executive Overview
- **KPI Cards**: Sessions, Purchases, Total Revenue, Average Order Value, Purchase Rate, CAC (₹), LTV:CAC.
- **Combo Line/Column**: Revenue (columns) + Purchases (line) by `DimDate[date]` at week granularity.
- **Secondary Visual**: `Returning vs New Customer Sessions` stacked column.
- **Slicers**: Date range (DimDate), Marketing Channel, Device Type, User Type (DimCustomer), Visit Season.
- **Notes**: Use `Revenue YoY %` in a callout. All slicers sync across pages.

## Page 2 – Funnel & Drop-off
- **Funnel Visual**: Steps = Sessions → Add to Cart → Purchases (using measures from `dax_measures.md`).
- **Stacked Bars**: Add-to-cart rate and Purchase rate by Marketing Channel.
- **Matrix/Table**: Device Type rows, columns showing Sessions, Add To Cart Rate, Cart-to-Purchase Rate, Abandon Rate.
- **Scatter/Diagnostic**: Pages Viewed vs Purchase Rate with bubble size = Sessions for spotting friction.
- **Slicer**: Session Duration Bucket to isolate specific behaviors.

## Page 3 – Retention Cohorts
- **Heatmap Matrix**: Rows = Cohort Month, Columns = `Months Since Cohort`, Values = `Retention Rate`, Tooltips = `Cohort Size`, `Cohort Revenue`.
- **Line Chart**: Cohort Size trend by month (distinct customers from DimCustomer).
- **Card**: Repeat Purchase Rate for currently selected cohort.
- **Slicer**: User Type or Device to evaluate retention nuance.

## Page 4 – Channel Unit Economics
- **Table**: Columns = Channel Label, Sessions, New Customers, Purchases, Total Revenue, Purchase Rate, Synthetic Spend (₹), CAC (₹), Observed LTV (₹), LTV:CAC.
- **Scatter Plot**: X = CAC, Y = Observed LTV, bubble size = New Customers, color = Channel.
- **Bar Chart**: Synthetic Spend vs Revenue per channel to highlight ROI gap.
- **What-If Panel**: Add a slicer bound to `AssumedChannelCosts` for quick edits (or use “Edit in Data view”).

## Page 5 – India Market Segmentation (Phone Usage)
- **Tree Map**: Ecommerce Spend by OS and Primary Use.
- **Scatter**: Screen Time (X) vs Ecommerce Spend (Y), color by OS, size by Apps Installed.
- **Ribbon Chart**: Monthly Recharge Cost by Location to show affordability tiers.
- **Histogram**: Distribution of Data Usage.
- **Slicers**: OS, Primary Use, Location for storytelling.

## Navigation & UX Notes
- Pin slicers for Channel/Device and keep them consistent across Pages 1–4.
- Use descriptive tooltips referencing definitions (e.g., highlight CAC assumption) to maintain auditability.
- Provide a “Data Notes” tooltip page referencing `validation_report.md` for stakeholder trust.
