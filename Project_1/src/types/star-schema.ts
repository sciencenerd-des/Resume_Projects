export interface DimCustomer {
  customer_id: number;
  first_visit_date: string;
  first_purchase_date?: string | null;
  cohort_month: string;
  user_type_flag: number;
  user_type_label: string;
  lifetime_sessions: number;
  lifetime_revenue: number;
  avg_order_value: number;
}

export interface DimDate {
  date_key: number;
  date: string;
  day: number;
  month: number;
  month_name: string;
  quarter: number;
  year: number;
  weekday: number;
  week_start: string;
  is_weekend: number;
}

export interface DimChannel {
  marketing_channel_id: number;
  channel_label: string;
}

export interface DimDevice {
  device_type_id: number;
  device_label: string;
}

export interface DimLocation {
  location_id: number;
  location_label: string;
}

export interface DimProduct {
  product_id: number;
  product_category: number;
  product_category_label: string;
  base_price: number;
  price_band: string;
}

export interface FactSessions {
  session_id: number;
  date_key: number;
  visit_date: string;
  customer_id: number;
  product_id: number;
  marketing_channel_id: number;
  device_type_id: number;
  location_id: number;
  pages_viewed: number;
  time_on_site_sec: number;
  cart_flag: number;
  order_flag: number;
  abandon_flag: number;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  discount_percent: number;
  revenue: number;
  session_duration_bucket: string;
  user_type: number;
  session_count: number;
}

export interface FactCustomerDay {
  customer_id: number;
  visit_date: string;
  date_key: number;
  cohort_month: string;
  sessions: number;
  add_to_cart_sessions: number;
  purchase_sessions: number;
  revenue: number;
  is_active: number;
  is_purchase_day: number;
  retained_flag: number;
  purchase_flag: number;
}

export interface FactPhoneUsage {
  phone_user_id: string;
  age: number;
  gender: string;
  location: string;
  brand: string;
  os: string;
  screen_time_hrs_day: number;
  data_usage_gb_month: number;
  calls_duration_mins_day: number;
  apps_installed: number;
  social_media_time_hrs_day: number;
  ecommerce_spend_inr_month: number;
  streaming_time_hrs_day: number;
  gaming_time_hrs_day: number;
  monthly_recharge_cost_inr: number;
  primary_use: string;
}

export type StarSchemaRow =
  | DimCustomer
  | DimDate
  | DimChannel
  | DimDevice
  | DimLocation
  | DimProduct
  | FactSessions
  | FactCustomerDay
  | FactPhoneUsage;
