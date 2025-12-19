import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { FilterProvider } from "./FilterContext";
import { DataNotesTooltip } from "./DataNotesTooltip";
import { OverviewPage, FunnelPage, RetentionPage, ChannelsPage, MarketPage } from "@/pages";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset
} from "@/components/ui/sidebar";
import { BarChart3, Users, TrendingUp, DollarSign } from "lucide-react";
import type { DashboardData, SummaryRangeKey } from "@/data";
import { staticDashboardData } from "@/data";
import { fetchDashboardData } from "@/lib/dataService";

interface DashboardContentProps {
  data: DashboardData;
  range: SummaryRangeKey;
  onRangeChange: (value: SummaryRangeKey) => void;
  statusMessage: string;
}

function DashboardContent({ data, range, onRangeChange, statusMessage }: DashboardContentProps) {
  const location = useLocation();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-0">
          <Routes>
            <Route path="/" element={<OverviewPage data={data} range={range} onRangeChange={onRangeChange} />} />
            <Route path="/funnel" element={<FunnelPage data={data} />} />
            <Route path="/retention" element={<RetentionPage data={data} />} />
            <Route path="/channels" element={<ChannelsPage data={data} />} />
            <Route path="/market" element={<MarketPage data={data} />} />
          </Routes>

          <footer className="border-t-3 border-foreground pt-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-muted-foreground">
              Built with React, Tailwind, and shadcn/ui using the processed Project 1 datasets.
            </p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{statusMessage}</p>
            <DataNotesTooltip />
          </footer>
        </div>
      </div>
    </div>
  );
}

function SidebarNavigation() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Dashboard Sections</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/")}>
              <Link to="/">
                <BarChart3 className="size-4" />
                <span>Overview</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/funnel")}>
              <Link to="/funnel">
                <TrendingUp className="size-4" />
                <span>Funnel</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/channels")}>
              <Link to="/channels">
                <DollarSign className="size-4" />
                <span>Channels</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/retention")}>
              <Link to="/retention">
                <Users className="size-4" />
                <span>Retention</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/market")}>
              <Link to="/market">
                <TrendingUp className="size-4" />
                <span>Market</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function DashboardLayout() {
  const [range, setRange] = React.useState<SummaryRangeKey>("12m");
  const [dashboardData, setDashboardData] = React.useState<DashboardData>(staticDashboardData);
  const [statusMessage, setStatusMessage] = React.useState("Loading latest metrics…");

  React.useEffect(() => {
    let mounted = true;
    fetchDashboardData()
      .then(remoteData => {
        if (!mounted) return;
        setDashboardData(remoteData);
        setStatusMessage("Synced with /api/dashboard");
      })
      .catch(() => mounted && setStatusMessage("Offline snapshot (src/data/dashboard-data.json)"));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <FilterProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <SidebarMenuButton size="lg" className="font-semibold">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <BarChart3 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Analytics</span>
                <span className="truncate text-xs">Dashboard</span>
              </div>
            </SidebarMenuButton>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNavigation />
          </SidebarContent>
          <SidebarFooter>
            <DataNotesTooltip />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-4 w-px bg-border" />
              <h1 className="text-lg font-semibold">Growth Analytics Command Center</h1>
            </div>
          </header>
          <DashboardContent data={dashboardData} range={range} onRangeChange={setRange} statusMessage={statusMessage} />
        </SidebarInset>
      </SidebarProvider>
    </FilterProvider>
  );
}
