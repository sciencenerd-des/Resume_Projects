import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  DEFAULT_CHANNELS, 
  DEFAULT_DEVICES, 
  USER_TYPE_MAP 
} from "@/lib/constants";

export interface FilterState {
  selectedChannels: number[];
  selectedDevices: number[];
  userType: "all" | "new" | "returning";
}

interface FilterContextValue extends FilterState {
  setSelectedChannels: (channels: number[]) => void;
  setSelectedDevices: (devices: number[]) => void;
  setUserType: (type: "all" | "new" | "returning") => void;
  resetFilters: () => void;
  isFiltered: boolean;
}

// Re-export for backward compatibility
export { USER_TYPE_MAP };

const FilterContext = createContext<FilterContextValue | null>(null);

// Helper to check if arrays are equal
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

// Parse URL params to get initial filter state
function parseUrlParams(searchParams: URLSearchParams): Partial<FilterState> {
  const result: Partial<FilterState> = {};
  
  const channelsParam = searchParams.get("channels");
  if (channelsParam) {
    const channels = channelsParam.split(",").map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 5);
    if (channels.length > 0) {
      result.selectedChannels = channels.sort((a, b) => a - b);
    }
  }
  
  const devicesParam = searchParams.get("devices");
  if (devicesParam) {
    const devices = devicesParam.split(",").map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 2);
    if (devices.length > 0) {
      result.selectedDevices = devices.sort((a, b) => a - b);
    }
  }
  
  const userTypeParam = searchParams.get("userType");
  if (userTypeParam && ["all", "new", "returning"].includes(userTypeParam)) {
    result.userType = userTypeParam as "all" | "new" | "returning";
  }
  
  return result;
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL params or defaults
  const urlState = parseUrlParams(searchParams);
  const [selectedChannels, setSelectedChannels] = useState<number[]>(
    urlState.selectedChannels ?? DEFAULT_CHANNELS
  );
  const [selectedDevices, setSelectedDevices] = useState<number[]>(
    urlState.selectedDevices ?? DEFAULT_DEVICES
  );
  const [userType, setUserType] = useState<"all" | "new" | "returning">(
    urlState.userType ?? "all"
  );

  // Sync state to URL on change
  useEffect(() => {
    const params = new URLSearchParams();
    
    // Only add params if they differ from defaults
    if (!arraysEqual(selectedChannels, DEFAULT_CHANNELS)) {
      params.set("channels", selectedChannels.join(","));
    }
    if (!arraysEqual(selectedDevices, DEFAULT_DEVICES)) {
      params.set("devices", selectedDevices.join(","));
    }
    if (userType !== "all") {
      params.set("userType", userType);
    }
    
    // Update URL without triggering navigation
    setSearchParams(params, { replace: true });
  }, [selectedChannels, selectedDevices, userType, setSearchParams]);

  const resetFilters = () => {
    setSelectedChannels(DEFAULT_CHANNELS);
    setSelectedDevices(DEFAULT_DEVICES);
    setUserType("all");
  };

  const isFiltered =
    selectedChannels.length !== DEFAULT_CHANNELS.length ||
    selectedDevices.length !== DEFAULT_DEVICES.length ||
    userType !== "all";

  return (
    <FilterContext.Provider
      value={{
        selectedChannels,
        selectedDevices,
        userType,
        setSelectedChannels,
        setSelectedDevices,
        setUserType,
        resetFilters,
        isFiltered,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}

export { DEFAULT_CHANNELS, DEFAULT_DEVICES };
