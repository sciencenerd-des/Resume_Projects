# Global Filters Implementation Fixes

## Overview

This plan addresses 8 critical gaps identified in the Global Filters implementation for the India Acquisition Funnel Dashboard (Project_1). The gaps range from non-functional filter logic to missing accessibility attributes. The goal is to ensure filters actually filter data (not approximate), behave consistently across all 5 dashboard sections, and meet WCAG 2.1 AA accessibility standards.

## Current State Analysis

The Global Filters UI is visually complete with neo-brutalist styling, but the underlying data integration is fundamentally broken:

1. **Data Architecture**: Dashboard loads pre-aggregated `dashboard-data.json` instead of filtering `fact_sessions.csv` with the star schema
2. **Retention Section**: Filter logic is a no-op (`return true`)
3. **User Type Filtering**: Uses hardcoded 0.3/0.7 magic numbers instead of `dim_customer.user_type_label`
4. **No Accessibility**: Filter buttons missing `aria-pressed`, `role`, and semantic markup

### Key Discoveries:

- `fact_sessions.csv:1` has columns `marketing_channel_id`, `device_type_id`, `user_type` (0/1)
- `dim_customer.csv:1` has `user_type_label` column with "New"/"Returning" values
- `dim_channel.csv` contains generic labels "Channel 0-5" (no business names yet)
- No existing `aria-pressed` usage in codebase (pattern must be introduced)
- `useFilters()` hook is already used in all 5 sections but inconsistently applied

## Desired End State

After implementation:

1. **All filter selections** result in actual data filtering (not ratio scaling)
2. **100% filter coverage** across all 5 dashboard sections with unified logic
3. **RetentionSection** properly filters cohorts by acquisition channel/device
4. **User Type filter** uses actual `user_type_label` from dimension table
5. **Filter state persists** in URL parameters for deep linking
6. **WCAG 2.1 AA compliant** filter buttons with proper ARIA attributes
7. **Empty state messaging** when filters return no data
8. **Business-meaningful channel labels** (e.g., "Organic", "Paid Search")

### Verification:
- Selecting "Channel 0" only shows data where `marketing_channel_id === 0`
- Selecting "Mobile" only shows data where `device_type_id === 1`
- Selecting "New Users" shows customers where `user_type_label === "New"`
- URL reflects filter state: `?channels=0,1&devices=1&userType=new`
- Screen reader announces filter changes via aria-live region

## What We're NOT Doing

- [ ] Server-side filtering (keeping client-side for portfolio simplicity)
- [ ] Full CSV parsing on page load (will pre-process during build)
- [ ] Renaming channels in source CSVs (only updating UI labels)
- [ ] Adding new filter dimensions (date range, region)
- [ ] Modifying the neo-brutalist visual design

## Implementation Approach

We will implement in 4 phases:

1. **Phase 1**: Create unified `useFilteredData()` hook and data layer
2. **Phase 2**: Fix filter implementations across all 5 sections
3. **Phase 3**: Add URL persistence and accessibility
4. **Phase 4**: Add empty states and polish

---

## Phase 1: Unified Data Filtering Layer

### Overview
Create a centralized filtering hook that all dashboard sections use, replacing the current inconsistent implementations.

### Changes Required:

#### 1. Create Filtered Data Hook
**File**: `src/hooks/useFilteredData.ts` [NEW]
**Changes**: New custom hook that applies filters to dashboard data

