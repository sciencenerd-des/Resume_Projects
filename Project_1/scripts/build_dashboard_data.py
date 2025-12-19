import json
from pathlib import Path
from typing import Dict, List

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "processed"
OUTPUT_DIR = BASE_DIR / "src" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH = OUTPUT_DIR / "dashboard-data.json"


def safe_div(num: float, denom: float) -> float:
    return round(float(num) / float(denom), 4) if denom else 0.0


def summarize_range(facts: pd.DataFrame, start_period: pd.Period, end_period: pd.Period, first_sessions: pd.DataFrame, channel_cost_map: Dict[int, float]):
    mask = facts["month_period"].between(start_period, end_period, inclusive="both")
    subset = facts.loc[mask]
    if subset.empty:
        return {
            "sessions": 0,
            "uniqueCustomers": 0,
            "addToCart": 0,
            "purchases": 0,
            "cartAbandons": 0,
            "revenue": 0.0,
            "addToCartRate": 0.0,
            "purchaseRate": 0.0,
            "cartToPurchaseRate": 0.0,
            "aov": 0.0,
            "revenuePerCustomer": 0.0,
            "newCustomers": 0,
            "syntheticSpend": 0.0,
            "cac": 0.0,
            "ltv": 0.0,
            "ltvToCac": 0.0,
        }

    sessions = int(subset.shape[0])
    add_to_cart = int(subset["cart_flag"].sum())
    purchases = int(subset["order_flag"].sum())
    cart_abandons = int(subset["abandon_flag"].sum())
    revenue = round(float(subset["revenue"].sum()), 2)
    unique_customers = int(subset["customer_id"].nunique())
    orders = purchases
    aov = round(revenue / orders, 2) if orders else 0.0
    add_to_cart_rate = safe_div(add_to_cart, sessions)
    purchase_rate = safe_div(purchases, sessions)
    cart_to_purchase_rate = safe_div(purchases, add_to_cart)
    revenue_per_customer = round(revenue / unique_customers, 2) if unique_customers else 0.0

    new_customer_mask = first_sessions["first_month"].between(start_period, end_period, inclusive="both")
    new_customers_df = first_sessions.loc[new_customer_mask]
    new_customers = int(new_customers_df.shape[0])

    synthetic_spend = 0.0
    if new_customers:
        for channel_id, count in new_customers_df["marketing_channel_id"].value_counts().items():
            synthetic_spend += float(channel_cost_map.get(channel_id, 125)) * int(count)
    cac = round(synthetic_spend / new_customers, 2) if new_customers else 0.0
    ltv = revenue_per_customer
    ltv_to_cac = round(ltv / cac, 2) if cac else 0.0

    return {
        "sessions": sessions,
        "uniqueCustomers": unique_customers,
        "addToCart": add_to_cart,
        "purchases": purchases,
        "cartAbandons": cart_abandons,
        "revenue": revenue,
        "addToCartRate": round(add_to_cart_rate, 4),
        "purchaseRate": round(purchase_rate, 4),
        "cartToPurchaseRate": round(cart_to_purchase_rate, 4),
        "aov": aov,
        "revenuePerCustomer": revenue_per_customer,
        "newCustomers": new_customers,
        "syntheticSpend": round(synthetic_spend, 2),
        "cac": cac,
        "ltv": ltv,
        "ltvToCac": ltv_to_cac,
    }


