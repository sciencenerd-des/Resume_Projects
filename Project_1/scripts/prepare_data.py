import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / 'Project_1'
PROCESSED_DIR = BASE_DIR / 'processed'
PROCESSED_DIR.mkdir(exist_ok=True)

ECOMMERCE_PATH = RAW_DIR / 'Ecommerce.csv'
PHONE_USAGE_PATH = RAW_DIR / 'phone_usage_india.csv'


def snake_case(name: str) -> str:
    return (
        name.strip()
        .lower()
        .replace(' ', '_')
        .replace('-', '_')
        .replace('(', '')
        .replace(')', '')
        .replace('/', '_')
    )


def load_ecommerce() -> pd.DataFrame:
    df = pd.read_csv(
        ECOMMERCE_PATH,
        dayfirst=True,
        parse_dates=['visit_date'],
    )
    df.columns = [snake_case(col) for col in df.columns]
    df['visit_date'] = pd.to_datetime(df['visit_date'], dayfirst=True)
    df['date_key'] = df['visit_date'].dt.strftime('%Y%m%d').astype(int)
    df['revenue'] = df['revenue'].clip(lower=0)
    df['discount_amount'] = df['discount_amount'].clip(lower=0)
    return df


def build_dim_date(df: pd.DataFrame) -> pd.DataFrame:
    full_range = pd.date_range(df['visit_date'].min(), df['visit_date'].max(), freq='D')
    dim_date = pd.DataFrame({
        'date': full_range,
    })
    dim_date['date_key'] = dim_date['date'].dt.strftime('%Y%m%d').astype(int)
    dim_date['day'] = dim_date['date'].dt.day
    dim_date['month'] = dim_date['date'].dt.month
    dim_date['month_name'] = dim_date['date'].dt.strftime('%b')
    dim_date['quarter'] = dim_date['date'].dt.quarter
    dim_date['year'] = dim_date['date'].dt.year
    dim_date['weekday'] = dim_date['date'].dt.weekday
    dim_date['week_start'] = dim_date['date'] - pd.to_timedelta(dim_date['weekday'], unit='D')
    dim_date['is_weekend'] = dim_date['weekday'].isin([5, 6]).astype(int)
    return dim_date[['date_key', 'date', 'day', 'month', 'month_name', 'quarter', 'year', 'weekday', 'week_start', 'is_weekend']]


def build_dim_customer(df: pd.DataFrame) -> pd.DataFrame:
    first_visit = df.groupby('customer_id')['visit_date'].min()
    first_purchase = df.loc[df['purchased'] == 1].groupby('customer_id')['visit_date'].min()
    lifetime = df.groupby('customer_id').agg(
        lifetime_sessions=('session_id', 'nunique'),
        lifetime_revenue=('revenue', 'sum'),
        avg_order_value=('revenue', 'mean'),
        user_type_flag=('user_type', 'max'),
    )
    dim_customer = lifetime.join(first_visit.rename('first_visit_date')).join(first_purchase.rename('first_purchase_date'))
    dim_customer['cohort_month'] = dim_customer['first_visit_date'].dt.to_period('M').astype(str)
    dim_customer['user_type_label'] = dim_customer['user_type_flag'].map({0: 'New', 1: 'Returning'}).fillna('Unknown')
    dim_customer = dim_customer.reset_index()
    dim_customer['first_purchase_date'] = dim_customer['first_purchase_date'].dt.date
    dim_customer['first_visit_date'] = dim_customer['first_visit_date'].dt.date
    dim_customer['lifetime_revenue'] = dim_customer['lifetime_revenue'].round(2)
    dim_customer['avg_order_value'] = dim_customer['avg_order_value'].round(2)
    return dim_customer[['customer_id', 'first_visit_date', 'first_purchase_date', 'cohort_month', 'user_type_flag', 'user_type_label', 'lifetime_sessions', 'lifetime_revenue', 'avg_order_value']]


def build_dim_product(df: pd.DataFrame) -> pd.DataFrame:
    agg = df.groupby('product_id').agg(
        product_category=('product_category', 'max'),
        base_price=('unit_price', 'median'),
    )
    agg['product_category_label'] = 'Category ' + agg['product_category'].astype(str)
    agg['price_band'] = pd.cut(
        agg['base_price'],
        bins=[0, 250, 750, 1500, float('inf')],
        labels=['Budget', 'Mid', 'Premium', 'Luxury'],
    ).astype(str)
    agg = agg.reset_index()
    agg['base_price'] = agg['base_price'].round(2)
    return agg[['product_id', 'product_category', 'product_category_label', 'base_price', 'price_band']]


def build_dim_channel(df: pd.DataFrame) -> pd.DataFrame:
    channels = pd.DataFrame({'marketing_channel_id': sorted(df['marketing_channel'].unique())})
    channels['channel_label'] = channels['marketing_channel_id'].apply(lambda x: f'Channel {x}')
    return channels


def build_dim_device(df: pd.DataFrame) -> pd.DataFrame:
    device = pd.DataFrame({'device_type_id': sorted(df['device_type'].unique())})
    device['device_label'] = device['device_type_id'].map({0: 'Desktop', 1: 'Mobile', 2: 'Tablet'})
    device['device_label'] = device['device_label'].fillna(device['device_type_id'].apply(lambda x: f'Device {x}'))
    return device


def build_dim_location(df: pd.DataFrame) -> pd.DataFrame:
    location = pd.DataFrame({'location_id': sorted(df['location'].unique())})
    location['location_label'] = location['location_id'].apply(lambda x: f'Region {x:03d}')
    return location