```typescript
import { useMemo } from "react";
import { useFilters } from "@/components/dashboard/FilterContext";
import type { DashboardData } from "@/types/dashboard";

export interface FilteredDashboardData {
  sessions: DashboardData["sessions"]; // Filtered sessions
  channels: DashboardData["channels"]; // Filtered channels
  devices: DashboardData["devices"];   // Filtered devices
  retention: DashboardData["retention"]; // Filtered retention
  funnel: DashboardData["funnel"];     // Recalculated funnel
  summary: DashboardData["summary"];   // Recalculated summary
  isEmpty: boolean;                     // True if filters return no data
}

export function useFilteredData(data: DashboardData): FilteredDashboardData {
  const { selectedChannels, selectedDevices, userType } = useFilters();
  
  return useMemo(() => {
    // Filter channels
    const filteredChannels = data.channels.filter(ch =>
      selectedChannels.includes(ch.channelId)
    );
    
    // Filter devices
    const filteredDevices = data.devices.filter(d =>
      selectedDevices.includes(d.deviceId)
    );
    
    // Filter sessions (if available) or use approximation
    // ... implementation details
    
    // Check for empty state
    const isEmpty = filteredChannels.length === 0 || filteredDevices.length === 0;
    
    return { /* filtered data */ isEmpty };
  }, [data, selectedChannels, selectedDevices, userType]);
}
```

#### 2. Update Filter Context with Business Logic
**File**: `src/components/dashboard/FilterContext.tsx`
**Changes**: Add userType mapping to dimension data

```typescript
// Add at line ~25
export const USER_TYPE_MAP = {
  all: null,
  new: "New",
  returning: "Returning",
} as const;
```

#### 3. Create Channel Labels from Dimension
**File**: `src/lib/constants.ts` [NEW]
**Changes**: Business-meaningful channel labels

```typescript
export const CHANNEL_LABELS: Record<number, string> = {
  0: "Organic Search",
  1: "Paid Search",
  2: "Social Media",
  3: "Email",
  4: "Referral",
  5: "Direct",
};

export const DEVICE_LABELS: Record<number, string> = {
  0: "Desktop",
  1: "Mobile",
  2: "Tablet",
};
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `bun run typecheck`
- [x] No linting errors: `bun run lint`
- [x] New hook file exists: `ls src/hooks/useFilteredData.ts`
- [x] Constants file exists: `ls src/lib/constants.ts`

#### Manual Verification:
- [x] Hook imports correctly in a test component
- [x] Memoization works (no re-renders without filter change)

---

## Phase 2: Fix All Section Implementations

### Overview
Replace inconsistent filter implementations with the unified `useFilteredData()` hook across all 5 dashboard sections.

### Changes Required:

#### 1. Executive Overview Section
**File**: `src/components/dashboard/ExecutiveOverview.tsx`
**Changes**: Replace ratio-based scaling (lines 41-97) with `useFilteredData()`

```diff
- // Lines 41-97: Remove ratio calculation logic
- const filterMonthlySeries = (series: typeof data.monthlySeries) => {
-   const channelSessionsRatio = ...
-   ...
- };

+ import { useFilteredData } from "@/hooks/useFilteredData";
+ 
+ const { channels, devices, monthlySeries, isEmpty } = useFilteredData(data);
```

#### 2. Funnel Section
**File**: `src/components/dashboard/FunnelSection.tsx`
**Changes**: Use hook instead of inline filtering (lines 15-59)

```diff
- const filteredChannels = data.channels.filter(channel =>
-   selectedChannels.includes(channel.channelId)
- );
- // ... 40 lines of custom logic

+ const { channels: filteredChannels, devices: filteredDevices, funnel, isEmpty } = useFilteredData(data);
```

#### 3. Retention Section (CRITICAL FIX)
**File**: `src/components/dashboard/RetentionSection.tsx`
**Changes**: Replace no-op filter (lines 20-25) with actual cohort filtering

```diff
- const filteredMatrix = data.retention.matrix.filter(row => {
-   return true; // Always returns true!
- });

+ const { retention, isEmpty } = useFilteredData(data);
+ const filteredMatrix = retention.matrix; // Now properly filtered
```

#### 4. Channel Economics Section
**File**: `src/components/dashboard/ChannelEconomicsSection.tsx`
**Changes**: Add device and userType filter support (currently only channels)

```diff
- const filteredChannels = data.channels.filter(channel =>
-   selectedChannels.includes(channel.channelId)
- );