def main():
    fact_sessions = pd.read_csv(PROCESSED_DIR / "fact_sessions.csv", parse_dates=["visit_date"])
    fact_sessions["month_period"] = fact_sessions["visit_date"].dt.to_period("M")

    fact_customer_day = pd.read_csv(PROCESSED_DIR / "fact_customer_day.csv", parse_dates=["visit_date"])
    dim_customer = pd.read_csv(PROCESSED_DIR / "dim_customer.csv")
    dim_channel = pd.read_csv(PROCESSED_DIR / "dim_channel.csv")
    dim_device = pd.read_csv(PROCESSED_DIR / "dim_device.csv")
    channel_costs = pd.read_csv(PROCESSED_DIR / "assumed_channel_costs.csv")
    fact_phone_usage = pd.read_csv(PROCESSED_DIR / "fact_phone_usage.csv")

    channel_cost_map = dict(zip(channel_costs["marketing_channel_id"], channel_costs["assumed_cac_inr"]))

    first_sessions = (
        fact_sessions.sort_values("visit_date")
        .groupby("customer_id")
        .first()
        .reset_index()[["customer_id", "visit_date", "marketing_channel_id"]]
    )
    first_sessions = first_sessions.rename(columns={"visit_date": "first_visit"})
    first_sessions["first_month"] = first_sessions["first_visit"].dt.to_period("M")

    last_period = fact_sessions["month_period"].max()

    summary_ranges = {}
    for label, months in {"3m": 3, "6m": 6, "12m": 12}.items():
        start_period = last_period - (months - 1)
        summary_ranges[label] = summarize_range(fact_sessions, start_period, last_period, first_sessions, channel_cost_map)

    monthly_group = (
        fact_sessions.groupby("month_period")
        .agg(
            sessions=("session_id", "count"),
            addToCart=("cart_flag", "sum"),
            purchases=("order_flag", "sum"),
            cartAbandons=("abandon_flag", "sum"),
            revenue=("revenue", "sum"),
        )
        .reset_index()
        .sort_values("month_period")
    )

    new_customers_by_month = first_sessions.groupby("first_month")["customer_id"].nunique()
    monthly_rows: List[Dict] = []
    for _, row in monthly_group.iterrows():
        month_period = row["month_period"]
        month_label = month_period.strftime("%b %Y")
        monthly_rows.append(
            {
                "month": str(month_period),
                "label": month_label,
                "sessions": int(row["sessions"]),
                "addToCart": int(row["addToCart"]),
                "purchases": int(row["purchases"]),
                "cartAbandons": int(row["cartAbandons"]),
                "revenue": round(float(row["revenue"]), 2),
                "newCustomers": int(new_customers_by_month.get(month_period, 0)),
            }
        )

    funnel_summary = summary_ranges["12m"].copy()

    duration_group = (
        fact_sessions.groupby("session_duration_bucket")
        .agg(
            sessions=("session_id", "count"),
            purchases=("order_flag", "sum"),
        )
        .reset_index()
    )
    duration_buckets = []
    for _, row in duration_group.iterrows():
        duration_buckets.append(
            {
                "bucket": row["session_duration_bucket"],
                "label": row["session_duration_bucket"],
                "sessions": int(row["sessions"]),
                "purchaseRate": safe_div(row["purchases"], row["sessions"]),
            }
        )
    if duration_buckets:
        funnel_summary["durationBuckets"] = duration_buckets

    channel_group = (
        fact_sessions.groupby("marketing_channel_id")
        .agg(
            sessions=("session_id", "count"),
            addToCart=("cart_flag", "sum"),
            purchases=("order_flag", "sum"),
            revenue=("revenue", "sum"),
            cartAbandons=("abandon_flag", "sum"),
            customers=("customer_id", "nunique"),
        )
        .reset_index()
    )
    new_customers_by_channel = first_sessions.groupby("marketing_channel_id")["customer_id"].nunique()
    total_sessions = int(channel_group["sessions"].sum())

    channel_rows = []
    for _, row in channel_group.iterrows():
        channel_id = int(row["marketing_channel_id"])
        new_customers = int(new_customers_by_channel.get(channel_id, 0))
        spend = round(new_customers * float(channel_cost_map.get(channel_id, 125)), 2)
        cac = round(spend / new_customers, 2) if new_customers else 0.0
        revenue = round(float(row["revenue"]), 2)
        customers = int(row["customers"])
        ltv = round(revenue / customers, 2) if customers else 0.0
        channel_rows.append(
            {
                "channelId": channel_id,
                "label": dim_channel.loc[dim_channel["marketing_channel_id"] == channel_id, "channel_label"].iat[0],
                "sessions": int(row["sessions"]),
                "purchases": int(row["purchases"]),
                "addToCart": int(row["addToCart"]),
                "cartAbandons": int(row["cartAbandons"]),
                "revenue": revenue,
                "customers": customers,
                "newCustomers": new_customers,
                "syntheticSpend": spend,
                "cac": cac,
                "ltv": ltv,
                "ltvToCac": round(ltv / cac, 2) if cac else 0.0,
                "purchaseRate": safe_div(row["purchases"], row["sessions"]),
                "share": round(row["sessions"] / total_sessions, 4) if total_sessions else 0.0,
            }
        )

    device_map = dict(zip(dim_device["device_type_id"], dim_device["device_label"]))
    device_group = (
        fact_sessions.groupby("device_type_id")
        .agg(
            sessions=("session_id", "count"),
            addToCart=("cart_flag", "sum"),
            purchases=("order_flag", "sum"),
            revenue=("revenue", "sum"),
            pagesViewed=("pages_viewed", "mean"),
        )
        .reset_index()
    )
    device_rows = []
    for _, row in device_group.iterrows():
        device_id = int(row["device_type_id"])
        sessions = int(row["sessions"])
        add_to_cart = int(row["addToCart"])
        purchases = int(row["purchases"])
        device_rows.append(
            {
                "deviceId": device_id,
                "label": device_map.get(device_id, f"Device {device_id}"),
                "sessions": sessions,
                "addToCartRate": safe_div(add_to_cart, sessions),
                "purchaseRate": safe_div(purchases, sessions),
                "cartToPurchaseRate": safe_div(purchases, add_to_cart),
                "avgPages": round(float(row["pagesViewed"]), 1),
                "revenue": round(float(row["revenue"]), 2),
            }
        )

    cohort_sizes = dim_customer.groupby("cohort_month")["customer_id"].nunique()
    fact_customer_day["visit_period"] = fact_customer_day["visit_date"].dt.to_period("M")
    fact_customer_day["cohort_period"] = pd.PeriodIndex(fact_customer_day["cohort_month"], freq="M")
    fact_customer_day["months_since"] = (
        fact_customer_day["visit_period"].map(lambda p: p.ordinal)
        - fact_customer_day["cohort_period"].map(lambda p: p.ordinal)
    )
    retention_counts = (
        fact_customer_day.groupby(["cohort_month", "months_since"])["customer_id"].nunique().reset_index()
    )
    retention_revenue = (
        fact_customer_day.groupby(["cohort_month", "months_since"])["revenue"].sum().reset_index()
    )
    retention = []
    revenue_lookup = {
        (row["cohort_month"], int(row["months_since"])): round(float(row["revenue"]), 2)
        for _, row in retention_revenue.iterrows()
    }

    for _, row in retention_counts.iterrows():
        cohort = row["cohort_month"]
        months_since = int(row["months_since"])
        if months_since < 0:
            continue
        retained = int(row["customer_id"])
        cohort_size = int(cohort_sizes.get(cohort, 0))
        retention_rate = safe_div(retained, cohort_size)
        retention.append(
            {
                "cohortMonth": cohort,
                "monthOffset": months_since,
                "retainedCustomers": retained,
                "retentionRate": retention_rate,
                "cohortSize": cohort_size,
                "revenue": revenue_lookup.get((cohort, months_since), 0.0),
            }
        )

    cohort_trend = [
        {"cohortMonth": cohort, "cohortSize": int(size)}
        for cohort, size in cohort_sizes.sort_index().items()
    ]

    phone_total = fact_phone_usage.shape[0]
    phone_by_os = (
        fact_phone_usage.groupby("os").agg(
            avgSpend=("ecommerce_spend_inr_month", "mean"),
            avgScreen=("screen_time_hrs_day", "mean"),
            users=("phone_user_id", "count"),
        )
    )
    os_rows = []
    for os, row in phone_by_os.iterrows():
        os_rows.append(
            {
                "os": os,
                "avgSpend": round(float(row["avgSpend"]), 2),
                "avgScreen": round(float(row["avgScreen"]), 1),
                "share": round(row["users"] / phone_total, 4) if phone_total else 0.0,
            }
        )

    top_locations = (
        fact_phone_usage.groupby("location")
        .agg(avgSpend=("ecommerce_spend_inr_month", "mean"), users=("phone_user_id", "count"))
        .reset_index()
    )
    top_locations["avgSpend"] = top_locations["avgSpend"].round(2)
    location_rows = top_locations.sort_values("avgSpend", ascending=False).head(10).to_dict(orient="records")

    primary_use_rows = (
        fact_phone_usage.groupby("primary_use")
        .agg(
            avgSpend=("ecommerce_spend_inr_month", "mean"),
            users=("phone_user_id", "count"),
        )
        .reset_index()
        .sort_values("avgSpend", ascending=False)
    )
    primary_records = []
    for _, row in primary_use_rows.iterrows():
        primary_records.append(
            {
                "primaryUse": row["primary_use"],
                "avgSpend": round(float(row["avgSpend"]), 2),
                "users": int(row["users"]),
            }
        )

    scatter_sample = fact_phone_usage.sample(n=min(250, phone_total), random_state=42)
    scatter_rows = [
        {
            "screenTime": round(float(row["screen_time_hrs_day"]), 2),
            "spend": int(row["ecommerce_spend_inr_month"]),
            "os": row["os"],
            "apps": int(row["apps_installed"]),
        }
        for _, row in scatter_sample.iterrows()
    ]

    data_usage_hist = pd.cut(
        fact_phone_usage["data_usage_gb_month"],
        bins=[0, 10, 20, 30, 40, 50],
        labels=["0-10", "10-20", "20-30", "30-40", "40-50"],
        include_lowest=True,
    ).value_counts().sort_index()
    hist_rows = [
        {"bucket": bucket, "users": int(count)}
        for bucket, count in data_usage_hist.items()
    ]

    dashboard_payload = {
        "summaryByRange": summary_ranges,
        "monthlySeries": monthly_rows,
        "funnel": funnel_summary,
        "channels": channel_rows,
        "devices": device_rows,
        "retention": {
            "matrix": retention,
            "cohortTrend": cohort_trend,
        },
        "phoneUsage": {
            "byOS": os_rows,
            "byLocation": location_rows,
            "byPrimaryUse": primary_records,
            "screenVsSpend": scatter_rows,
            "dataUsageBuckets": hist_rows,
        },
    }

    with OUTPUT_PATH.open("w") as f:
        json.dump(dashboard_payload, f, indent=2)

    print(f"Dashboard data written to {OUTPUT_PATH.relative_to(BASE_DIR)}")


if __name__ == "__main__":
    main()
