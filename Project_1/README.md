# India Acquisition Funnel - Growth Analytics Dashboard

<div align="center">

![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-Runtime-000000?style=flat&logo=bun&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-Visualization-FF6384?style=flat)

**A high-fidelity web-based analytics dashboard simulating the Indian mobile acquisition market**

</div>

---

## 🎯 Overview

This dashboard demonstrates advanced analytics capabilities through a realistic simulation of the Indian mobile/e-commerce acquisition market. It showcases:

- **Full-stack analytics development** (React + TypeScript)
- **Star schema data architecture** with dimensional modeling
- **Interactive visualizations** with Recharts
- **Neo-brutalist design aesthetic** for modern UI appeal

### Key Metrics Tracked

| Metric | Description |
|--------|-------------|
| **LTV** | Customer Lifetime Value |
| **CAC** | Customer Acquisition Cost by channel |
| **Retention** | Cohort retention analysis |
| **Conversion Funnel** | Awareness → Consideration → Purchase |
| **Channel Economics** | ROI by acquisition channel |

---

## 🏗️ Architecture

### Star Schema Data Model

The dashboard consumes a properly normalized star schema stored in `/processed/`:

```
┌─────────────────────────────────────────────────────────────────┐
│                         FACT TABLES                              │
├─────────────────────────────────────────────────────────────────┤
│  fact_sessions.csv      │ 25,001 records │ Session-level data   │
│  fact_customer_day.csv  │ 24,907 records │ Daily customer agg   │
│  fact_phone_usage.csv   │ ~25,000 records │ Device usage data   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DIMENSION TABLES                            │
├─────────────────────────────────────────────────────────────────┤
│  dim_customer.csv   │ 8,443 customers  │ Customer attributes    │
│  dim_date.csv       │ 366 dates        │ Date dimension         │
│  dim_channel.csv    │ 6 channels       │ Acquisition channels   │
│  dim_device.csv     │ 3 device types   │ Device categories      │
│  dim_location.csv   │ ~100 cities      │ India geographic data  │
│  dim_product.csv    │ ~900 products    │ Product catalog        │
└─────────────────────────────────────────────────────────────────┘
```

### Dashboard Components

```
src/
├── components/dashboard/
│   ├── DashboardLayout.tsx    # Main layout with navigation
│   ├── ExecutiveOverview.tsx  # KPI cards and summary metrics
│   ├── FunnelSection.tsx      # Acquisition funnel visualization
│   ├── ChannelEconomicsSection.tsx  # CAC and channel analysis
│   ├── RetentionSection.tsx   # Cohort retention matrix
│   ├── MarketSegmentationSection.tsx # Market insights
│   ├── GlobalFilters.tsx      # Filter infrastructure
│   ├── FilterContext.tsx      # React Context for filters
│   ├── WhatIfPanel.tsx        # CAC assumption editor
│   ├── SpendRevenueChart.tsx  # Spend vs Revenue analysis
│   └── ...
└── pages/
    ├── OverviewPage.tsx
    ├── FunnelPage.tsx
    ├── ChannelsPage.tsx
    ├── MarketPage.tsx
    └── RetentionPage.tsx
```

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0

### Installation

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

The dashboard will be available at `http://localhost:3000`

---

## 📊 Dashboard Sections

### 1. Executive Overview

The landing page provides high-level KPIs:

- Total Revenue & Purchase Count
- Customer Acquisition Cost (CAC) by channel
- LTV:CAC Ratio indicators
- Revenue/Purchases combo chart
- New vs Returning customer session distribution

### 2. Acquisition Funnel

Visualizes the customer journey:

- **Awareness** → Sessions and impressions
- **Consideration** → Pages viewed, time on site
- **Purchase** → Conversion rates

Includes scatter diagnostics for pages viewed vs. purchase rate.

### 3. Channel Economics

Deep dive into acquisition channel performance:

- **Channel CAC comparison**: Organic, Paid Search, Social, Direct, Referral, Affiliate
- **What-If Panel**: Edit CAC assumptions to model scenarios
- **Spend vs Revenue chart**: ROI visualization per channel

### 4. Market Segmentation

India market-specific insights:

- Geographic distribution (city-level)
- Device usage patterns (Phone, Tablet, Desktop)
- E-commerce spend buckets
- Top cities by average spend

### 5. Cohort Retention

Retention analysis over time:

- Monthly cohort retention matrix
- Retention curve visualizations
- Churn identification

---

## 🎨 Design System

The dashboard uses a **Neo-Brutalist** design aesthetic:

- **Bold colors**: High contrast with vibrant accents
- **Thick borders**: 3-4px solid borders on cards
- **Hard shadows**: Offset box shadows for depth
- **Chunky typography**: Bold, readable fonts

---

## 📁 Data Files

| File | Records | Description |
|------|---------|-------------|
| `dim_customer.csv` | 8,443 | Customer demographics and LTV |
| `dim_date.csv` | 366 | Full 2024 date dimension |
| `dim_channel.csv` | 6 | Acquisition channel metadata |
| `dim_device.csv` | 3 | Device type dimension |
| `dim_location.csv` | ~100 | Indian cities with tier classification |
| `dim_product.csv` | ~900 | Product catalog |
| `fact_sessions.csv` | 25,001 | Session-level behavioral data |
| `fact_customer_day.csv` | 24,907 | Daily customer aggregations |
| `fact_phone_usage.csv` | ~25,000 | Device usage metrics |
| `assumed_channel_costs.csv` | 6 | Channel cost assumptions |

---

## 🔧 Configuration

### Global Filters

The dashboard supports global filtering via React Context:

- **Channel Filter**: Filter by acquisition channel
- **Device Filter**: Filter by device type
- **User Type Filter**: New vs Returning customers

Filters persist across page navigation.

---

## 📈 Key Insights (Simulated Data)

Based on the simulated India market data:

- **Highest LTV Channel**: Referral (lowest CAC, highest retention)
- **Best Performing City**: Mumbai (highest avg transaction value)
- **Device Split**: 70% Mobile, 20% Desktop, 10% Tablet
- **Average LTV:CAC Ratio**: 3.2:1 (healthy)

---

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Bun** | Runtime & Bundler |
| **Recharts** | Charting Library |
| **Tailwind CSS** | Styling |
| **React Router** | Navigation |

---

## 📄 Related Projects

- [Project 2: A/B Testing Experimentation Repository](../Project_2/growth-experimentation-portfolio/)
- [Project 3: Marketing Ops Automation Agent](../Project_3/)

---

## 📝 License

This project is part of a Growth Engineering portfolio demonstration.

---

<div align="center">

**Built with ❤️ for Growth Engineering roles**

</div>