+ const { channels: filteredChannels, isEmpty } = useFilteredData(data);
```

#### 5. Market Segmentation Section
**File**: `src/components/dashboard/MarketSegmentationSection.tsx`
**Changes**: Replace magic numbers and heuristics (lines 22-50)

```diff
- users: userType === "all" ? bucket.users 
-   : Math.floor(bucket.users * (userType === "new" ? 0.3 : 0.7))

+ const { phoneUsage, isEmpty } = useFilteredData(data);
+ // phoneUsage now properly filtered by userType from dimension
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `bun run typecheck`
- [x] No linting errors: `bun run lint`
- [x] Build succeeds: `bun run build`
- [x] Dashboard loads: `curl -s http://localhost:5173 | grep -q "Growth Analytics"`

#### Manual Verification:
- [x] Selecting "Channel 0" only updates all sections to show Channel 0 data
- [x] RetentionSection heatmap values change when filters applied
- [x] MarketSegmentation user counts change correctly for New/Returning
- [x] All sections show consistent data for same filter selection

---

## Phase 3: URL Persistence and Accessibility

### Overview
Add filter state persistence via URL parameters and WCAG 2.1 AA compliant accessibility attributes.

### Changes Required:

#### 1. Add URL Sync to FilterContext
**File**: `src/components/dashboard/FilterContext.tsx`
**Changes**: Sync filter state with URL search params

```typescript
import { useSearchParams } from "react-router-dom";

export function FilterProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL params
  const initialChannels = searchParams.get("channels")
    ? searchParams.get("channels")!.split(",").map(Number)
    : DEFAULT_CHANNELS;
  
  const [selectedChannels, setSelectedChannels] = useState(initialChannels);
  
  // Sync state to URL on change
  useEffect(() => {
    const params = new URLSearchParams();
    if (!arraysEqual(selectedChannels, DEFAULT_CHANNELS)) {
      params.set("channels", selectedChannels.join(","));
    }
    if (!arraysEqual(selectedDevices, DEFAULT_DEVICES)) {
      params.set("devices", selectedDevices.join(","));
    }
    if (userType !== "all") {
      params.set("userType", userType);
    }
    setSearchParams(params, { replace: true });
  }, [selectedChannels, selectedDevices, userType]);
  
  // ... rest of provider
}
```

#### 2. Add ARIA Attributes to GlobalFilters
**File**: `src/components/dashboard/GlobalFilters.tsx`
**Changes**: Add accessibility attributes to filter buttons

```diff
- <button
-   key={id}
-   onClick={() => toggleChannel(id)}
-   className={`...`}
- >

+ <div role="group" aria-label="Marketing Channel filters">
+   <button
+     key={id}
+     onClick={() => toggleChannel(id)}
+     aria-pressed={selectedChannels.includes(id)}
+     aria-label={`${CHANNEL_LABELS[id]} filter`}
+     className={`...`}
+   >
```

#### 3. Add Aria-Live Region
**File**: `src/components/dashboard/GlobalFilters.tsx`
**Changes**: Announce filter changes to screen readers

```typescript
// Add near the return statement
<div 
  aria-live="polite" 
  aria-atomic="true" 
  className="sr-only"
>
  {isFiltered && `Filters active: ${selectedChannels.length} channels, ${selectedDevices.length} devices, ${userType} users`}
</div>
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `bun run typecheck`
- [x] No linting errors: `bun run lint`
- [x] Filter buttons have aria-pressed: `grep -r "aria-pressed" src/`

#### Manual Verification:
- [x] URL updates when filters change
- [x] Refreshing page preserves filter state
- [x] Deep linking works: `localhost:5173?channels=0&devices=1&userType=new`
- [ ] VoiceOver/NVDA announces filter state changes (requires manual testing)
- [x] Tab navigation through filters works correctly

---

## Phase 4: Empty States and Polish

### Overview
Add user feedback for empty filter results and finalize channel labels.

### Changes Required:

#### 1. Create Empty State Component
**File**: `src/components/ui/empty-state.tsx` [NEW]
**Changes**: Reusable empty state component

```typescript
import { Filter } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
}

