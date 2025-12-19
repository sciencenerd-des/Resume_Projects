const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("en-IN", { style: "percent", maximumFractionDigits: 1 });

export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(value);
}

export function formatCurrency(value: number, digits = 0) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: digits }).format(value);
}

export function formatPercent(value: number, digits = 1) {
  return new Intl.NumberFormat("en-IN", { style: "percent", maximumFractionDigits: digits }).format(value);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatDelta(current: number, previous: number) {
  if (!previous) return "—";
  const delta = (current - previous) / previous;
  const prefix = delta >= 0 ? "+" : "";
  return `${prefix}${percentFormatter.format(delta)}`;
}

export function getDeltaValue(current: number, previous: number) {
  if (!previous) return 0;
  return (current - previous) / previous;
}
