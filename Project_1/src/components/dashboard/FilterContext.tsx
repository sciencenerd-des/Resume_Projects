import { createContext, useContext, useState, type ReactNode } from "react";

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

const DEFAULT_CHANNELS = [0, 1, 2, 3, 4, 5];
const DEFAULT_DEVICES = [0, 1, 2];

const defaultState: FilterState = {
  selectedChannels: DEFAULT_CHANNELS,
  selectedDevices: DEFAULT_DEVICES,
  userType: "all",
};

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedChannels, setSelectedChannels] = useState<number[]>(DEFAULT_CHANNELS);
  const [selectedDevices, setSelectedDevices] = useState<number[]>(DEFAULT_DEVICES);
  const [userType, setUserType] = useState<"all" | "new" | "returning">("all");

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