def build_fact_sessions(df: pd.DataFrame) -> pd.DataFrame:
    fact = df.copy()
    fact = fact.rename(columns={
        'marketing_channel': 'marketing_channel_id',
        'device_type': 'device_type_id',
        'location': 'location_id',
    })
    fact['session_count'] = 1
    fact['order_flag'] = fact['purchased']
    fact['cart_flag'] = fact['added_to_cart']
    fact['abandon_flag'] = fact['cart_abandoned']
    fact['cohort_month'] = df.groupby('customer_id')['visit_date'].transform('min').dt.to_period('M').astype(str)
    columns = [
        'session_id', 'date_key', 'visit_date', 'customer_id', 'product_id', 'marketing_channel_id',
        'device_type_id', 'location_id', 'pages_viewed', 'time_on_site_sec', 'cart_flag', 'order_flag',
        'abandon_flag', 'quantity', 'unit_price', 'discount_amount', 'discount_percent', 'revenue',
        'session_duration_bucket', 'user_type', 'session_count'
    ]
    return fact[columns]


def build_fact_customer_day(fact_sessions: pd.DataFrame, dim_customer: pd.DataFrame) -> pd.DataFrame:
    grouped = fact_sessions.groupby(['customer_id', 'visit_date']).agg(
        sessions=('session_id', 'nunique'),
        add_to_cart_sessions=('cart_flag', 'sum'),
        purchase_sessions=('order_flag', 'sum'),
        revenue=('revenue', 'sum'),
    ).reset_index()
    grouped['date_key'] = grouped['visit_date'].dt.strftime('%Y%m%d').astype(int)
    grouped['is_active'] = 1
    grouped['is_purchase_day'] = (grouped['purchase_sessions'] > 0).astype(int)
    grouped['cohort_month'] = grouped['customer_id'].map(
        dim_customer.set_index('customer_id')['cohort_month']
    )
    grouped['retained_flag'] = grouped['is_active']
    grouped['purchase_flag'] = grouped['is_purchase_day']
    grouped['revenue'] = grouped['revenue'].round(2)
    return grouped[['customer_id', 'visit_date', 'date_key', 'cohort_month', 'sessions', 'add_to_cart_sessions', 'purchase_sessions', 'revenue', 'is_active', 'is_purchase_day', 'retained_flag', 'purchase_flag']]


def build_fact_phone_usage() -> pd.DataFrame:
    df = pd.read_csv(PHONE_USAGE_PATH)
    df.columns = [snake_case(col) for col in df.columns]
    df = df.rename(columns={
        'user_id': 'phone_user_id',
        'phone_brand': 'brand',
        'data_usage_gb_month': 'data_usage_gb_month',
        'calls_duration_mins_day': 'calls_duration_mins_day',
        'number_of_apps_installed': 'apps_installed',
        'social_media_time_hrs_day': 'social_media_time_hrs_day',
        'screen_time_hrs_day': 'screen_time_hrs_day',
        'streaming_time_hrs_day': 'streaming_time_hrs_day',
        'gaming_time_hrs_day': 'gaming_time_hrs_day',
        'e_commerce_spend_inr_month': 'ecommerce_spend_inr_month',
        'monthly_recharge_cost_inr': 'monthly_recharge_cost_inr',
    })
    return df


def build_assumed_channel_costs(dim_channel: pd.DataFrame) -> pd.DataFrame:
    default_costs = {
        0: 120,
        1: 160,
        2: 110,
        3: 95,
        4: 140,
        5: 80,
    }
    df = dim_channel.copy()
    df['assumed_cac_inr'] = df['marketing_channel_id'].map(default_costs).fillna(125)
    return df


def main():
    ecommerce = load_ecommerce()
    dim_date = build_dim_date(ecommerce)
    dim_customer = build_dim_customer(ecommerce)
    dim_product = build_dim_product(ecommerce)
    dim_channel = build_dim_channel(ecommerce)
    dim_device = build_dim_device(ecommerce)
    dim_location = build_dim_location(ecommerce)
    fact_sessions = build_fact_sessions(ecommerce)
    fact_customer_day = build_fact_customer_day(fact_sessions, dim_customer)
    fact_phone_usage = build_fact_phone_usage()
    channel_costs = build_assumed_channel_costs(dim_channel)

    dim_date.to_csv(PROCESSED_DIR / 'dim_date.csv', index=False)
    dim_customer.to_csv(PROCESSED_DIR / 'dim_customer.csv', index=False)
    dim_product.to_csv(PROCESSED_DIR / 'dim_product.csv', index=False)
    dim_channel.to_csv(PROCESSED_DIR / 'dim_channel.csv', index=False)
    dim_device.to_csv(PROCESSED_DIR / 'dim_device.csv', index=False)
    dim_location.to_csv(PROCESSED_DIR / 'dim_location.csv', index=False)
    fact_sessions.to_csv(PROCESSED_DIR / 'fact_sessions.csv', index=False)
    fact_customer_day.to_csv(PROCESSED_DIR / 'fact_customer_day.csv', index=False)
    fact_phone_usage.to_csv(PROCESSED_DIR / 'fact_phone_usage.csv', index=False)
    channel_costs.to_csv(PROCESSED_DIR / 'assumed_channel_costs.csv', index=False)

    summary = {
        'fact_sessions_rows': len(fact_sessions),
        'fact_customer_day_rows': len(fact_customer_day),
        'dim_customer_rows': len(dim_customer),
        'dim_product_rows': len(dim_product),
        'fact_phone_usage_rows': len(fact_phone_usage),
    }
    print('Data preparation complete:', summary)


if __name__ == '__main__':
    main()
