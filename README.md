# Project 1 – Growth Analytics Web Dashboard

This repo now ships a portfolio-ready React/Tailwind/shadcn UI that mirrors the Power BI spec for Project 1 (funnel, retention, CAC/LTV, and India market segmentation). All numbers in the UI are generated from the processed CSVs so stakeholders can audit the same pipeline described in `project_constitution.md`.

## Quick Start
1. **Refresh fact/dim tables** (idempotent)
   ```bash
   python3 scripts/prepare_data.py
   ```
2. **Generate the UI data payload** (aggregations + cohort matrix)
   ```bash
   python3 scripts/build_dashboard_data.py
   ```
   This writes `src/data/dashboard-data.json` which the React app imports via `src/data/index.ts`.
3. **Run the site** (Bun runtime already configured)
   ```bash
   bun run dev
   ```
   The dashboard lives at http://localhost:3000 (or Bun’s printed port) and uses HMR for rapid iteration.
4. **Production build**
   ```bash
   bun run build
   ```
   Outputs land in `dist/` as a static bundle that can be hosted on any CDN.

## API Endpoints & Data Service
- `GET /api/dashboard` – Streams the aggregated `src/data/dashboard-data.json` payload used by the React app. The client falls back to the bundled snapshot if the request fails.
- `GET /api/star-schema/:table` – Converts any processed CSV (`dim_customer`, `fact_sessions`, etc.) into JSON on-demand for ad hoc inspection or future features. Responses are cached in-memory by the Bun server.
- `src/lib/dataService.ts` – Browser helper that fetches the endpoints above and exposes typed wrappers (`fetchDashboardData`, `fetchStarTable`).

## Dashboard Architecture
- **Executive Overview** – KPI grid with range selector (3/6/12 months), auto-generated sparklines, CAC/LTV callout. Metrics are sourced from `summaryByRange` inside the JSON payload and trend deltas are computed in-browser from the monthly series.
- **Funnel & Drop-off** – Visual funnel component, cart leakage notes, channel table, and device snapshot fed by `data.funnel`, `data.channels`, and `data.devices`.
- **Retention Cohorts** – Heatmap + cohort-size sparkline derived from `fact_customer_day`. Each cell locks its denominator to the original cohort for defensible retention math.
- **Channel Unit Economics** – Editable channel selector, synthetic spend table, CAC vs LTV scatter plot (bubble size = new customers). Numbers depend on `processed/assumed_channel_costs.csv`.
- **India Market Segmentation** – Phone usage context page featuring OS cards, screen-time scatter, data-usage histogram, and top city/primary-use leaderboards from `processed/fact_phone_usage.csv`.

## Key Files
- `scripts/prepare_data.py` – Normalizes the raw CSVs into star-schema friendly tables under `processed/`.
- `scripts/build_dashboard_data.py` – Aggregates the processed data into the JSON structure consumed by the React UI.
- `src/components/dashboard/*` – Section-specific React components built with shadcn/ui primitives.
- `src/data/dashboard-data.json` – Versioned output of the aggregation script (checked in for convenience).
- `powerbi/*` – Original data-model + DAX references retained for stakeholders that still want the Power BI artifact.

## Assumptions & Notes
- CAC values remain synthetic. Adjust `processed/assumed_channel_costs.csv` and rerun both scripts before presenting externally.
- Device mapping (0=Desktop, 1=Mobile, 2=Tablet) and anonymized `location_id` labels are still placeholders; update `processed/dim_device.csv` / `processed/dim_location.csv` if better metadata arrives.
- Cohorts are anchored to first visit month to capture acquisition → activation lag.
- Phone usage data stays disconnected—it powers Page 5 visuals but is not joined to ecommerce tables.

Questions or enhancements? Extend the data JSON schema via `scripts/build_dashboard_data.py` and import the new fields into the React components.
