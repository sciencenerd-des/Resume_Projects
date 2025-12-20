import { useFilters } from "./FilterContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw } from "lucide-react";
import { CHANNEL_LABELS, DEVICE_LABELS, DEFAULT_CHANNELS, DEFAULT_DEVICES } from "@/lib/constants";

const USER_TYPE_OPTIONS = [
  { value: "all" as const, label: "All Users" },
  { value: "new" as const, label: "New Users" },
  { value: "returning" as const, label: "Returning" },
];

export function GlobalFilters() {
  const {
    selectedChannels,
    selectedDevices,
    userType,
    setSelectedChannels,
    setSelectedDevices,
    setUserType,
    resetFilters,
    isFiltered,
  } = useFilters();

  const toggleChannel = (id: number) => {
    if (selectedChannels.includes(id)) {
      if (selectedChannels.length > 1) {
        setSelectedChannels(selectedChannels.filter(c => c !== id));
      }
    } else {
      setSelectedChannels([...selectedChannels, id].sort((a, b) => a - b));
    }
  };

  const toggleDevice = (id: number) => {
    if (selectedDevices.includes(id)) {
      if (selectedDevices.length > 1) {
        setSelectedDevices(selectedDevices.filter(d => d !== id));
      }
    } else {
      setSelectedDevices([...selectedDevices, id].sort((a, b) => a - b));
    }
  };

  return (
    <Card className="bg-secondary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="size-5" aria-hidden="true" />
            <CardTitle className="text-base">Global Filters</CardTitle>
            {isFiltered && (
              <span className="text-xs font-bold uppercase tracking-wide bg-foreground text-background px-2 py-0.5">
                Active
              </span>
            )}
          </div>
          {isFiltered && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Aria-live region for screen reader announcements */}
        <div 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
        >
          {isFiltered && `Filters active: ${selectedChannels.length} channels, ${selectedDevices.length} devices, ${userType} users`}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Channel Filter */}
          <div className="space-y-2">
            <p id="channel-filter-label" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Marketing Channel</p>
            <div 
              role="group" 
              aria-labelledby="channel-filter-label"
              className="flex flex-wrap gap-1.5"
            >
              {DEFAULT_CHANNELS.map(id => (
                <button
                  key={id}
                  onClick={() => toggleChannel(id)}
                  aria-pressed={selectedChannels.includes(id)}
                  aria-label={`${CHANNEL_LABELS[id]} channel filter`}
                  className={`px-2.5 py-1 text-xs font-semibold border-2 border-foreground transition-all ${
                    selectedChannels.includes(id)
                      ? "bg-foreground text-background shadow-brutal-xs"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {CHANNEL_LABELS[id]}
                </button>
              ))}
            </div>
          </div>

          {/* Device Filter */}
          <div className="space-y-2">
            <p id="device-filter-label" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Device Type</p>
            <div 
              role="group" 
              aria-labelledby="device-filter-label"
              className="flex flex-wrap gap-1.5"
            >
              {DEFAULT_DEVICES.map(id => (
                <button
                  key={id}
                  onClick={() => toggleDevice(id)}
                  aria-pressed={selectedDevices.includes(id)}
                  aria-label={`${DEVICE_LABELS[id]} device filter`}
                  className={`px-3 py-1 text-xs font-semibold border-2 border-foreground transition-all ${
                    selectedDevices.includes(id)
                      ? "bg-foreground text-background shadow-brutal-xs"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {DEVICE_LABELS[id]}
                </button>
              ))}
            </div>
          </div>

          {/* User Type Filter */}
          <div className="space-y-2">
            <p id="usertype-filter-label" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">User Type</p>
            <div 
              role="group" 
              aria-labelledby="usertype-filter-label"
              className="flex flex-wrap gap-1.5"
            >
              {USER_TYPE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setUserType(option.value)}
                  aria-pressed={userType === option.value}
                  aria-label={`${option.label} filter`}
                  className={`px-3 py-1 text-xs font-semibold border-2 border-foreground transition-all ${
                    userType === option.value
                      ? "bg-foreground text-background shadow-brutal-xs"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
