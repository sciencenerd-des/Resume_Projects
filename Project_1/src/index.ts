import { serve } from "bun";
import index from "./index.html";

const dashboardDataPath = new URL("./data/dashboard-data.json", import.meta.url);
const processedRoot = new URL("../processed/", import.meta.url);
const allowedTables = new Set([
  "dim_customer",
  "dim_date",
  "dim_channel",
  "dim_device",
  "dim_location",
  "dim_product",
  "fact_sessions",
  "fact_customer_day",
  "fact_phone_usage",
]);

const tableCache = new Map<string, string>();

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const [headerLine, ...rows] = lines;
  const headers = headerLine.split(",");
  return rows
    .filter(Boolean)
    .map(row => {
      const values = row.split(",");
      const record: Record<string, string | number> = {};
      headers.forEach((header, index) => {
        const raw = values[index];
        const numeric = Number(raw);
        record[header] = Number.isNaN(numeric) ? raw : numeric;
      });
      return record;
    });
}

async function loadStarTable(table: string) {
  if (!allowedTables.has(table)) {
    return new Response("Unknown table", { status: 404 });
  }
  if (tableCache.has(table)) {
    return new Response(tableCache.get(table)!, { headers: { "content-type": "application/json" } });
  }
  const file = Bun.file(new URL(`${table}.csv`, processedRoot));
  if (!(await file.exists())) {
    return new Response("Missing table", { status: 404 });
  }
  const parsed = parseCsv(await file.text());
  const body = JSON.stringify(parsed);
  tableCache.set(table, body);
  return new Response(body, { headers: { "content-type": "application/json" } });
}

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/dashboard": async () => {
      const dashboardFile = Bun.file(dashboardDataPath);
      return new Response(dashboardFile, { headers: { "content-type": "application/json" } });
    },

    "/api/star-schema/:table": async req => {
      const table = req.params.table;
      return loadStarTable(table);
    },

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