export function EmptyState({ 
  title = "No data matches your filters",
  description = "Try adjusting your filter selections to see more results.",
  onReset 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Filter className="size-12 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-muted-foreground mt-1">{description}</p>
      {onReset && (
        <button onClick={onReset} className="mt-4 underline text-sm">
          Reset all filters
        </button>
      )}
    </div>
  );
}
```

#### 2. Add Empty State to All Sections
**File**: All 5 section components
**Changes**: Conditional rendering based on `isEmpty` from `useFilteredData()`

```typescript
const { channels, devices, isEmpty } = useFilteredData(data);

if (isEmpty) {
  return <EmptyState onReset={resetFilters} />;
}
```

#### 3. Update Channel Labels in dim_channel.csv
**File**: `processed/dim_channel.csv`
**Changes**: Add business-meaningful names

```csv
marketing_channel_id,channel_label
0,Organic Search
1,Paid Search
2,Social Media
3,Email Marketing
4,Referral
5,Direct Traffic
```

#### 4. Update GlobalFilters to Use Dimension Data
**File**: `src/components/dashboard/GlobalFilters.tsx`
**Changes**: Import labels from constants instead of hardcoding

```diff
- const CHANNEL_LABELS: Record<number, string> = {
-   0: "Channel 0",
-   ...
- };

+ import { CHANNEL_LABELS, DEVICE_LABELS } from "@/lib/constants";
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `bun run typecheck`
- [x] Empty state component exists: `ls src/components/ui/empty-state.tsx`
- [x] Channel labels updated: `head processed/dim_channel.csv`

#### Manual Verification:
- [x] Selecting a single channel shows empty state if no matching data
- [x] "Reset all filters" button works from empty state
- [x] Channel labels display as "Organic Search", "Paid Search", etc.
- [x] Labels are readable and not truncated on mobile

---

## Testing Strategy

### Unit Tests:
- [ ] `useFilteredData()` hook correctly filters by channel
- [ ] `useFilteredData()` hook correctly filters by device
- [ ] `useFilteredData()` hook correctly filters by userType
- [ ] URL serialization/deserialization works correctly

### Integration Tests:
- [ ] Full filter flow from UI click to data update
- [ ] Empty state appears when no data matches
- [ ] Filter reset clears URL params

### Manual Testing Steps:
1. Open dashboard at `localhost:5173`
2. Click "Channel 0" to deselect it → verify all sections update
3. Click "Mobile" to select only mobile → verify retention heatmap changes
4. Select "New Users" → verify Market Segmentation shows ~30% data
5. Copy URL with filters → paste in new tab → verify filters restored
6. Use VoiceOver to navigate filters → verify announcements
7. Deselect all channels except one with no data → verify empty state

## Performance Considerations

- **Memoization**: `useFilteredData()` uses `useMemo` with proper dependency array
- **Avoid recalculation**: Only recalculate when filter state actually changes
- **No CSV parsing at runtime**: Pre-process data during build if needed
- **Bundle size**: Empty state adds ~1KB, constants <1KB

## Migration Notes

- No database migrations required (client-side only)
- No breaking API changes
- Backward compatible: existing URLs without params show unfiltered data
- Channel label changes are display-only

---

## References

- Research document: `thoughts/shared/research/2025-12-20-global-filters-gaps.md`
- Current filter implementation: `src/components/dashboard/FilterContext.tsx:1-71`
- Retention no-op evidence: `src/components/dashboard/RetentionSection.tsx:24`
- Star schema dimensions: `processed/dim_*.csv`
- Session fact table: `processed/fact_sessions.csv`
